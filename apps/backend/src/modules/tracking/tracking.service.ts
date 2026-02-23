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

    // Improve UTM Detection
    let utmSource = data.utmSource;
    let utmMedium = data.utmMedium;
    let utmCampaign = data.utmCampaign;

    if (!utmSource) {
      if (data.referrer) {
        const ref = data.referrer.toLowerCase();
        if (ref.includes('google.com') || ref.includes('bing.com') || ref.includes('yahoo.com')) {
          utmSource = 'Busca Orgânica';
          utmMedium = 'organic';
        } else if (ref.includes('facebook.com') || ref.includes('t.co') || ref.includes('instagram.com') || ref.includes('linkedin.com')) {
          utmSource = 'Social';
          utmMedium = 'social';
        } else {
          utmSource = 'Referência';
          utmMedium = 'referral';
        }
      } else {
        utmSource = 'Direto';
        utmMedium = 'direct';
      }
    }

    if (!utmCampaign) {
      utmCampaign = '(Nenhuma)';
    }

    const session = await this.prisma.trackingSession.create({
      data: {
        ...data,
        utmSource,
        utmMedium,
        utmCampaign,
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
    const { tenantId, projectId, startDate, endDate } = query;
    const start = startDate ? new Date(startDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    return {
      tenantId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(start || end ? {
        createdAt: {
          ...(start ? { gte: start } : {}),
          ...(end ? { lte: end } : {}),
        },
      } : {}),
    };
  }

  private getEventWhere(query: TrackingReportQueryDto, type?: string, category?: string) {
    const { startDate, endDate } = query;
    const start = startDate ? new Date(startDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    return {
      session: this.getSessionWhere(query),
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(start || end ? {
        timestamp: {
          ...(start ? { gte: start } : {}),
          ...(end ? { lte: end } : {}),
        },
      } : {}),
    };
  }

  // Restore individual report methods for the controller
  async getMostAccessedLots(query: TrackingReportQueryDto) {
    const whereEvent = this.getEventWhere(query, undefined, 'LOT');
    return this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
  }

  async getPageViews(query: TrackingReportQueryDto) {
    const whereEvent = this.getEventWhere(query, 'PAGE_VIEW');
    return this.prisma.trackingEvent.groupBy({
      by: ['path'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  async getRealtorLinkClicks(query: TrackingReportQueryDto) {
    const whereEvent = this.getEventWhere(query, undefined, 'REALTOR_LINK');
    return this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  async getLeadSources(query: TrackingReportQueryDto) {
    const whereSession = this.getSessionWhere(query);
    return this.prisma.trackingSession.groupBy({
      by: ['utmSource'],
      where: whereSession,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
  }

  async getMetrics(query: TrackingReportQueryDto) {
    const whereSession = this.getSessionWhere(query);
    const whereEvent = this.getEventWhere(query);

    const [
      totalSessions,
      totalPageViews,
      totalLotClicks,
      totalRealtorClicks,
      topUtmSources,
      topUtmCampaigns,
      topLots,
      topRealtors,
      dailyStats,
      topProjects,
      topPaths,
    ] = await Promise.all([
      this.prisma.trackingSession.count({ where: whereSession }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'PAGE_VIEW' },
      }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, category: 'LOT' },
      }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, category: 'REALTOR_LINK' },
      }),
      this.prisma.trackingSession.groupBy({
        by: ['utmSource'],
        where: whereSession,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
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
        where: { ...whereEvent, category: 'LOT' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { ...whereEvent, category: 'REALTOR_LINK' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      // Raw daily stats need to be processed manually by date after fetching sessions or using raw query
      this.prisma.trackingSession.findMany({
        where: whereSession,
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
      }),
      // Project stats
      this.prisma.trackingSession.groupBy({
        by: ['projectId'],
        where: { ...whereSession, projectId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      // Page paths
      this.prisma.trackingEvent.groupBy({
        by: ['path'],
        where: { ...whereEvent, type: 'PAGE_VIEW' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Grouping sessions per day
    const history: Record<string, { sessions: number, views: number }> = {};
    dailyStats.forEach(s => {
      const day = s.createdAt.toISOString().split('T')[0];
      if (!history[day]) history[day] = { sessions: 0, views: 0 };
      history[day].sessions++;
    });

    // Also get page view history to correlate
    const viewHistory = await this.prisma.trackingEvent.findMany({
      where: { ...whereEvent, type: 'PAGE_VIEW' },
      select: { timestamp: true }
    });
    viewHistory.forEach(v => {
      const day = v.timestamp.toISOString().split('T')[0];
      if (!history[day]) history[day] = { sessions: 0, views: 0 };
      history[day].views++;
    });

    // Enrich UTM Campaigns with Campaign Names if available
    const utmCampaignValues = topUtmCampaigns.map(c => c.utmCampaign).filter(Boolean);
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        tenantId: whereSession.tenantId,
        utmCampaign: { in: (utmCampaignValues as string[]) },
      },
      select: { utmCampaign: true, name: true }
    });

    const projectIds = topProjects.map(p => p.projectId).filter(Boolean);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: (projectIds as string[]) } },
      select: { id: true, name: true }
    });

    const topLotsProcessed = await Promise.all(topLots.map(async l => {
      let lotLabel = l.label || 'Desconhecido';
      // If it looks like a CUID or ID, try to find the map element code
      if (lotLabel.length > 20) {
        const element = await this.prisma.mapElement.findUnique({
          where: { id: lotLabel },
          select: { name: true, code: true }
        });
        if (element) {
          lotLabel = element.code || element.name || lotLabel;
        }
      }
      return { label: lotLabel, count: l._count.id };
    }));

    return {
      summary: {
        totalSessions,
        totalPageViews,
        totalLotClicks,
        totalRealtorClicks,
      },
      history: Object.keys(history).sort().map(date => ({
        date,
        sessions: history[date].sessions,
        views: history[date].views
      })),
      topUtmSources: topUtmSources.map(s => ({ 
        label: s.utmSource || '(Direto)', 
        count: s._count.id 
      })),
      topUtmCampaigns: topUtmCampaigns.map(item => {
        const camp = campaigns.find(c => c.utmCampaign === item.utmCampaign);
        return {
          label: camp ? camp.name : (item.utmCampaign || '(Nenhuma)'),
          utm: item.utmCampaign,
          count: item._count.id
        };
      }),
      topLots: topLotsProcessed,
      topRealtors: topRealtors.map(r => ({ label: r.label, count: r._count.id })),
      topProjects: topProjects.map(p => {
        const proj = projects.find(pr => pr.id === p.projectId);
        return {
          label: proj ? proj.name : 'Outro',
          count: p._count.id
        };
      }),
      topPaths: topPaths.map(p => ({ label: p.path, count: p._count.id })),
    };
  }
}
