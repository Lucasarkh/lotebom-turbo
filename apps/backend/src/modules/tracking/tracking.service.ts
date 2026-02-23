import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateSessionDto, CreateEventDto, TrackingReportQueryDto } from './dto/tracking.dto';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(dto: CreateSessionDto, ip?: string, userAgent?: string) {
    const { tenantSlug, projectSlug, realtorCode, ...data } = dto;
    let { tenantId, projectId } = data;

    if (!tenantId && tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    if (!projectId && projectSlug && tenantId) {
      const project = await this.prisma.project.findFirst({
        where: { tenantId, slug: projectSlug }
      });
      if (project) {
        projectId = project.id;
      }
    }

    const session = await this.prisma.trackingSession.create({
      data: {
        ...data,
        tenantId,
        projectId,
        ip,
        userAgent,
      },
    });

    // Auto-track realtor link click if code provided
    if (realtorCode && tenantId) {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { tenantId_code: { tenantId, code: realtorCode } },
      });
      if (realtor) {
        await this.trackEvent({
          sessionId: session.id,
          type: 'CLICK',
          category: 'REALTOR_LINK',
          action: 'OPEN_LINK',
          label: `${realtor.name} (${realtor.code})`,
        });
      }
    }

    return session;
  }

  async trackEvent(dto: CreateEventDto) {
    return this.prisma.trackingEvent.create({
      data: {
        ...dto,
      },
    });
  }

  private getSessionWhere(query: TrackingReportQueryDto) {
    const { tenantId, projectId } = query;
    return {
      tenantId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
    };
  }

  async getMostAccessedLots(query: TrackingReportQueryDto) {
    const whereSession = this.getSessionWhere(query);
    return this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: {
        category: 'LOT',
        session: whereSession
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
    const whereSession = this.getSessionWhere(query);
    return this.prisma.trackingEvent.groupBy({
      by: ['path'],
      where: {
        type: 'PAGE_VIEW',
        session: whereSession
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
    const whereSession = this.getSessionWhere(query);
    return this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: {
        category: 'REALTOR_LINK',
        session: whereSession
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
    const whereSession = this.getSessionWhere(query);
    return this.prisma.trackingSession.groupBy({
      by: ['utmSource'],
      where: whereSession,
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
    const whereSession = this.getSessionWhere(query);

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
        where: { category: 'LOT', session: whereSession },
      }),
      this.prisma.trackingEvent.count({
        where: { category: 'REALTOR_LINK', session: whereSession },
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
        take: 10,
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { category: 'LOT', session: whereSession },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { category: 'REALTOR_LINK', session: whereSession },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Enrich UTM Campaigns with Campaign Names if available
    const utmCampaignValues = topUtmCampaigns.map(c => c.utmCampaign).filter(Boolean);
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        tenantId: whereSession.tenantId,
        utmCampaign: { in: (utmCampaignValues as string[]) },
      },
      select: { utmCampaign: true, name: true }
    });

    const enrichedUtmCampaigns = topUtmCampaigns.map(item => {
      const camp = campaigns.find(c => c.utmCampaign === item.utmCampaign);
      return {
        ...item,
        campaignName: camp ? camp.name : null
      };
    });

    return {
      summary: {
        totalSessions,
        totalPageViews,
        totalLotClicks,
        totalRealtorClicks,
      },
      topUtmSources,
      topUtmCampaigns: enrichedUtmCampaigns,
      topLots: topLots.map(l => ({ ...l, lotId: l.label })),
      topRealtors: topRealtors.map(r => ({ ...r, realtorId: r.label, realtorName: r.label })),
    };
  }
}
