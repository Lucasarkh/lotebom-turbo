import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { PurchaseFlowService } from './purchase-flow.service';
import {
  ConfirmSaleDto,
  PurchaseMetricsQueryDto,
  PurchaseReservationsQueryDto,
  ReservationActionDto,
  UpdateReservationAdminDto,
  UpdatePurchaseFlowConfigDto
} from './dto/purchase-flow.dto';

@ApiTags('Purchase Flow')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('purchase-flow')
export class PurchaseFlowController {
  constructor(private readonly service: PurchaseFlowService) {}

  @Get('config/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Obter configuração do fluxo de compra' })
  getConfig(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string
  ) {
    return this.service.getConfig(tenantId, projectId);
  }

  @Put('config/:projectId')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar configuração do fluxo de compra' })
  updateConfig(
    @TenantId() tenantId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdatePurchaseFlowConfigDto
  ) {
    return this.service.updateConfig(tenantId, projectId, dto);
  }

  @Get('metrics')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Métricas do fluxo de compra' })
  getMetrics(
    @TenantId() tenantId: string,
    @Query() query: PurchaseMetricsQueryDto
  ) {
    return this.service.getMetrics(tenantId, query);
  }

  @Get('reservations')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar reservas' })
  listReservations(
    @TenantId() tenantId: string,
    @Query() query: PurchaseReservationsQueryDto
  ) {
    return this.service.listReservations(tenantId, query);
  }

  @Patch('reservations/:leadId')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar reserva (admin)' })
  updateReservation(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateReservationAdminDto
  ) {
    return this.service.updateReservationAdmin(tenantId, leadId, dto);
  }

  @Patch('reservations/:leadId/release')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Liberar reserva' })
  releaseReservation(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ReservationActionDto
  ) {
    return this.service.releaseReservation(tenantId, leadId, dto);
  }

  @Patch('reservations/:leadId/cancel')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Cancelar reserva' })
  cancelReservation(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ReservationActionDto
  ) {
    return this.service.cancelReservation(tenantId, leadId, dto);
  }

  @Get('processes/:leadId')
  @Roles('LOTEADORA', 'SYSADMIN', 'IMOBILIARIA', 'CORRETOR')
  @ApiOperation({ summary: 'Visualizar processo de compra' })
  getProcess(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string
  ) {
    return this.service.getProcessForAdmin(tenantId, leadId);
  }

  @Patch('processes/:leadId/confirm-sale')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Confirmar venda' })
  confirmSale(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ConfirmSaleDto
  ) {
    return this.service.confirmSale(tenantId, leadId, dto);
  }

  @Patch('reservations/:leadId/confirm-sale')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Confirmar venda a partir de reserva' })
  confirmSaleFromReservations(
    @TenantId() tenantId: string,
    @Param('leadId') leadId: string,
    @Body() dto: ConfirmSaleDto
  ) {
    return this.service.confirmSale(tenantId, leadId, dto);
  }
}