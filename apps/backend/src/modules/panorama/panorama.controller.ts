import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { PanoramaService } from './panorama.service';
import { CreatePanoramaDto } from './dto/create-panorama.dto';
import { UpdatePanoramaDto } from './dto/update-panorama.dto';
import { CreateSnapshotDto } from './dto/create-snapshot.dto';
import { UpdateSnapshotDto } from './dto/update-snapshot.dto';
import { CreateBeaconDto } from './dto/create-beacon.dto';
import { UpdateBeaconDto } from './dto/update-beacon.dto';

// ── Project-scoped routes ─────────────────────────────────
@ApiTags('Panorama 360')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('projects/:projectId/panoramas')
export class PanoramaController {
  constructor(private readonly panoramaService: PanoramaService) {}

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar panoramas do projeto' })
  findAll(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.panoramaService.findAllByProject(tenantId, projectId);
  }

  @Post()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar panorama do projeto' })
  create(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreatePanoramaDto,
  ) {
    return this.panoramaService.create(tenantId, projectId, dto);
  }

  @Post(':panoramaId/upload-image')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload de imagem de snapshot do panorama' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadSnapshotImage(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('panoramaId') panoramaId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.panoramaService.uploadSnapshotImage(
      tenantId,
      projectId,
      panoramaId,
      file,
    );
  }

  @Post(':panoramaId/upload-implantation')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Upload da imagem de implantação' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadImplantation(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('panoramaId') panoramaId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.panoramaService.uploadImplantation(
      tenantId,
      projectId,
      panoramaId,
      file,
    );
  }
}

// ── Per-panorama routes ───────────────────────────────────
@ApiTags('Panorama 360')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('panoramas/:panoramaId')
export class PanoramaItemController {
  constructor(private readonly panoramaService: PanoramaService) {}

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Buscar panorama por ID' })
  findOne(
    @TenantId() tenantId: string,
    @Param('panoramaId') panoramaId: string,
  ) {
    return this.panoramaService.findOne(tenantId, panoramaId);
  }

  @Put()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar panorama' })
  update(
    @TenantId() tenantId: string,
    @Param('panoramaId') panoramaId: string,
    @Body() dto: UpdatePanoramaDto,
  ) {
    return this.panoramaService.update(tenantId, panoramaId, dto);
  }

  @Delete()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Deletar panorama' })
  remove(
    @TenantId() tenantId: string,
    @Param('panoramaId') panoramaId: string,
  ) {
    return this.panoramaService.remove(tenantId, panoramaId);
  }

  @Post('snapshots')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar snapshot no panorama' })
  createSnapshot(
    @TenantId() tenantId: string,
    @Param('panoramaId') panoramaId: string,
    @Body() dto: CreateSnapshotDto,
  ) {
    return this.panoramaService.createSnapshot(tenantId, panoramaId, dto);
  }

  @Post('beacons')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar beacon no panorama' })
  createBeacon(
    @TenantId() tenantId: string,
    @Param('panoramaId') panoramaId: string,
    @Body() dto: CreateBeaconDto,
  ) {
    return this.panoramaService.createBeacon(tenantId, panoramaId, dto);
  }
}

// ── Snapshot routes ───────────────────────────────────────
@ApiTags('Panorama 360')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('panorama-snapshots/:snapshotId')
export class PanoramaSnapshotController {
  constructor(private readonly panoramaService: PanoramaService) {}

  @Put()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar snapshot' })
  update(
    @TenantId() tenantId: string,
    @Param('snapshotId') snapshotId: string,
    @Body() dto: UpdateSnapshotDto,
  ) {
    return this.panoramaService.updateSnapshot(tenantId, snapshotId, dto);
  }

  @Delete()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Deletar snapshot' })
  remove(
    @TenantId() tenantId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.panoramaService.removeSnapshot(tenantId, snapshotId);
  }
}

// ── Beacon routes ─────────────────────────────────────────
@ApiTags('Panorama 360')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('panorama-beacons/:beaconId')
export class PanoramaBeaconController {
  constructor(private readonly panoramaService: PanoramaService) {}

  @Put()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar beacon' })
  update(
    @TenantId() tenantId: string,
    @Param('beaconId') beaconId: string,
    @Body() dto: UpdateBeaconDto,
  ) {
    return this.panoramaService.updateBeacon(tenantId, beaconId, dto);
  }

  @Delete()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Deletar beacon' })
  remove(
    @TenantId() tenantId: string,
    @Param('beaconId') beaconId: string,
  ) {
    return this.panoramaService.removeBeacon(tenantId, beaconId);
  }
}
