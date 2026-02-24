import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateRealtorLinkDto } from './dto/create-realtor-link.dto';
import { UpdateRealtorLinkDto } from './dto/update-realtor-link.dto';

@Injectable()
export class RealtorLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRealtorLinkDto) {
    const { projectIds, ...data } = dto;
    const existing = await this.prisma.realtorLink.findUnique({
      where: { tenantId_code: { tenantId, code: dto.code } },
    });
    if (existing) throw new ConflictException('Já existe um corretor com este código.');

    return this.prisma.realtorLink.create({
      data: {
        tenantId,
        ...data,
        projects: projectIds?.length
          ? { connect: projectIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { projects: true },
    });
  }

  async findAll(tenantId: string, projectId?: string) {
    return this.prisma.realtorLink.findMany({
      where: {
        tenantId,
        ...(projectId ? { projects: { some: { id: projectId } } } : {}),
      },
      include: {
        _count: { select: { leads: true } },
        projects: { select: { id: true, name: true, slug: true } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({
      where: { id, tenantId },
      include: {
        _count: { select: { leads: true } },
        projects: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');
    return link;
  }

  /** Public – resolve realtor by project slug + code for the public page */
  async findPublic(projectSlug: string, code: string) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug },
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
        projects: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!link) throw new NotFoundException('Link de corretor não encontrado ou desabilitado.');
    return link;
  }

  async update(tenantId: string, id: string, dto: UpdateRealtorLinkDto) {
    const { projectIds, ...data } = dto;
    const link = await this.prisma.realtorLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');

    if (dto.code && dto.code !== link.code) {
      const conflict = await this.prisma.realtorLink.findFirst({
        where: { tenantId, code: dto.code, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Código já utilizado por outro corretor.');
    }

    return this.prisma.realtorLink.update({
      where: { id },
      data: {
        ...data,
        projects: projectIds
          ? { set: projectIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { projects: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const link = await this.prisma.realtorLink.findFirst({ where: { id, tenantId } });
    if (!link) throw new NotFoundException('Link de corretor não encontrado.');
    await this.prisma.realtorLink.delete({ where: { id } });
    return { message: 'Link de corretor removido com sucesso.' };
  }
}
