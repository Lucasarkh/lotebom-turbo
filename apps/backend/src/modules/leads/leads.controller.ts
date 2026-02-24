import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { LeadsService } from './leads.service';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadStatus } from '@prisma/client';
import { LeadsQueryDto } from './dto/leads-query.dto';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  findAll(
    @TenantId() tenantId: string,
    @Query() query: LeadsQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.leadsService.findAll(tenantId, query, user);
  }

  @Get(':id')
  @Roles('LOTEADORA', 'CORRETOR', 'SYSADMIN')
  findOne(
    @TenantId() tenantId: string, 
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.leadsService.findOne(tenantId, id, user);
  }

  @Patch(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.leadsService.remove(tenantId, id);
  }
}
