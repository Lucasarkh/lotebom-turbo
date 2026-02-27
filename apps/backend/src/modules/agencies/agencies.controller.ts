import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { CreateAgencyDto, UpdateAgencyDto } from './dto/agency.dto';
import { CreateInviteDto, AcceptInviteDto } from './dto/invite.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.LOTEADORA)
  create(@Req() req, @Body() dto: CreateAgencyDto) {
    return this.agenciesService.createAgency(req.user.tenantId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.LOTEADORA)
  findAll(@Req() req) {
    return this.agenciesService.listAgencies(req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.LOTEADORA)
  findOne(@Req() req, @Param('id') id: string) {
    return this.agenciesService.getAgency(id, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.LOTEADORA)
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateAgencyDto) {
    return this.agenciesService.updateAgency(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.LOTEADORA)
  remove(@Req() req, @Param('id') id: string) {
    return this.agenciesService.deleteAgency(id, req.user.tenantId);
  }

  // --- Invites ---

  @Post('invite')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.LOTEADORA, UserRole.IMOBILIARIA)
  createInvite(@Req() req, @Body() dto: CreateInviteDto) {
    return this.agenciesService.createInvite(req.user.tenantId, req.user.id, dto);
  }

  @Post('invite/accept')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.agenciesService.acceptInvite(dto);
  }

  @Get('invite/:token')
  getInvite(@Param('token') token: string) {
    return this.agenciesService.getInviteDetail(token);
  }

  // --- Metrics for Agency ---

  @Get('metrics')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.IMOBILIARIA)
  getMetrics(@Req() req) {
    if (!req.user.agencyId) throw new Error('Acesso negado: usuário não vinculado a imobiliária');
    return this.agenciesService.getAgencyMetrics(req.user.agencyId);
  }
}
