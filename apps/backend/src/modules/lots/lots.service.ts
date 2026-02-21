import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { UpsertLotDetailsDto } from './dto/upsert-lot-details.dto';

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByMapElement(tenantId: string, mapElementId: string) {
    const lot = await this.prisma.lotDetails.findFirst({
      where: { tenantId, mapElementId },
    });
    if (!lot) throw new NotFoundException('LotDetails not found');
    return lot;
  }

  async findByProject(tenantId: string, projectId: string) {
    return this.prisma.lotDetails.findMany({
      where: { tenantId, projectId },
      include: { mapElement: true },
      orderBy: { mapElement: { code: 'asc' } },
    });
  }

  async upsert(
    tenantId: string,
    projectId: string,
    mapElementId: string,
    dto: UpsertLotDetailsDto,
  ) {
    // Validate that mapElement exists and belongs to tenant/project
    const el = await this.prisma.mapElement.findFirst({
      where: { id: mapElementId, tenantId, projectId, type: 'LOT' },
    });
    if (!el) throw new NotFoundException('MapElement LOT not found');

    return this.prisma.lotDetails.upsert({
      where: { mapElementId },
      create: {
        tenantId,
        projectId,
        mapElementId,
        ...dto,
      },
      update: dto,
    });
  }

  async remove(tenantId: string, mapElementId: string) {
    const lot = await this.prisma.lotDetails.findFirst({
      where: { tenantId, mapElementId },
    });
    if (!lot) throw new NotFoundException('LotDetails not found');
    return this.prisma.lotDetails.delete({ where: { id: lot.id } });
  }
}
