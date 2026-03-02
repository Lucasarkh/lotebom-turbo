import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { NearbyService } from './nearby.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public')
@Controller('p')
export class PublicNearbyController {
  constructor(private readonly nearbyService: NearbyService) {}

  @Get(':projectSlug/nearby')
  @ApiOperation({ summary: 'Proximidades do empreendimento (público)' })
  async getNearby(@Param('projectSlug') projectSlug: string) {
    return this.nearbyService.getPublicNearby(projectSlug);
  }
}
