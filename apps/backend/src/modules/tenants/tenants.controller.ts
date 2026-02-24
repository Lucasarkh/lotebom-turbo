import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { RegisterTenantDto } from '../auth/dto/register-tenant.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Tenants (System Admin)')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SYSADMIN')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar uma nova loteadora (tenant + adm)' })
  create(@Body() dto: RegisterTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as loteadoras com métricas' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Ativar/Desativar loteadora' })
  updateStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.tenantsService.updateStatus(id, isActive);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover loteadora' })
  remove(@Param('id') id: string) {
    return this.tenantsService.delete(id);
  }
}
