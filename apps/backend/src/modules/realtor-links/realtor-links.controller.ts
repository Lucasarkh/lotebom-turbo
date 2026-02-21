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
import { RealtorLinksService } from './realtor-links.service';
import { CreateRealtorLinkDto } from './dto/create-realtor-link.dto';
import { UpdateRealtorLinkDto } from './dto/update-realtor-link.dto';

@ApiTags('Realtor Links')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('realtor-links')
export class RealtorLinksController {
  constructor(private readonly service: RealtorLinksService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Criar link de corretor' })
  create(@TenantId() tenantId: string, @Body() dto: CreateRealtorLinkDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Listar links de corretores' })
  findAll(
    @TenantId() tenantId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.findAll(tenantId, projectId);
  }

  @Get(':id')
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  @ApiOperation({ summary: 'Buscar link de corretor por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Atualizar link de corretor' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRealtorLinkDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover link de corretor' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
