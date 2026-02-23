import { Body, Controller, Post, Get, Query, Req, UseGuards } from '@nestjs/common';
import { CreateSessionDto, CreateEventDto, TrackingReportQueryDto } from './dto/tracking.dto';
import { TrackingService } from './tracking.service';
import { Request } from 'express';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('session')
  async createSession(@Body() dto: CreateSessionDto, @Req() req: Request) {
    const ip = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];
    return this.trackingService.createSession(dto, ip, userAgent);
  }

  @Post('event')
  async trackEvent(@Body() dto: CreateEventDto) {
    return this.trackingService.trackEvent(dto);
  }

  @Get('report/lots')
  async getLotReport(@Query() query: TrackingReportQueryDto) {
    return this.trackingService.getMostAccessedLots(query);
  }

  @Get('report/pages')
  async getPageReport(@Query() query: TrackingReportQueryDto) {
    return this.trackingService.getPageViews(query);
  }

  @Get('report/realtors')
  async getRealtorReport(@Query() query: TrackingReportQueryDto) {
    return this.trackingService.getRealtorLinkClicks(query);
  }

  @Get('report/sources')
  async getSourceReport(@Query() query: TrackingReportQueryDto) {
    return this.trackingService.getLeadSources(query);
  }
}
