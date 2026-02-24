import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
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
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('Lots')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('projects/:projectId/lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  findAll(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.lotsService.findByProject(tenantId, projectId, pagination);
  }

  @Get(':mapElementId')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  findOne(
    @TenantId() tenantId: string,
    @Param('mapElementId') mapElementId: string,
  ) {
    return this.lotsService.findByMapElement(tenantId, mapElementId);
  }

  @Put(':mapElementId')
  @Roles('LOTEADORA', 'SYSADMIN')
  upsert(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Param('mapElementId') mapElementId: string,
    @Body() dto: UpsertLotDetailsDto,
  ) {
    return this.lotsService.upsert(tenantId, projectId, mapElementId, dto);
  }

  @Delete(':mapElementId')
  @Roles('LOTEADORA', 'SYSADMIN')
  remove(
    @TenantId() tenantId: string,
    @Param('mapElementId') mapElementId: string,
  ) {
    return this.lotsService.remove(tenantId, mapElementId);
  }
}
