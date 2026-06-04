import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';
import type { User } from '@prisma/client';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('check-slug/:slug')
  @ApiOperation({ summary: 'Verificar disponibilidade de slug de projeto' })
  @ApiResponse({ status: 200, description: 'Disponibilidade do slug' })
  checkSlug(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string
  ) {
    return this.projectsService.checkSlugAvailability(slug, excludeId);
  }

  @Post()
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Criar projeto' })
  @ApiResponse({ status: 201, description: 'Projeto criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Slug já em uso' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: User
  ) {
    return this.projectsService.create(tenantId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar projetos do tenant' })
  @ApiResponse({ status: 200, description: 'Lista paginada de projetos' })
  findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationQueryDto
  ) {
    return this.projectsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar projeto por ID' })
  @ApiResponse({ status: 200, description: 'Projeto encontrado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar projeto (PUT)' })
  @ApiResponse({ status: 200, description: 'Projeto atualizado' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User
  ) {
    return this.projectsService.update(tenantId, id, dto, user);
  }

  @Patch(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Atualizar projeto (PATCH)' })
  @ApiResponse({ status: 200, description: 'Projeto atualizado parcialmente' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  patch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User
  ) {
    return this.projectsService.update(tenantId, id, dto, user);
  }

  @Patch(':id/publish')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Publicar projeto' })
  @ApiResponse({ status: 200, description: 'Projeto publicado' })
  @ApiResponse({ status: 400, description: 'Projeto não pode ser publicado (validação)' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  publish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.publish(tenantId, id);
  }

  @Patch(':id/unpublish')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Despublicar projeto' })
  @ApiResponse({ status: 200, description: 'Projeto despublicado' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  unpublish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.unpublish(tenantId, id);
  }

  @Delete(':id')
  @Roles('LOTEADORA', 'SYSADMIN')
  @ApiOperation({ summary: 'Remover projeto' })
  @ApiResponse({ status: 200, description: 'Projeto removido' })
  @ApiResponse({ status: 404, description: 'Projeto não encontrado' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.remove(tenantId, id);
  }
}
