import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { tenantId_slug: { tenantId, slug: dto.slug } },
    });
    if (existing) throw new ConflictException('Já existe um projeto com este slug.');

    return this.prisma.project.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { slug: true, name: true } },
        _count: { select: { mapElements: true, leads: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        tenant: { select: { slug: true, name: true } },
        _count: { select: { mapElements: true, leads: true, projectMedias: true } },
      },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async findBySlug(tenantSlug: string, projectSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado.');

    const project = await this.prisma.project.findFirst({
      where: {
        tenantId: tenant.id,
        slug: projectSlug,
        status: ProjectStatus.PUBLISHED,
      },
      include: {
        mapElements: {
          include: { lotDetails: true },
          orderBy: { createdAt: 'asc' },
        },
        projectMedias: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado ou não publicado.');

    return { ...project, tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug } };
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    if (dto.slug) {
      const existing = await this.prisma.project.findFirst({
        where: { tenantId, slug: dto.slug, NOT: { id } },
      });
      if (existing) throw new ConflictException('Já existe um projeto com este slug.');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug.toLowerCase().replace(/\s+/g, '-') }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.mapBaseImageUrl !== undefined && { mapBaseImageUrl: dto.mapBaseImageUrl }),
        ...(dto.status && { status: dto.status }),
        ...(dto.mapData !== undefined && { mapData: dto.mapData }),
        ...(dto.highlightsJson !== undefined && { highlightsJson: dto.highlightsJson }),
        ...(dto.locationText !== undefined && { locationText: dto.locationText }),
      },
      include: {
        tenant: { select: { slug: true, name: true } },
        _count: { select: { mapElements: true, leads: true, projectMedias: true } },
      },
    });
  }

  async publish(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.PUBLISHED },
      include: { tenant: { select: { slug: true, name: true } } },
    });
  }

  async unpublish(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.DRAFT },
      include: { tenant: { select: { slug: true, name: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    await this.prisma.project.delete({ where: { id } });
    return { message: 'Projeto removido com sucesso.' };
  }
}
