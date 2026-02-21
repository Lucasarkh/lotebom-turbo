import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RealtorLinksService } from './realtor-links.service';

@ApiTags('Public – Realtor Links')
@Controller('p/:tenantSlug/corretores')
export class PublicRealtorLinksController {
  constructor(private readonly service: RealtorLinksService) {}

  @Get(':code')
  @ApiOperation({ summary: 'Buscar dados públicos do corretor pelo código' })
  findPublic(
    @Param('tenantSlug') tenantSlug: string,
    @Param('code') code: string,
  ) {
    return this.service.findPublic(tenantSlug, code);
  }
}
