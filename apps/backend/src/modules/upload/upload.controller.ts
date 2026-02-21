import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
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

  // ── Map base image ──────────────────────────────────────

  @Post('map-image')
  @Roles('ADMIN', 'EDITOR')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadMapImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadService.uploadMapBaseImage(tenantId, projectId, file);
  }

  @Delete('map-image')
  @Roles('ADMIN', 'EDITOR')
  removeMapImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.uploadService.removeMapBaseImage(tenantId, projectId);
  }

  // ── Project media (gallery) ─────────────────────────────

  @Get('media')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  listMedia(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.uploadService.listMedia(tenantId, projectId);
  }

  @Post('media')
  @Roles('ADMIN', 'EDITOR')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        caption: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadMedia(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('caption') caption?: string,
  ) {
    return this.uploadService.uploadMedia(tenantId, projectId, file, caption);
  }

  @Delete('media/:mediaId')
  @Roles('ADMIN', 'EDITOR')
  removeMedia(
    @TenantId() tenantId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.uploadService.removeMedia(tenantId, mediaId);
  }

  // ── Presigned URL (for frontend-direct S3 upload) ───────

  @Get('presigned-upload')
  @Roles('ADMIN', 'EDITOR')
  getPresignedUrl(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query('folder') folder: string,
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string,
  ) {
    return this.uploadService.getPresignedUploadUrl(
      tenantId,
      projectId,
      folder,
      fileName,
      contentType,
    );
  }
}
