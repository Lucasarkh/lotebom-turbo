import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateSessionDto, CreateEventDto, TrackingReportQueryDto } from './dto/tracking.dto';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(dto: CreateSessionDto, ip?: string, userAgent?: string) {
    return this.prisma.trackingSession.create({
      data: {
        ...dto,
        ip,
        userAgent,
      },
    });
  }

  async trackEvent(dto: CreateEventDto) {
    return this.prisma.trackingEvent.create({
      data: {
        ...dto,
      },
    });
  }

  async getMostAccessedLots(query: TrackingReportQueryDto) {
    const { tenantId, projectId } = query;
    return this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: {
        type: 'CLICK',
        category: 'LOT',
        session: {
          tenantId,
          projectId,
        }
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 20,
    });
  }

  async getPageViews(query: TrackingReportQueryDto) {
    const { tenantId, projectId } = query;
    return this.prisma.trackingEvent.groupBy({
      by: ['path'],
      where: {
        type: 'PAGE_VIEW',
        session: {
          tenantId,
          projectId,
        }
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
  }

  async getRealtorLinkClicks(query: TrackingReportQueryDto) {
    const { tenantId, projectId } = query;
    return this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: {
        type: 'CLICK',
        category: 'REALTOR_LINK',
        session: {
          tenantId,
          projectId,
        }
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
  }

  async getLeadSources(query: TrackingReportQueryDto) {
    const { tenantId, projectId } = query;
    return this.prisma.trackingSession.groupBy({
      by: ['utmSource'],
      where: {
        tenantId,
        projectId,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });
  }

  async getMetrics(query: TrackingReportQueryDto) {
    const { tenantId, projectId } = query;
    const whereSession = {
      tenantId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
    };

    const [
      totalSessions,
      totalPageViews,
      totalLotClicks,
      totalRealtorClicks,
      topUtmSources,
      topUtmCampaigns,
      topLots,
      topRealtors,
    ] = await Promise.all([
      this.prisma.trackingSession.count({ where: whereSession }),
      this.prisma.trackingEvent.count({
        where: { type: 'PAGE_VIEW', session: whereSession },
      }),
      this.prisma.trackingEvent.count({
        where: { type: 'CLICK', category: 'LOT', session: whereSession },
      }),
      this.prisma.trackingEvent.count({
        where: { type: 'CLICK', category: 'REALTOR_LINK', session: whereSession },
      }),
      this.prisma.trackingSession.groupBy({
        by: ['utmSource'],
        where: whereSession,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.trackingSession.groupBy({
        by: ['utmCampaign'],
        where: whereSession,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { type: 'CLICK', category: 'LOT', session: whereSession },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { type: 'CLICK', category: 'REALTOR_LINK', session: whereSession },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      summary: {
        totalSessions,
        totalPageViews,
        totalLotClicks,
        totalRealtorClicks,
      },
      topUtmSources,
      topUtmCampaigns,
      topLots: topLots.map(l => ({ ...l, lotId: l.label })),
      topRealtors: topRealtors.map(r => ({ ...r, realtorId: r.label, realtorName: r.label })),
    };
  }
}
