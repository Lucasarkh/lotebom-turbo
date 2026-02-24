import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateRealtorLinkDto } from './dto/create-realtor-link.dto';
import { UpdateRealtorLinkDto } from './dto/update-realtor-link.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

@Injectable()
export class RealtorLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRealtorLinkDto) {
    const { projectIds, accountEmail, accountPassword, ...data } = dto;
    const existing = await this.prisma.realtorLink.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } }
    });
    if (existing)
      throw new ConflictException('Já existe um corretor com este código.');

    // If account credentials are provided, create User + RealtorLink in a transaction
    if (accountEmail && accountPassword) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: accountEmail.toLowerCase() }
      });
      if (existingUser)
        throw new ConflictException('Já existe um usuário com este email.');

      const passwordHash = await bcrypt.hash(accountPassword, 10);

      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            tenantId,
            name: data.name,
            email: accountEmail.toLowerCase(),
            passwordHash,
            role: UserRole.CORRETOR
          }
        });

        return tx.realtorLink.create({
          data: {
            tenantId,
            ...data,
            userId: user.id,
            projects: projectIds?.length
              ? { connect: projectIds.map((id) => ({ id })) }
              : undefined
          },
          include: {
            projects: true,
            user: { select: { id: true, email: true, name: true } }
          }
        });
      });
    }

    // No account — just create the realtor link
    return this.prisma.realtorLink.create({
      data: {
        tenantId,
        ...data,
        projects: projectIds?.length
          ? { connect: projectIds.map((id) => ({ id })) }
          : undefined
      },
      include: { projects: true }
    });
  }

  async findAll(tenantId: string, projectId?: string) {
    return this.prisma.realtorLink.findMany({
      where: {
        tenantId,
        ...(projectId ? { projects: { some: { id: projectId } } } : {})
      },
      include: {
        _count: { select: { leads: true } },
        projects: { select: { id: true, name: true, slug: true } },
        tenant: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { leads: true } },
        projects: { select: { id: true, name: true, slug: true } }
      }
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');
    return link;
  }

  async findByUserId(userId: string) {
    const link = await this.prisma.realtorLink.findUnique({
      where: { userId },
      include: {
        projects: { select: { id: true, name: true, slug: true } },
        _count: { select: { leads: true } }
      }
    });
    return link;
  }

  async updateMe(userId: string, dto: UpdateRealtorLinkDto) {
    const link = await this.prisma.realtorLink.findUnique({
      where: { userId }
    });
    if (!link)
      throw new NotFoundException('Perfil de corretor não encontrado.');

    // Remove fields that the realtor shouldn't be allowed to change themselves
    // Corretor can change: name, phone, email, creci, photoUrl, code
    const {
      projectIds,
      enabled,
      accountEmail,
      accountPassword,
      notes,
      ...data
    } = dto as any;

    if (data.code && data.code !== link.code) {
      const conflict = await this.prisma.realtorLink.findFirst({
        where: {
          tenantId: link.tenantId,
          code: data.code,
          NOT: { id: link.id }
        }
      });
      if (conflict)
        throw new ConflictException(
          'O novo código já está sendo utilizado por outro corretor.'
        );
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.name) {
        await tx.user.update({
          where: { id: userId },
          data: { name: data.name }
        });
      }

      return tx.realtorLink.update({
        where: { id: link.id },
        data
      });
    });
  }

  /** Public – resolve realtor by project slug + code for the public page */
  async findPublic(projectSlug: string, code: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug }
    });
    if (!project) throw new NotFoundException('Project não encontrado.');

    const link = await this.prisma.realtorLink.findFirst({
      where: { tenantId: project.tenantId, code, enabled: true },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        creci: true,
        photoUrl: true,
        code: true,
        projects: { select: { id: true, name: true, slug: true } }
      }
    });
    if (!link)
      throw new NotFoundException(
        'Link de corretor não encontrado ou desabilitado.'
      );
    return link;
  }

  async update(tenantId: string, id: string, dto: UpdateRealtorLinkDto) {
    const { projectIds, ...data } = dto;
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId }
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');

    if (dto.code && dto.code !== link.code) {
      const conflict = await this.prisma.realtorLink.findFirst({
        where: { tenantId, code: dto.code, NOT: { id } }
      });
      if (conflict)
        throw new ConflictException('Código já utilizado por outro corretor.');
    }

    return this.prisma.realtorLink.update({
      where: { id },
      data: {
        ...data,
        projects: projectIds
          ? { set: projectIds.map((id) => ({ id })) }
          : undefined
      },
      include: { projects: true }
    });
  }

  async remove(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId },
      select: { id: true, userId: true }
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');

    // Delete link (and associated user account if exists) in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.realtorLink.delete({ where: { id } });
      if (link.userId) {
        await tx.user.delete({ where: { id: link.userId } });
      }
    });

    return { message: 'Link de corretor removido com sucesso.' };
  }
}
