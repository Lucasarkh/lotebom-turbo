import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards
} from '@nestjs/common';
import { MapElementsService } from './map-elements.service';
import { BulkMapElementsDto, MapElementDto } from './dto/map-element.dto';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Map Elements')
@ApiBearerAuth()
@Controller('projects/:projectId/map-elements')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class MapElementsController {
  constructor(private readonly mapElementsService: MapElementsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar elementos do mapa de um projeto' })
  findAll(@TenantId() tenantId: string, @Param('projectId') projectId: string) {
    return this.mapElementsService.findAllByProject(tenantId, projectId);
  }

  @Put('bulk')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Salvar todos os elementos do mapa (bulk upsert)' })
  bulkUpsert(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body() dto: BulkMapElementsDto
  ) {
    return this.mapElementsService.bulkUpsert(tenantId, projectId, dto);
  }

  @Post()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar um elemento no mapa' })
  create(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body() dto: MapElementDto
  ) {
    return this.mapElementsService.create(tenantId, projectId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar elemento por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mapElementsService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar elemento' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MapElementDto
  ) {
    return this.mapElementsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover elemento' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.mapElementsService.remove(tenantId, id);
  }
}
