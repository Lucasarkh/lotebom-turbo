import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Query
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '@/infra/db/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller()
@SkipThrottle()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {}

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica a saúde do sistema (banco de dados, Redis e uptime).',
  })
  @ApiResponse({
    status: 200,
    description: 'Sistema saudável ou degradado',
    schema: {
      example: {
        status: 'ok',
        uptime: 3600,
        checks: { database: 'ok', redis: 'ok' },
      },
    },
  })
  async health() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Redis check
    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      checks
    };
  }

  @Get('internal/tls/allow-host')
  @ApiOperation({
    summary: 'Verificar autorização de domínio para TLS',
    description:
      'Endpoint interno usado pelo Caddy para validar se um domínio está autorizado a receber certificado TLS.',
  })
  @ApiQuery({
    name: 'domain',
    required: true,
    description: 'Nome de domínio a ser verificado',
    example: 'vendas.lotio.com.br',
  })
  @ApiResponse({ status: 200, description: 'Domínio autorizado' })
  @ApiResponse({ status: 400, description: 'Parâmetro de domínio inválido' })
  @ApiResponse({ status: 403, description: 'Domínio não autorizado' })
  async allowTlsHost(@Query('domain') domain?: string) {
    const normalizedDomain = this.normalizeDomain(domain);

    if (!normalizedDomain) {
      throw new BadRequestException('Query param "domain" invalido.');
    }

    const allowedBaseDomains = this.getAllowedBaseDomains();
    const isMainDomainOrSubdomain = allowedBaseDomains.some(
      (baseDomain) =>
        normalizedDomain === baseDomain ||
        normalizedDomain.endsWith(`.${baseDomain}`)
    );

    let allowed = isMainDomainOrSubdomain;

    if (!allowed) {
      // Custom domain is always project-scoped; tenant.customDomain is not used
      // for TLS cert issuance to avoid granting a certificate for a domain that
      // does not route to any project (which would load the marketing home page).
      const project = await this.prisma.project.findUnique({
        where: { customDomain: normalizedDomain },
        select: { id: true, tenant: { select: { isActive: true } } }
      });

      allowed = Boolean(project?.id) && Boolean(project?.tenant?.isActive);
    }

    if (!allowed) {
      throw new ForbiddenException('Dominio nao autorizado para TLS.');
    }

    return { allowed: true, domain: normalizedDomain };
  }

  private normalizeDomain(domain?: string): string | null {
    if (!domain || typeof domain !== 'string') return null;

    const normalized = domain.trim().toLowerCase().replace(/\.$/, '');

    if (!normalized || normalized.length > 253) return null;

    // Caddy sends only hostnames; reject URLs, paths, and explicit ports.
    if (
      normalized.includes('://') ||
      normalized.includes('/') ||
      normalized.includes('?') ||
      normalized.includes('#') ||
      normalized.includes(':')
    ) {
      return null;
    }

    const labels = normalized.split('.');
    if (labels.length < 2) return null;

    for (const label of labels) {
      if (!label || label.length > 63) return null;
      if (!/^[a-z0-9-]+$/.test(label)) return null;
      if (label.startsWith('-') || label.endsWith('-')) return null;
    }

    return normalized;
  }

  private getAllowedBaseDomains(): string[] {
    const configured = (
      process.env.MAIN_DOMAIN || 'lotio.com.br'
    ).toLowerCase();
    const sanitizedConfigured = configured.replace(/\.$/, '');
    const withoutWww = sanitizedConfigured.startsWith('www.')
      ? sanitizedConfigured.slice(4)
      : sanitizedConfigured;

    const domains = new Set<string>([
      sanitizedConfigured,
      withoutWww,
      `www.${withoutWww}`,
      'lotio.com.br',
      'www.lotio.com.br'
    ]);

    domains.delete('');
    return Array.from(domains);
  }
}
