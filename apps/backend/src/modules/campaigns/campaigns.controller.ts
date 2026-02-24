import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CreateCampaignInvestmentDto,
  CampaignReportQueryDto
} from './dto/campaigns.dto';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Post()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar campanha' })
  create(@TenantId() tenantId: string, @Body() dto: CreateCampaignDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar campanhas' })
  findAll(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Query('projectId') projectId?: string
  ) {
    return this.service.findAll(tenantId, projectId, user);
  }

  @Get(':id')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Buscar campanha por ID' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.service.findOne(tenantId, id, user);
  }

  @Patch(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar campanha' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover campanha' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }

  // ─── INVESTMENTS ─────────────────────────────────────────

  @Post(':id/investments')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Adicionar investimento na campanha' })
  createInvestment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateCampaignInvestmentDto
  ) {
    return this.service.createInvestment(tenantId, id, dto);
  }

  @Get(':id/investments')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar investimentos da campanha' })
  getInvestments(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.getInvestments(tenantId, id);
  }

  @Delete(':id/investments/:investmentId')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover investimento da campanha' })
  removeInvestment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('investmentId') investmentId: string
  ) {
    return this.service.removeInvestment(tenantId, id, investmentId);
  }

  // ─── PERFORMANCE ─────────────────────────────────────────

  @Get(':id/performance')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  @ApiOperation({ summary: 'Buscar performance da campanha' })
  getPerformance(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: CampaignReportQueryDto
  ) {
    return this.service.getPerformance(tenantId, id, query);
  }
}
