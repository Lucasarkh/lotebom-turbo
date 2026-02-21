import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { BulkMapElementsDto, MapElementDto } from './dto/map-element.dto';

@Injectable()
export class MapElementsService {
  constructor(private prisma: PrismaService) {}

  async findAllByProject(tenantId: string, projectId: string) {
    return this.prisma.mapElement.findMany({
      where: { tenantId, projectId },
      include: { lotDetails: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId },
      include: { lotDetails: true },
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');
    return el;
  }

  /**
   * Bulk upsert: replaces all map elements for a project.
   * Elements with an existing `id` are updated, new ones are created.
   * Elements in DB that are NOT in the payload are deleted.
   */
  async bulkUpsert(tenantId: string, projectId: string, dto: BulkMapElementsDto) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const incomingIds = dto.elements
      .filter((el) => el.id)
      .map((el) => el.id as string);

    return this.prisma.$transaction(async (tx) => {
      // Delete elements no longer in payload
      await tx.mapElement.deleteMany({
        where: {
          tenantId,
          projectId,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
        },
      });

      const results: any[] = [];

      for (const el of dto.elements) {
        if (el.id) {
          // Update existing
          const updated = await tx.mapElement.update({
            where: { id: el.id },
            data: {
              type: el.type,
              name: el.name,
              code: el.code,
              geometryType: el.geometryType,
              geometryJson: el.geometryJson,
              styleJson: el.styleJson ?? undefined,
              metaJson: el.metaJson ?? undefined,
            },
          });
          results.push(updated);
        } else {
          // Create new
          const created = await tx.mapElement.create({
            data: {
              tenantId,
              projectId,
              type: el.type,
              name: el.name,
              code: el.code,
              geometryType: el.geometryType,
              geometryJson: el.geometryJson,
              styleJson: el.styleJson,
              metaJson: el.metaJson,
            },
          });
          results.push(created);
        }
      }

      return results;
    });
  }

  async create(tenantId: string, projectId: string, dto: MapElementDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    return this.prisma.mapElement.create({
      data: {
        tenantId,
        projectId,
        type: dto.type,
        name: dto.name,
        code: dto.code,
        geometryType: dto.geometryType,
        geometryJson: dto.geometryJson,
        styleJson: dto.styleJson,
        metaJson: dto.metaJson,
      },
    });
  }

  async update(tenantId: string, id: string, dto: Partial<MapElementDto>) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId },
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');

    return this.prisma.mapElement.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.geometryType && { geometryType: dto.geometryType }),
        ...(dto.geometryJson && { geometryJson: dto.geometryJson }),
        ...(dto.styleJson !== undefined && { styleJson: dto.styleJson }),
        ...(dto.metaJson !== undefined && { metaJson: dto.metaJson }),
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId },
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');

    await this.prisma.mapElement.delete({ where: { id } });
    return { message: 'Elemento removido.' };
  }
}
