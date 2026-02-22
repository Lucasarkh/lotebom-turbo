import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { S3Service } from '@infra/s3/s3.service';
import { MediaType } from '@prisma/client';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, 'video/mp4', 'video/webm'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50 MB

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  // ── Project Banner ──────────────────────────────────────

  async uploadBannerImage(
    tenantId: string,
    projectId: string,
    file: Express.Multer.File,
  ) {
    this.validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    // Delete old image from S3 if it exists
    if (project.bannerImageUrl) {
      const oldKey = this.s3.keyFromUrl(project.bannerImageUrl);
      if (oldKey) await this.s3.delete(oldKey).catch(() => {});
    }

    const key = this.s3.buildKey(tenantId, `projects/${projectId}/banner`, file.originalname);
    const url = await this.s3.upload(file.buffer, key, file.mimetype);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { bannerImageUrl: url },
    });
  }

  async removeBannerImage(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    if (!project.bannerImageUrl) return project;

    const oldKey = this.s3.keyFromUrl(project.bannerImageUrl);
    if (oldKey) await this.s3.delete(oldKey).catch(() => {});

    return this.prisma.project.update({
      where: { id: projectId },
      data: { bannerImageUrl: null },
    });
  }

  // ── Project media (gallery) ─────────────────────────────

  async uploadMedia(
    tenantId: string,
    projectId: string,
    file: Express.Multer.File,
    caption?: string,
    lotDetailsId?: string,
  ) {
    this.validateFile(file, ALLOWED_MEDIA_TYPES, MAX_MEDIA_SIZE);

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    if (lotDetailsId) {
      const lot = await this.prisma.lotDetails.findFirst({
        where: { id: lotDetailsId, tenantId, projectId },
      });
      if (!lot) throw new NotFoundException('Lote não encontrado.');
    }

    const folder = lotDetailsId ? `projects/${projectId}/lots/${lotDetailsId}` : `projects/${projectId}/media`;
    const key = this.s3.buildKey(tenantId, folder, file.originalname);
    const url = await this.s3.upload(file.buffer, key, file.mimetype);

    const type: MediaType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'PHOTO';

    return this.prisma.projectMedia.create({
      data: { tenantId, projectId, type, url, caption, lotDetailsId },
    });
  }

  async listMedia(tenantId: string, projectId: string) {
    return this.prisma.projectMedia.findMany({
      where: { tenantId, projectId, lotDetailsId: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeMedia(tenantId: string, mediaId: string) {
    const media = await this.prisma.projectMedia.findFirst({
      where: { id: mediaId, tenantId },
    });
    if (!media) throw new NotFoundException('Mídia não encontrada.');

    const key = this.s3.keyFromUrl(media.url);
    if (key) await this.s3.delete(key).catch(() => {});

    return this.prisma.projectMedia.delete({ where: { id: mediaId } });
  }

  // ── Presigned URL (frontend-direct upload) ──────────────

  async getPresignedUploadUrl(
    tenantId: string,
    projectId: string,
    folder: string,
    fileName: string,
    contentType: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const key = this.s3.buildKey(tenantId, `projects/${projectId}/${folder}`, fileName);
    return this.s3.presignedUploadUrl(key, contentType);
  }

  // ── validation ──────────────────────────────────────────

  private validateFile(
    file: Express.Multer.File,
    allowedTypes: string[],
    maxSize: number,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    if (!allowedTypes.includes(file.mimetype))
      throw new BadRequestException(
        `Tipo não permitido. Aceitos: ${allowedTypes.join(', ')}`,
      );
    if (file.size > maxSize)
      throw new BadRequestException(
        `Arquivo muito grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(0)} MB`,
      );
  }
}
