import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { BulkMapElementsDto, MapElementDto } from './dto/map-element.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MapElementsService {
  constructor(private prisma: PrismaService) {}

  async findAllByProject(tenantId: string, projectId: string) {
    return this.prisma.mapElement.findMany({
      where: { tenantId, projectId },
      include: { lotDetails: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findOne(tenantId: string, id: string) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId },
      include: { lotDetails: true }
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');
    return el;
  }

  /**
   * Bulk upsert: replaces all map elements for a project.
   * Elements with an existing `id` are updated, new ones are created.
   * Elements in DB that are NOT in the payload are deleted.
   */
  async bulkUpsert(
    tenantId: string,
    projectId: string,
    dto: BulkMapElementsDto
  ) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    // We'll use a transaction for safety
    return this.prisma.$transaction(async (tx) => {
      const incomingIds = dto.elements
        .filter((el) => el.id)
        .map((el) => el.id as string);

      // 1. Delete elements that are no longer present in the payload
      await tx.mapElement.deleteMany({
        where: {
          tenantId,
          projectId,
          ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {})
        }
      });

      const toUpdate = dto.elements.filter((el) => el.id);
      const toCreate = dto.elements.filter((el) => !el.id).map(el => ({ ...el, id: uuidv4() })); // Generate ID for convenience

      // 2. Perform updates in parallel (limited chunks if necessary, but here we can use Promise.all)
      const updatePromises = toUpdate.map((el) => 
        tx.mapElement.update({
          where: { id: el.id },
          data: {
            type: el.type,
            name: el.name,
            code: el.code,
            geometryType: el.geometryType,
            geometryJson: el.geometryJson,
            styleJson: el.styleJson ?? undefined,
            metaJson: el.metaJson ?? undefined
          }
        })
      );

      // 3. Perform creates in one go (Note: createMany is faster)
      const createPromise = tx.mapElement.createMany({
        data: toCreate.map(el => ({
          id: el.id,
          tenantId,
          projectId,
          type: el.type,
          name: el.name,
          code: el.code,
          geometryType: el.geometryType,
          geometryJson: el.geometryJson,
          styleJson: el.styleJson,
          metaJson: el.metaJson
        }))
      });

      const [updatedElements] = await Promise.all([
        Promise.all(updatePromises),
        createPromise
      ]);

      // All elements for LOT details sync
      const allElements = [...toUpdate, ...toCreate];
      const lotsToSync = allElements.filter(el => el.type === 'LOT');

      // 4. Batch LotDetails upserts
      // To keep it clean and fairly fast, we also Promise.all these
      const lotPromises = lotsToSync.map(element => {
          const lotMeta = (element.metaJson as any) || {};
          const mapElementId = element.id!; // We are sure id exists as we update/create it above
          
          return tx.lotDetails.upsert({
            where: { mapElementId },
            update: {
              areaM2: lotMeta.areaM2 || lotMeta.area || undefined,
              frontage: lotMeta.frontage || undefined,
              price: lotMeta.price || undefined
            },
            create: {
              tenantId,
              projectId,
              mapElementId,
              status: 'AVAILABLE',
              areaM2: lotMeta.areaM2 || lotMeta.area || null,
              frontage: lotMeta.frontage || null,
              price: lotMeta.price || null
            }
          });
      });

      await Promise.all(lotPromises);

      // Return a full list for frontend acknowledgment (optional, but consistent with return type)
      return tx.mapElement.findMany({
        where: { tenantId, projectId },
        include: { lotDetails: true }
      });
    }, {
      timeout: 30000 // Increase timeout for massive map saves
    });
  }

  async create(tenantId: string, projectId: string, dto: MapElementDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId }
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
        metaJson: dto.metaJson
      }
    });
  }

  async update(tenantId: string, id: string, dto: Partial<MapElementDto>) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId }
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
        ...(dto.metaJson !== undefined && { metaJson: dto.metaJson })
      }
    });
  }

  async remove(tenantId: string, id: string) {
    const el = await this.prisma.mapElement.findFirst({
      where: { id, tenantId }
    });
    if (!el) throw new NotFoundException('Elemento não encontrado.');

    await this.prisma.mapElement.delete({ where: { id } });
    return { message: 'Elemento removido.' };
  }
}
