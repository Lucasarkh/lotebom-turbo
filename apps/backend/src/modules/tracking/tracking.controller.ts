import {
  Body,
  Controller,
  Post,
  Get,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import {
  CreateSessionDto,
  CreateEventDto,
  TrackingReportQueryDto
} from './dto/tracking.dto';
import { TrackingService } from './tracking.service';
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '@common/guards/tenant.guard';
import { TenantId } from '@common/decorators/tenant-id.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('session')
  async createSession(@Body() dto: CreateSessionDto, @Req() req: Request) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    return this.trackingService.createSession(dto, ip, userAgent);
  }

  @Post('event')
  async trackEvent(@Body() dto: CreateEventDto) {
    return this.trackingService.trackEvent(dto);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getDashboardStats(
    @TenantId() tenantId: string,
    @CurrentUser() user: any
  ) {
    return this.trackingService.getDashboardStats(tenantId, user);
  }

  @Get('metrics')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getMetrics(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getMetrics(query, user);
  }

  @Get('report/lots')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getLotReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getMostAccessedLots(query, user);
  }

  @Get('report/pages')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getPageReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getPageViews(query, user);
  }

  @Get('report/realtors')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getRealtorReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getRealtorLinkClicks(query, user);
  }

  @Get('report/sources')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  async getSourceReport(
    @TenantId() tenantId: string,
    @Query() query: TrackingReportQueryDto,
    @CurrentUser() user: any
  ) {
    query.tenantId = tenantId;
    return this.trackingService.getLeadSources(query, user);
  }
}
