import { Controller, Get, Param, Req, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public')
@Controller('p')
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('resolve-tenant')
  @ApiOperation({ summary: 'Resolver contexto de tenant/projeto via Host' })
  async resolveTenant(@Req() req: any) {
    if (!req.tenantId) {
      throw new NotFoundException('Loteadora não identificada.');
    }
    
    // You could fetch more data here (theme, logo, etc)
    return {
      tenantId: req.tenantId,
      projectId: req.projectId,
      project: req.project || null
    };
  }

  @Get('preview/:id')
  @ApiOperation({ summary: 'Visualização prévia do projeto' })
  findPreview(@Param('id') id: string) {
    return this.projectsService.findPreview(id);
  }

  @Get(':projectSlug')
  @ApiOperation({ summary: 'Dados públicos do projeto (mapa + lotes + mídia)' })
  findPublic(@Param('projectSlug') projectSlug: string) {
    return this.projectsService.findBySlug(projectSlug);
  }
}
