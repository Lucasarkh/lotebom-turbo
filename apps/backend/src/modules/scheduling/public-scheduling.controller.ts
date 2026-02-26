import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SchedulingService } from './scheduling.service';
import { CreateSchedulingDto } from './dto/create-scheduling.dto';

@ApiTags('Public – Schedulings')
@Controller('p/:projectSlug/scheduling')
export class PublicSchedulingController {
  constructor(private readonly service: SchedulingService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Criar agendamento em projeto público' })
  create(
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateSchedulingDto
  ) {
    return this.service.createPublic(projectSlug, dto);
  }

  @Get('config')
  @ApiOperation({ summary: 'Obter configurações de agendamento públicas' })
  getConfig(@Param('projectSlug') projectSlug: string) {
    return this.service.getProjectConfigBySlug(projectSlug);
  }

  @Get('get-busy-slots/:date')
  @ApiOperation({ summary: 'Obter horários já preenchidos para uma data' })
  getBusySlots(
    @Param('projectSlug') projectSlug: string,
    @Param('date') date: string
  ) {
    return this.service.getBusySlots(projectSlug, date);
  }
}
