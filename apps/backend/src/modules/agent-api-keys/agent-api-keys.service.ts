import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateApiKeyDto, UpdateApiKeyDto } from './dto/create-api-key.dto';
import * as crypto from 'crypto';

@Injectable()
export class AgentApiKeysService {
  private readonly logger = new Logger(AgentApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a cryptographically secure API key.
   * Format: lotio_agent_<64 random hex chars>
   */
  private generateApiKey(): {
    fullKey: string;
    prefix: string;
    hash: string;
  } {
    const randomPart = crypto.randomBytes(32).toString('hex');
    const fullKey = `lotio_agent_${randomPart}`;
    const prefix = randomPart.substring(0, 8);
    const hash = crypto
      .createHash('sha256')
      .update(fullKey)
      .digest('hex');
    return { fullKey, prefix, hash };
  }

  /**
   * Creates a new API key. Returns the full key ONLY once at creation time.
   * The full key is NEVER stored — only the SHA-256 hash is persisted.
   */
  async create(
    tenantId: string,
    dto: CreateApiKeyDto,
    userId: string
  ) {
    // Validate project IDs belong to this tenant if specified
    if (dto.projectIds && dto.projectIds.length > 0) {
      const projectCount = await this.prisma.project.count({
        where: { tenantId, id: { in: dto.projectIds } }
      });
      if (projectCount !== dto.projectIds.length) {
        throw new ForbiddenException(
          'Um ou mais projetos informados não pertencem a este tenant.'
        );
      }
    }

    const { fullKey, prefix, hash } = this.generateApiKey();

    const apiKey = await (this.prisma as any).agentApiKey.create({
      data: {
        tenantId,
        name: dto.name,
        keyPrefix: prefix,
        keyHash: hash,
        projectIds: dto.projectIds || [],
        permissions: dto.permissions || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: userId
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        projectIds: true,
        permissions: true,
        expiresAt: true,
        isActive: true,
        createdAt: true
      }
    });

    this.logger.log(
      `API key "${dto.name}" created for tenant ${tenantId} by user ${userId}`
    );

    // Audit log
    await this.logAudit(
      apiKey.id,
      'api_key:created',
      apiKey.id,
      'AgentApiKey',
      { name: dto.name, createdBy: userId }
    );

    return {
      ...apiKey,
      apiKey: fullKey // Full key returned ONLY here
    };
  }

  /**
   * Lists all API keys for a tenant. Never returns the full key.
   */
  async findAll(tenantId: string) {
    const keys = await (this.prisma as any).agentApiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        projectIds: true,
        permissions: true,
        expiresAt: true,
        isActive: true,
        lastUsedAt: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return keys.map((key: any) => ({
      ...key,
      projectCount: key.projectIds?.length || 0,
      permissionCount: key.permissions?.length || 0
    }));
  }

  /**
   * Updates an API key (toggle active, change projectIds/permissions, extend expiry).
   */
  async update(tenantId: string, id: string, dto: UpdateApiKeyDto) {
    const key = await this.findKeyOrThrow(tenantId, id);

    // Validate project IDs if changing
    if (dto.projectIds && dto.projectIds.length > 0) {
      const projectCount = await this.prisma.project.count({
        where: { tenantId, id: { in: dto.projectIds } }
      });
      if (projectCount !== dto.projectIds.length) {
        throw new ForbiddenException(
          'Um ou mais projetos informados não pertencem a este tenant.'
        );
      }
    }

    const updated = await (this.prisma as any).agentApiKey.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.projectIds !== undefined ? { projectIds: dto.projectIds } : {}),
        ...(dto.permissions !== undefined
          ? { permissions: dto.permissions }
          : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: new Date(dto.expiresAt) }
          : {})
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        projectIds: true,
        permissions: true,
        expiresAt: true,
        isActive: true,
        lastUsedAt: true,
        updatedAt: true
      }
    });

    return updated;
  }

  /**
   * Permanently revokes (deletes) an API key.
   */
  async revoke(tenantId: string, id: string) {
    await this.findKeyOrThrow(tenantId, id);

    await (this.prisma as any).agentApiKey.delete({ where: { id } });
    this.logger.log(`API key ${id} revoked for tenant ${tenantId}`);

    return { success: true, message: 'Chave API revogada com sucesso.' };
  }

  /**
   * Gets audit logs for a specific API key.
   */
  async getKeyAuditLogs(
    tenantId: string,
    apiKeyId: string,
    pagination: { page?: number; limit?: number } = {}
  ) {
    await this.findKeyOrThrow(tenantId, apiKeyId);

    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 50, 200);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      (this.prisma as any).agentAuditLog.findMany({
        where: { apiKeyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      (this.prisma as any).agentAuditLog.count({ where: { apiKeyId } })
    ]);

    return {
      data: logs,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      }
    };
  }

  /**
   * Gets all agent audit logs for a specific project.
   */
  async getProjectAuditLogs(
    tenantId: string,
    projectId: string,
    pagination: { page?: number; limit?: number } = {}
  ) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const page = pagination.page || 1;
    const limit = Math.min(pagination.limit || 50, 200);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      (this.prisma as any).agentAuditLog.findMany({
        where: {
          targetId: projectId,
          targetType: { in: ['Project', 'LotDetails', 'LotCategory', 'Lead'] }
        },
        include: {
          apiKey: { select: { name: true, keyPrefix: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      (this.prisma as any).agentAuditLog.count({
        where: {
          targetId: projectId,
          targetType: { in: ['Project', 'LotDetails', 'LotCategory', 'Lead'] }
        }
      })
    ]);

    return {
      data: logs,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page
      }
    };
  }

  /**
   * Logs an audit entry for agent actions.
   */
  async logAudit(
    apiKeyId: string,
    action: string,
    targetId: string | null,
    targetType: string | null,
    metadata?: Record<string, any>,
    ip?: string
  ) {
    try {
      await (this.prisma as any).agentAuditLog.create({
        data: {
          apiKeyId,
          action,
          targetId,
          targetType,
          metadata: metadata || null,
          ip: ip || null
        }
      });
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  private async findKeyOrThrow(tenantId: string, id: string) {
    const key = await (this.prisma as any).agentApiKey.findFirst({
      where: { id, tenantId }
    });
    if (!key) {
      throw new NotFoundException('Chave API não encontrada.');
    }
    return key;
  }
}
