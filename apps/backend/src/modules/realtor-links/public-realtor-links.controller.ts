import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RealtorLinksService } from './realtor-links.service';

@ApiTags('Public – Realtor Links')
@Controller('p/:projectSlug/corretores')
export class PublicRealtorLinksController {
  constructor(private readonly service: RealtorLinksService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Buscar dados públicos do corretor pelo código' })
  findPublic(
    @Param('projectSlug') projectSlug: string,
    @Param('code') code: string
  ) {
    return this.service.findPublic(projectSlug, code);
  }
}
