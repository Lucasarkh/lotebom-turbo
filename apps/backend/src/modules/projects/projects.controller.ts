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
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Criar projeto' })
  create(@TenantId() tenantId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar projetos do tenant' })
  findAll(
    @TenantId() tenantId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.projectsService.findAll(tenantId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar projeto por ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.findOne(tenantId, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Atualizar projeto (PUT)' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, id, dto);
  }

  @Patch(':id')
  @Roles('ADMIN', 'EDITOR')
  @ApiOperation({ summary: 'Atualizar projeto (PATCH)' })
  patch(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(tenantId, id, dto);
  }

  @Patch(':id/publish')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Publicar projeto' })
  publish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.publish(tenantId, id);
  }

  @Patch(':id/unpublish')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Despublicar projeto' })
  unpublish(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.unpublish(tenantId, id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remover projeto' })
  remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.projectsService.remove(tenantId, id);
  }
}
