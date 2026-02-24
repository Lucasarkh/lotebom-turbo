import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@ApiTags('Public – Leads')
@Controller('p/:projectSlug/leads')
export class PublicLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateLeadDto
  ) {
    return this.leadsService.createPublic(projectSlug, dto);
  }
}
