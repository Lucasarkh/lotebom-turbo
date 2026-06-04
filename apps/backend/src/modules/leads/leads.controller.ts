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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { LeadsQueryDto } from './dto/leads-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import {
  CreateManualLeadDto,
  UpdateLeadStatusDto,
  AddLeadDocumentDto,
  AddLeadPaymentDto
} from './dto/manual-lead.dto';
import {
  PreLaunchQueueQueryDto,
  UpdatePreLaunchQueueDto
} from './dto/prelaunch-queue.dto';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar lead manualmente', description: 'Cria um lead manualmente no painel por um corretor ou loteadora.' })
  @ApiResponse({ status: 201, description: 'Lead criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou lote indisponível' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateManualLeadDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.createManual(tenantId, dto, user);
  }

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar leads com filtros', description: 'Retorna lista paginada de leads com filtros por projeto, status, busca textual e corretor.' })
  @ApiResponse({ status: 200, description: 'Lista paginada de leads' })
  findAll(
    @TenantId() tenantId: string,
    @Query() query: LeadsQueryDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.findAll(tenantId, query, user);
  }

  @Get('prelaunch-queue')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar fila de pré-lançamento', description: 'Retorna a fila de pré-lançamento com resumos por status, projeto e lote.' })
  @ApiResponse({ status: 200, description: 'Fila de pré-lançamento com sumários' })
  listPreLaunchQueue(
    @TenantId() tenantId: string,
    @Query() query: PreLaunchQueueQueryDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.listPreLaunchQueue(tenantId, query, user);
  }

  @Patch('prelaunch-queue/:id')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar entrada da fila de pré-lançamento', description: 'Atualiza status, notas e posição de uma entrada na fila de pré-lançamento.' })
  @ApiResponse({ status: 200, description: 'Entrada da fila atualizada' })
  @ApiResponse({ status: 404, description: 'Registro de fila não encontrado' })
  updatePreLaunchQueue(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePreLaunchQueueDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.updatePreLaunchQueueEntry(tenantId, id, dto, user);
  }

  @Get(':id')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Buscar lead por ID', description: 'Retorna os detalhes completos de um lead, incluindo histórico, documentos e pagamentos.' })
  @ApiResponse({ status: 200, description: 'Lead encontrado' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.leadsService.findOne(tenantId, id, user);
  }

  @Patch(':id')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar dados do lead', description: 'Atualiza informações cadastrais do lead.' })
  @ApiResponse({ status: 200, description: 'Lead atualizado' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para este lead' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.update(tenantId, id, dto, user);
  }

  @Patch(':id/status')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar status do lead', description: 'Altera o status do lead (ex: NEW → CONTACTED → WON). Sincroniza status do lote automaticamente.' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Transição de status inválida ou lote indisponível' })
  @ApiResponse({ status: 403, description: 'Sem permissão (ex: corretor tentando estornar)' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.updateStatus(tenantId, id, dto, user);
  }

  @Post(':id/documents')
  @Roles('LOTEADORA', 'CORRETOR', 'IMOBILIARIA', 'SYSADMIN')
  @ApiOperation({ summary: 'Adicionar documento ao lead', description: 'Registra um documento (URL) vinculado ao lead.' })
  @ApiResponse({ status: 201, description: 'Documento adicionado' })
  @ApiResponse({ status: 403, description: 'Sem permissão para este lead' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  addDocument(
    @TenantId() tenantId: string,
    @Param('id') leadId: string,
    @Body() dto: AddLeadDocumentDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.addDocument(tenantId, leadId, dto, user);
  }

  @Post(':id/payments')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Adicionar pagamento ao lead', description: 'Registra um pagamento vinculado ao lead. Apenas loteadoras e sysadmins.' })
  @ApiResponse({ status: 201, description: 'Pagamento registrado' })
  @ApiResponse({ status: 403, description: 'Apenas loteadoras podem gerenciar pagamentos' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  addPayment(
    @TenantId() tenantId: string,
    @Param('id') leadId: string,
    @Body() dto: AddLeadPaymentDto,
    @CurrentUser() user: any
  ) {
    return this.leadsService.addPayment(tenantId, leadId, dto, user);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover lead', description: 'Remove permanentemente um lead do sistema.' })
  @ApiResponse({ status: 200, description: 'Lead removido' })
  @ApiResponse({ status: 404, description: 'Lead não encontrado' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leadsService.remove(tenantId, id);
  }
}
