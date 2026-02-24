import {
  Injectable,
  NotFoundException,
  ConflictException
} from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus, Project } from '@prisma/client';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { slug: dto.slug.toLowerCase().replace(/\s+/g, '-') }
    });
    if (existing)
      throw new ConflictException('Já existe um projeto com este slug.');

    return this.prisma.project.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug.toLowerCase().replace(/\s+/g, '-'),
        description: dto.description
      }
    });
  }

  async findAll(
    tenantId: string,
    query: PaginationQueryDto
  ): Promise<PaginatedResponse<Project>> {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.prisma.project.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: { slug: true, name: true } },
          _count: { select: { mapElements: true, leads: true } }
        },
        skip,
        take: limit
      }),
      this.prisma.project.count({
        where: { tenantId }
      })
    ]);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      }
    };
  }

  async findOne(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        tenant: { select: { slug: true, name: true } },
        _count: {
          select: { mapElements: true, leads: true, projectMedias: true }
        }
      }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  async checkSlugAvailability(slug: string) {
    const s = slug
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const project = await this.prisma.project.findUnique({
      where: { slug: s }
    });
    return { available: !project };
  }

  async findBySlug(projectSlug: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        slug: projectSlug,
        status: ProjectStatus.PUBLISHED
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        mapElements: {
          include: {
            lotDetails: {
              include: { medias: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        projectMedias: {
          where: { lotDetailsId: null },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!project)
      throw new NotFoundException('Projeto não encontrado ou não publicado.');

    return project;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    if (dto.slug) {
      const existing = await this.prisma.project.findFirst({
        where: {
          slug: dto.slug.toLowerCase().replace(/\s+/g, '-'),
          NOT: { id }
        }
      });
      if (existing)
        throw new ConflictException('Já existe um projeto com este slug.');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: dto.slug.toLowerCase().replace(/\s+/g, '-') }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.bannerImageUrl !== undefined && {
          bannerImageUrl: dto.bannerImageUrl
        }),
        ...(dto.status && { status: dto.status }),
        ...(dto.mapData !== undefined && { mapData: dto.mapData }),
        ...(dto.highlightsJson !== undefined && {
          highlightsJson: dto.highlightsJson
        }),
        ...(dto.locationText !== undefined && {
          locationText: dto.locationText
        }),
        ...(dto.showPaymentConditions !== undefined && {
          showPaymentConditions: dto.showPaymentConditions
        }),
        ...(dto.startingPrice !== undefined && {
          startingPrice: dto.startingPrice
        }),
        ...(dto.maxInstallments !== undefined && {
          maxInstallments: dto.maxInstallments
        }),
        ...(dto.paymentConditionsSummary !== undefined && {
          paymentConditionsSummary: dto.paymentConditionsSummary
        }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.googleMapsUrl !== undefined && {
          googleMapsUrl: dto.googleMapsUrl
        })
      },
      include: {
        tenant: { select: { slug: true, name: true } },
        _count: {
          select: { mapElements: true, leads: true, projectMedias: true }
        }
      }
    });
  }

  async publish(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.PUBLISHED },
      include: { tenant: { select: { slug: true, name: true } } }
    });
  }

  async unpublish(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.prisma.project.update({
      where: { id },
      data: { status: ProjectStatus.DRAFT },
      include: { tenant: { select: { slug: true, name: true } } }
    });
  }

  async remove(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    await this.prisma.project.delete({ where: { id } });
    return { message: 'Projeto removido com sucesso.' };
  }
}
