import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '@prisma/client';
import { LeadsQueryDto } from './dto/leads-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public – anyone can create a lead for a published project */
  async createPublic(
    tenantSlug: string,
    projectSlug: string,
    dto: CreateLeadDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const project = await this.prisma.project.findUnique({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: projectSlug },
      },
    });
    if (!project || project.status !== 'PUBLISHED')
      throw new NotFoundException('Project not found');

    // Resolve optional realtor code → ID
    let realtorLinkId: string | undefined;
    if (dto.realtorCode) {
      const rl = await this.prisma.realtorLink.findFirst({
        where: { tenantId: tenant.id, code: dto.realtorCode, enabled: true },
      });
      realtorLinkId = rl?.id;
    }

    const { realtorCode, mapElementId, ...leadData } = dto;

    // Validate if mapElementId exists within this project to avoid FK errors
    let validMapElementId: string | undefined;
    if (mapElementId && typeof mapElementId === 'string' && mapElementId.trim().length > 0) {
      const exists = await this.prisma.mapElement.findFirst({
        where: { id: mapElementId, projectId: project.id, tenantId: tenant.id },
        select: { id: true },
      });
      if (exists) {
        validMapElementId = exists.id;
      }
    }

    return this.prisma.lead.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        ...leadData,
        ...(validMapElementId ? { mapElementId: validMapElementId } : {}),
        realtorLinkId,
        source: realtorCode ? `corretor:${realtorCode}` : 'website',
      },
    });
  }

  /** Panel – list leads with optional filters */
  async findAll(
    tenantId: string,
    query: LeadsQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { projectId, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, totalItems] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          tenantId,
          ...(projectId && { projectId }),
          ...(status && { status }),
        },
        include: {
          project: true,
          mapElement: true,
          realtorLink: { select: { name: true, code: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({
        where: {
          tenantId,
          ...(projectId && { projectId }),
          ...(status && { status }),
        },
      }),
    ]);

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: { project: true, mapElement: true, realtorLink: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.prisma.lead.delete({ where: { id } });
  }
}
