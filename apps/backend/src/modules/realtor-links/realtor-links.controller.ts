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
  Request,
  NotFoundException
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
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar link de corretor' })
  create(@TenantId() tenantId: string, @Body() dto: CreateRealtorLinkDto) {
    return this.service.create(tenantId, dto);
  }

  @Get()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Listar links de corretores' })
  findAll(
    @TenantId() tenantId: string,
    @Query('projectId') projectId?: string
  ) {
    return this.service.findAll(tenantId, projectId);
  }

  @Get('me')
  @Roles('CORRETOR')
  @ApiOperation({ summary: 'Buscar link do corretor logado' })
  async findMe(@Request() req: any) {
    const link = await this.service.findByUserId(req.user.id);
    if (!link)
      throw new NotFoundException('Realtor link not found for this user');
    return link;
  }

  @Patch('me')
  @Roles('CORRETOR')
  @ApiOperation({ summary: 'Atualizar link do corretor logado' })
  updateMe(@Request() req: any, @Body() dto: UpdateRealtorLinkDto) {
    return this.service.updateMe(req.user.id, dto);
  }

  @Get(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Buscar link de corretor por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar link de corretor' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRealtorLinkDto
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover link de corretor' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
