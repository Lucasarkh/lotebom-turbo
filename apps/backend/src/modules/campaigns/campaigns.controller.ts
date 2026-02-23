import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaigns.dto';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Criar campanha' })
  create(@TenantId() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Listar campanhas' })
  findAll(
    @TenantId() tenantId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.findAll(tenantId, projectId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Buscar campanha por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Atualizar campanha' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover campanha' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
