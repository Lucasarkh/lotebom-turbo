import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaigns.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        ...dto,
        tenantId,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, projectId?: string) {
    return this.prisma.campaign.findMany({
      where: {
        tenantId,
        ...(projectId ? { projectId } : {}),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');
    return campaign;
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    return this.prisma.campaign.update({
      where: { id },
      data: dto,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campanha não encontrada.');

    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campanha removida com sucesso.' };
  }
}
