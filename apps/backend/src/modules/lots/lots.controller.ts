import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { LotsService } from './lots.service';
import { UpsertLotDetailsDto } from './dto/upsert-lot-details.dto';

@ApiTags('Lots')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('projects/:projectId/lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  findAll(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.lotsService.findByProject(tenantId, projectId);
  }

  @Get(':mapElementId')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  findOne(
    @TenantId() tenantId: string,
    @Param('mapElementId') mapElementId: string,
  ) {
    return this.lotsService.findByMapElement(tenantId, mapElementId);
  }

  @Put(':mapElementId')
  @Roles('ADMIN', 'EDITOR')
  upsert(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('mapElementId') mapElementId: string,
    @Body() dto: UpsertLotDetailsDto,
  ) {
    return this.lotsService.upsert(tenantId, projectId, mapElementId, dto);
  }

  @Delete(':mapElementId')
  @Roles('ADMIN', 'EDITOR')
  remove(
    @TenantId() tenantId: string,
    @Param('mapElementId') mapElementId: string,
  ) {
    return this.lotsService.remove(tenantId, mapElementId);
  }
}
