import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';
import { CreateInviteDto, AcceptInviteDto } from './dto/invite.dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Public } from '@common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller('agencies')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  @Roles('LOTEADORA')
  create(@Req() req, @Body() dto: CreateAgencyDto) {
    return this.agenciesService.createAgency(req.user.tenantId, dto);
  }

  @Get()
  @Roles('LOTEADORA')
  findAll(
    @Req() req, 
    @Query('page') page?: string, 
    @Query('limit') limit?: string,
    @Query('search') search?: string
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 12;
    return this.agenciesService.listAgencies(req.user.tenantId, p, l, search);
  }

  @Get(':id')
  @Roles('LOTEADORA', 'IMOBILIARIA')
  findOne(@Req() req, @Param('id') id: string) {
    // If user is IMOBILIARIA, they can only see their own agency
    const targetId = req.user.role === 'IMOBILIARIA' ? req.user.agencyId : id;
    return this.agenciesService.getAgency(targetId, req.user.tenantId);
  }

  @Put(':id')
  @Roles('LOTEADORA', 'IMOBILIARIA')
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateAgencyDto) {
    // If user is IMOBILIARIA, they can only update their own agency
    const targetId = req.user.role === 'IMOBILIARIA' ? req.user.agencyId : id;
    return this.agenciesService.updateAgency(targetId, req.user.tenantId, dto);
  }

  @Delete(':id')
  @Roles('LOTEADORA')
  remove(@Req() req, @Param('id') id: string) {
    return this.agenciesService.deleteAgency(id, req.user.tenantId);
  }

  // --- Invites ---

  @Post('invite')
  @Roles('LOTEADORA', 'IMOBILIARIA')
  createInvite(@Req() req, @Body() dto: CreateInviteDto) {
    return this.agenciesService.createInvite(req.user.tenantId, req.user.id, dto);
  }

  @Post('invite/accept')
  @Public()
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.agenciesService.acceptInvite(dto);
  }

  @Get('invite/:token')
  @Public()
  getInvite(@Param('token') token: string) {
    return this.agenciesService.getInviteDetail(token);
  }

  // --- Metrics for Agency ---

  @Get('metrics')
  @Roles('IMOBILIARIA', 'LOTEADORA', 'SYSADMIN')
  getMetrics(@Req() req, @Query('agencyId') queryAgencyId?: string) {
    const agencyId = queryAgencyId || req.user.agencyId;
    if (!agencyId) throw new Error('Acesso negado: ID da imobiliária não fornecido');
    return this.agenciesService.getAgencyMetrics(agencyId);
  }
}
