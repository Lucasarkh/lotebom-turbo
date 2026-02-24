import { Controller, Get, Param } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public')
@Controller('p')
export class PublicProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':projectSlug')
  @ApiOperation({ summary: 'Dados públicos do projeto (mapa + lotes + mídia)' })
  findPublic(@Param('projectSlug') projectSlug: string) {
    return this.projectsService.findBySlug(projectSlug);
  }
}
