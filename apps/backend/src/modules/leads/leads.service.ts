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
    projectSlug: string,
    dto: CreateLeadDto,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug },
    });
    if (!project || project.status !== 'PUBLISHED')
      throw new NotFoundException('Project not found');

    const tenantId = project.tenantId;

    // Resolve optional realtor code → ID (must be associated with this project)
    let realtorLinkId: string | undefined;
    if (dto.realtorCode) {
      const rl = await this.prisma.realtorLink.findFirst({
        where: {
          tenantId,
          code: dto.realtorCode,
          enabled: true,
          projects: { some: { id: project.id } },
        },
      });
      realtorLinkId = rl?.id;
    }

    const { realtorCode, mapElementId, sessionId, ...leadData } = dto;

    // Validate if mapElementId exists within this project to avoid FK errors
    let validMapElementId: string | undefined;
    if (mapElementId && typeof mapElementId === 'string' && mapElementId.trim().length > 0) {
      const exists = await this.prisma.mapElement.findFirst({
        where: { id: mapElementId, projectId: project.id, tenantId },
        select: { id: true },
      });
      if (exists) {
        validMapElementId = exists.id;
      }
    }

    return this.prisma.lead.create({
      data: {
        tenantId,
        projectId: project.id,
        ...leadData,
        ...(validMapElementId ? { mapElementId: validMapElementId } : {}),
        realtorLinkId,
        sessionId,
        source: realtorCode ? `corretor:${realtorCode}` : 'website',
      },
    });
  }

  /** Panel – list leads with optional filters */
  async findAll(
    tenantId: string,
    query: LeadsQueryDto,
    user?: { id: string; role: string },
  ): Promise<PaginatedResponse<any>> {
    const { projectId, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // If user is a realtor, filter by their realtorLink
    let realtorLinkId: string | undefined;
    if (user?.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id },
      });
      realtorLinkId = realtor?.id || 'none'; // 'none' to ensure no leads are found if realtor link is missing
    }

    const where = {
      tenantId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(realtorLinkId && { realtorLinkId }),
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          project: true,
          mapElement: true,
          realtorLink: { select: { name: true, code: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
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

  async findOne(tenantId: string, id: string, user?: { id: string; role: string }) {
    // If user is a realtor, they can only see their own lead
    let realtorLinkId: string | undefined;
    if (user?.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id },
      });
      realtorLinkId = realtor?.id || 'none';
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        tenantId,
        ...(realtorLinkId && { realtorLinkId }),
      },
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
