import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '@prisma/client';
import { LeadsQueryDto } from './dto/leads-query.dto';
import { PaginatedResponse } from '@common/dto/paginated-response.dto';
import {
  CreateManualLeadDto,
  UpdateLeadStatusDto,
  AddLeadDocumentDto,
  AddLeadPaymentDto
} from './dto/manual-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public – anyone can create a lead for a published project */
  async createPublic(projectSlug: string, dto: CreateLeadDto) {
    const project = await this.prisma.project.findUnique({
      where: { slug: projectSlug }
    });
    if (!project || project.status !== 'PUBLISHED')
      throw new NotFoundException('Project not found');

    const tenantId = project.tenantId;

    // 1. Deduplication logic (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existingLead = await this.prisma.lead.findFirst({
      where: {
        tenantId,
        projectId: project.id,
        OR: [
          ...(dto.email ? [{ email: { equals: dto.email, mode: 'insensitive' as any } }] : []),
          ...(dto.phone ? [{ phone: dto.phone }] : [])
        ],
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    const isRecurrent = !!existingLead;

    // 2. Attribution from Session
    let attributionData: any = {};
    let sessionRealtorLinkId: string | null = null;

    if (dto.sessionId) {
      const session = await this.prisma.trackingSession.findUnique({
        where: { id: dto.sessionId }
      });

      if (session) {
        sessionRealtorLinkId = session.realtorLinkId;
        attributionData = {
          ftUtmSource: session.ftUtmSource,
          ftUtmMedium: session.ftUtmMedium,
          ftUtmCampaign: session.ftUtmCampaign,
          ftUtmContent: session.ftUtmContent,
          ftUtmTerm: session.ftUtmTerm,
          ltUtmSource: session.ltUtmSource,
          ltUtmMedium: session.ltUtmMedium,
          ltUtmCampaign: session.ltUtmCampaign,
          ltUtmContent: session.ltUtmContent,
          ltUtmTerm: session.ltUtmTerm,
          ltReferrer: session.ltReferrer
        };
      }
    }

    // 3. Resolve Realtor (explicit code OR session attribution)
    let realtorLinkId: string | undefined;
    if (dto.realtorCode) {
      const rl = await this.prisma.realtorLink.findFirst({
        where: {
          tenantId,
          code: dto.realtorCode,
          enabled: true
        }
      });
      realtorLinkId = rl?.id;
    } else if (sessionRealtorLinkId) {
      // Use realtor from session attribution if no explicit code provided
      realtorLinkId = sessionRealtorLinkId;
    }

    const { realtorCode, mapElementId, sessionId, ...leadData } = dto;

    // Validate if mapElementId exists within this project to avoid FK errors
    let validMapElementId: string | undefined;
    if (
      mapElementId &&
      typeof mapElementId === 'string' &&
      mapElementId.trim().length > 0
    ) {
      const exists = await this.prisma.mapElement.findFirst({
        where: { id: mapElementId, projectId: project.id, tenantId },
        select: { id: true }
      });
      if (exists) {
        validMapElementId = exists.id;
      }
    }

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        projectId: project.id,
        ...leadData,
        ...(validMapElementId ? { mapElementId: validMapElementId } : {}),
        realtorLinkId: realtorLinkId || null,
        sessionId: sessionId || null,
        isRecurrent,
        ...attributionData,
        source: realtorCode
          ? `corretor:${realtorCode}`
          : realtorLinkId
          ? 'corretor:atribuição'
          : 'website'
      }
    });

    // Record history for new leads
    await this.prisma.leadHistory.create({
      data: {
        leadId: lead.id,
        toStatus: LeadStatus.NEW,
        notes: isRecurrent ? 'Lead recorrente detectado' : 'Lead criado via site',
        createdBy: 'SYSTEM'
      }
    });

    return lead;
  }

  /** Panel – create lead manually by Realtor or Developer */
  async createManual(
    tenantId: string,
    dto: CreateManualLeadDto,
    user: { id: string; role: string; name: string }
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Project not found');

    let realtorLinkId: string | undefined;

    // If Realtor is creating, link to them
    if (user.role === 'CORRETOR') {
      const rl = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = rl?.id;
    } else if (dto.realtorCode) {
      // Developer can assign a realtor by code
      const rl = await this.prisma.realtorLink.findFirst({
        where: { code: dto.realtorCode, tenantId }
      });
      realtorLinkId = rl?.id;
    }

    const { realtorCode, mapElementId, sessionId, projectId, ...data } = dto;

    const lead = await this.prisma.lead.create({
      data: {
        ...data,
        tenantId,
        projectId,
        realtorLinkId,
        source: user.role === 'CORRETOR' ? 'corretor_manual' : 'loteadora_manual',
        status: dto.status || 'NEW',
        history: {
          create: {
            toStatus: dto.status || 'NEW',
            notes: 'Lead criado manualmente',
            createdBy: user.name || user.id
          }
        }
      }
    });

    return lead;
  }

  /** Panel – list leads with optional filters */
  async findAll(
    tenantId: string,
    query: LeadsQueryDto,
    user: { id: string; role: string }
  ): Promise<PaginatedResponse<any>> {
    const { projectId, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // If user is a realtor, filter by their realtorLink
    let realtorLinkId: string | undefined;
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = realtor?.id || 'none';
    }

    const where = {
      tenantId,
      ...(projectId && { projectId }),
      ...(status && { status }),
      ...(realtorLinkId && { realtorLinkId })
    };

    const [data, totalItems] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          project: true,
          realtorLink: { select: { name: true, code: true, phone: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.lead.count({ where })
    ]);

    // Mask data for Realtors
    const processedData = data.map((lead) => this.maskLeadData(lead, user));

    return {
      data: processedData,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page
      }
    };
  }

  async findOne(
    tenantId: string,
    id: string,
    user: { id: string; role: string }
  ) {
    // If user is a realtor, they can only see their own lead
    let realtorLinkId: string | undefined;
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = realtor?.id || 'none';
    }

    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        tenantId,
        ...(realtorLinkId && { realtorLinkId })
      },
      include: {
        project: true,
        mapElement: true,
        realtorLink: true,
        documents: true,
        payments: true,
        history: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return this.maskLeadData(lead, user);
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateLeadStatusDto,
    user: { id: string; role: string; name: string }
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // Only Developer can mark as REVERSED (Estorno)
    if (user.role === 'CORRETOR' && dto.status === 'REVERSED') {
      throw new ForbiddenException('Only Developers can reverse a lead');
    }

    // Permission check for Realtors (they must own the lead)
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      if (lead.realtorLinkId !== realtor?.id) {
        throw new ForbiddenException('You do not have access to this lead');
      }
    }

    return this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status,
        lastContactAt: new Date(),
        history: {
          create: {
            fromStatus: lead.status,
            toStatus: dto.status,
            notes: dto.notes,
            createdBy: user.name || user.id
          }
        }
      }
    });
  }

  async addDocument(
    tenantId: string,
    leadId: string,
    dto: AddLeadDocumentDto,
    user: { id: string; role: string; name: string }
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    // Permission check for Corretor
    if (user.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      if (lead.realtorLinkId !== realtor?.id) {
        throw new ForbiddenException('You do not have access to this lead');
      }
    }

    return this.prisma.leadDocument.create({
      data: {
        leadId,
        ...dto,
        uploadedBy: user.name || user.id
      }
    });
  }

  async addPayment(
    tenantId: string,
    leadId: string,
    dto: AddLeadPaymentDto,
    user: { id: string; role: string; name: string }
  ) {
    if (user.role === 'CORRETOR') {
      throw new ForbiddenException('Only Developers can manage lead payments');
    }

    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.leadPayment.create({
      data: {
        leadId,
        ...dto
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId }
    });
    if (!lead) throw new NotFoundException('Lead not found');

    return this.prisma.lead.delete({
      where: { id }
    });
  }

  /** Masks sensitive data if user is a Realtor */
  private maskLeadData(lead: any, user: { role: string }) {
    if (user.role !== 'CORRETOR') return lead;

    const { payments, ...maskedLead } = lead;
    
    // As per requirement "corretor não deve ter acesso a dados sensiveis" 
    return {
      ...maskedLead,
      payments: [] 
    };
  }
}
