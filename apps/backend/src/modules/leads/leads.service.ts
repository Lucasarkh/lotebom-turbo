import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '@prisma/client';

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

    return this.prisma.lead.create({
      data: {
        tenantId: tenant.id,
        projectId: project.id,
        ...dto,
      },
    });
  }

  /** Panel – list leads with optional filters */
  async findAll(
    tenantId: string,
    projectId?: string,
    status?: LeadStatus,
  ) {
    return this.prisma.lead.findMany({
      where: {
        tenantId,
        ...(projectId && { projectId }),
        ...(status && { status }),
      },
      include: { project: true, mapElement: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: { project: true, mapElement: true },
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
