import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@ApiTags('Public – Leads')
@Controller('p/:projectSlug/leads')
export class PublicLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // Elevado de 5 para 20 para acomodar tráfego viral/NAT
  @ApiOperation({ summary: 'Criar lead em projeto público' })
  create(
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateLeadDto
  ) {
    return this.leadsService.createPublic(projectSlug, dto);
  }
}
