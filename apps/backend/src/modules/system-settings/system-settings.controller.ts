import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { SystemSettingsService } from './system-settings.service';
import { LeadStatus } from '@prisma/client';

@ApiTags('System Settings')
@Controller('p/settings')
export class PublicSettingsController {
  constructor(private readonly service: SystemSettingsService) {}

  @Get()
  getSettings() {
    return this.service.getPublicSettings();
  }

  @Post('contact')
  createLead(@Body() dto: { name: string; email?: string; phone?: string; message?: string }) {
    return this.service.createLead(dto);
  }
}

@ApiTags('System Settings (Admin)')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('settings')
export class AdminSettingsController {
  constructor(private readonly service: SystemSettingsService) {}

  @Patch()
  @Roles('SYSADMIN')
  updateSettings(@Body() dto: { contactWhatsapp?: string; contactEmail?: string; leadFormEnabled?: boolean }) {
    return this.service.updateSettings(dto);
  }

  @Get('leads')
  @Roles('SYSADMIN')
  findAllLeads() {
    return this.service.findAllLeads();
  }

  @Patch('leads/:id')
  @Roles('SYSADMIN')
  updateLeadStatus(@Param('id') id: string, @Body('status') status: LeadStatus) {
    return this.service.updateLeadStatus(id, status);
  }
}
