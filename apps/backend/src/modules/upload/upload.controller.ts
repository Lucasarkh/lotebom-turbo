import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('projects/:projectId')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // ── Project Banner ──────────────────────────────────────

  @Post('banner-image')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload de banner do projeto' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadBannerImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('device') device?: string
  ) {
    return this.uploadService.uploadBannerImage(
      tenantId,
      projectId,
      file,
      device
    );
  }

  @Delete('banner-image')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover banner do projeto' })
  removeBannerImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query('device') device?: string
  ) {
    return this.uploadService.removeBannerImage(tenantId, projectId, device);
  }

  // ── Project Open Graph logo ────────────────────────────

  @Post('og-logo')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload do logo Open Graph' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadOgLogo(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.uploadService.uploadOgLogo(tenantId, projectId, file);
  }

  @Delete('og-logo')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover logo Open Graph' })
  removeOgLogo(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.uploadService.removeOgLogo(tenantId, projectId);
  }

  // ── Project footer logos (Realizacao e Propriedade) ───

  @Get('footer-logos')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar logos do rodapé' })
  listFooterLogos(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.uploadService.listFooterLogos(tenantId, projectId);
  }

  @Post('footer-logos')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload de logo do rodapé' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        label: { type: 'string' }
      }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadFooterLogo(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('label') label?: string
  ) {
    return this.uploadService.uploadFooterLogo(
      tenantId,
      projectId,
      file,
      label
    );
  }

  @Delete('footer-logos/:logoId')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover logo do rodapé' })
  removeFooterLogo(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('logoId') logoId: string
  ) {
    return this.uploadService.removeFooterLogo(tenantId, projectId, logoId);
  }

  // ── Project media (gallery) ─────────────────────────────

  @Get('media')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar mídia da galeria' })
  listMedia(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.uploadService.listMedia(tenantId, projectId);
  }

  @Post('media')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload de mídia' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string' }
      }
    }
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('caption') caption?: string,
    @Query('lotDetailsId') lotDetailsId?: string
  ) {
    return this.uploadService.uploadMedia(
      tenantId,
      projectId,
      file,
      caption,
      lotDetailsId
    );
  }

  @Delete('media/:mediaId')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover mídia' })
  removeMedia(@TenantId() tenantId: string, @Param('mediaId') mediaId: string) {
    return this.uploadService.removeMedia(tenantId, mediaId);
  }

  // ── Presigned URL (for frontend-direct S3 upload) ───────

  @Get('presigned-upload')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Obter URL pré-assinada para upload direto' })
  getPresignedUrl(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query('folder') folder: string,
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string
  ) {
    return this.uploadService.getPresignedUploadUrl(
      tenantId,
      projectId,
      folder,
      fileName,
      contentType
    );
  }
}
