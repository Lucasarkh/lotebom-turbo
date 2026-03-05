import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import {
  CreateSessionDto,
  CreateEventDto,
  TrackingReportQueryDto
} from './dto/tracking.dto';
import { ProjectStatus, MapElementType } from '@prisma/client';
import * as crypto from 'crypto';
import { NotificationsService } from '@modules/notifications/notifications.service';

@Injectable()
export class TrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private hashIp(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }

  private getDeviceType(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (
      /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(
        ua
      )
    ) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Returns high-level dashboard stats for a tenant:
   * project counts, lot/map-element count, lead count.
   */
  async getDashboardStats(
    tenantId: string,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    // If user is a realtor, filter by their realtorLink
    let realtorLinkId: string | undefined;
    if (user?.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id }
      });
      realtorLinkId = realtor?.id || 'none';
    }

    // If user is Imobiliaria, filter by their agency team
    let agencyId: string | undefined;
    if (user?.role === 'IMOBILIARIA') {
      agencyId = user.agencyId;
    }

    // Date range for "last 30 days" stats
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [projects, publishedProjects, totalLots, totalLeads, totalSchedulings, totalSessions, totalRealtors] =
      await Promise.all([
        this.prisma.project.count({ where: { tenantId } }),
        this.prisma.project.count({
          where: { tenantId, status: ProjectStatus.PUBLISHED }
        }),
        this.prisma.mapElement.count({
          where: { tenantId, type: MapElementType.LOT }
        }),
        this.prisma.lead.count({
          where: {
            tenantId,
            ...(realtorLinkId && { realtorLinkId }),
            ...(agencyId && { realtorLink: { user: { agencyId } } })
          }
        }),
        this.prisma.scheduling.count({
          where: {
            tenantId,
            ...(realtorLinkId && { lead: { realtorLinkId } }),
            ...(agencyId && {
              OR: [
                { user: { agencyId } },
                { lead: { realtorLink: { user: { agencyId } } } },
              ],
            }),
          }
        }),
        this.prisma.trackingSession.count({
          where: {
            tenantId,
            lastSeenAt: { gte: thirtyDaysAgo },
            ...(realtorLinkId && { realtorLinkId }),
            ...(agencyId && { realtorLink: { user: { agencyId } } }),
          }
        }),
        agencyId
          ? this.prisma.realtorLink.count({
              where: { tenantId, enabled: true, user: { agencyId } }
            })
          : this.prisma.realtorLink.count({
              where: { tenantId, enabled: true, ...(realtorLinkId && { id: realtorLinkId }) }
            }),
      ]);

    return { projects, publishedProjects, totalLots, totalLeads, totalSchedulings, totalSessions, totalRealtors };
  }

  async createSession(
    dto: CreateSessionDto,
    ip?: string,
    userAgent?: string
  ) {
    const { tenantSlug, projectSlug, realtorCode, sessionId, ...data } = dto;
    let { tenantId, projectId } = data;

    // Resolve IDs
    if (!projectId && projectSlug) {
      const project = await this.prisma.project.findFirst({
        where: { slug: { equals: projectSlug, mode: 'insensitive' } },
        include: { tenant: true }
      });
      if (project) {
        projectId = project.id;
        tenantId = project.tenantId;
      }
    }

    if (!tenantId && tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug }
      });
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    const hashedIp = ip ? this.hashIp(ip) : undefined;
    const deviceType = userAgent ? this.getDeviceType(userAgent) : 'unknown';

    // Normalize UTMs/Source
    let utmSource = data.utmSource;
    let utmMedium = data.utmMedium;
    let utmCampaign = data.utmCampaign;
    let utmContent = data.utmContent || null;
    let utmTerm = data.utmTerm || null;
    let referrer = data.referrer || null;

    if (!utmSource) {
      if (referrer) {
        const ref = referrer.toLowerCase();
        if (
          ref.includes('google.com') ||
          ref.includes('bing.com') ||
          ref.includes('yahoo.com')
        ) {
          utmSource = 'Busca Orgânica';
          utmMedium = 'organic';
        } else if (
          ref.includes('facebook.com') ||
          ref.includes('t.co') ||
          ref.includes('instagram.com') ||
          ref.includes('linkedin.com')
        ) {
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

    if (!utmCampaign) utmCampaign = '(Nenhuma)';

    // 1. Try to find existing session (if it was created in the last 30 days)
    let session = sessionId
      ? await this.prisma.trackingSession.findUnique({
          where: { id: sessionId }
        })
      : null;

    // Check expiration (30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (session && session.lastSeenAt < thirtyDaysAgo) {
      session = null; // Expired
    }

    // 2. Resolve Realtor
    let currentRealtorLinkId: string | null = null;
    if (realtorCode && tenantId) {
      const realtor = await this.prisma.realtorLink.findFirst({
        where: { tenantId, code: realtorCode, enabled: true },
        select: { id: true, name: true, code: true }
      });
      if (realtor) {
        currentRealtorLinkId = realtor.id;
      }
    }

    if (session) {
      // 3. Update Existing Session
      const isNewAttribution =
        (utmSource && utmSource !== session.ltUtmSource) ||
        (utmCampaign && utmCampaign !== session.ltUtmCampaign) ||
        (currentRealtorLinkId &&
          currentRealtorLinkId !== session.realtorLinkId);

      // Check realtor attribution window if no new code is provided
      let realtorIdToUse = currentRealtorLinkId || session.realtorLinkId;
      let lastRealtorAt = currentRealtorLinkId
        ? new Date()
        : session.lastRealtorAt;

      // If we have a realtor stored but it's older than 30 days and no NEW code was provided
      if (
        !currentRealtorLinkId &&
        session.realtorLinkId &&
        session.lastRealtorAt &&
        session.lastRealtorAt < thirtyDaysAgo
      ) {
        realtorIdToUse = null;
        lastRealtorAt = null;
      }

      session = await this.prisma.trackingSession.update({
        where: { id: session.id },
        data: {
          lastSeenAt: new Date(),
          userAgent,
          deviceType,
          ip, // Still store raw IP for legacy, but we have ipHash too
          ipHash: hashedIp,
          // Fill in tenantId/projectId if session was created without them
          ...(!session.tenantId && tenantId ? { tenantId } : {}),
          ...(!session.projectId && projectId ? { projectId } : {}),
          // Update Last-Touch if it changed
          ...(isNewAttribution && {
            ltUtmSource: utmSource,
            ltUtmMedium: utmMedium,
            ltUtmCampaign: utmCampaign,
            ltUtmContent: utmContent,
            ltUtmTerm: utmTerm,
            ltReferrer: referrer,
            // also update main utm fields for compatibility
            utmSource,
            utmMedium,
            utmCampaign,
            utmContent,
            utmTerm,
            referrer
          }),
          realtorLinkId: realtorIdToUse,
          lastRealtorAt
        }
      });
    } else {
      // 4. Create New Session
      session = await this.prisma.trackingSession.create({
        data: {
          tenantId,
          projectId,
          ip,
          ipHash: hashedIp,
          userAgent,
          deviceType,
          landingPage: data.landingPage || null,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          // First Touch
          ftUtmSource: utmSource,
          ftUtmMedium: utmMedium,
          ftUtmCampaign: utmCampaign,
          ftUtmContent: utmContent,
          ftUtmTerm: utmTerm,
          ftReferrer: referrer,
          // Last Touch
          ltUtmSource: utmSource,
          ltUtmMedium: utmMedium,
          ltUtmCampaign: utmCampaign,
          ltUtmContent: utmContent,
          ltUtmTerm: utmTerm,
          ltReferrer: referrer,
          // Compatibility
          utmSource,
          utmMedium,
          utmCampaign,
          utmContent,
          utmTerm,
          referrer,
          // Realtor
          realtorLinkId: currentRealtorLinkId,
          lastRealtorAt: currentRealtorLinkId ? new Date() : null
        }
      });

      // Fire-and-forget: check access milestones for new sessions
      if (tenantId && projectId) {
        this.notifications.onNewSession(tenantId, projectId).catch(() => {});
      }
    }

    // Auto-track realtor link click event if code provided
    if (realtorCode && session.realtorLinkId) {
      await this.trackEvent({
        sessionId: session.id,
        type: 'REFERRAL',
        category: 'REALTOR_LINK',
        action: 'AUTOMATIC_LANDING',
        label: `Corretor Link: ${realtorCode}`
      });
    }

    return session;
  }

  async trackEvent(dto: CreateEventDto) {
    // Verify session existence
    const session = await this.prisma.trackingSession.findUnique({
      where: { id: dto.sessionId },
      select: { id: true, lastSeenAt: true }
    });

    if (!session) {
      throw new BadRequestException('Invalid session ID');
    }

    // UPDATE: Update lastSeenAt on every event
    await this.prisma.trackingSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });

    // DEDUPLICATION: check for similar event in the last 5 seconds to avoid duplicate clicks
    if (dto.type !== 'PAGE_VIEW') {
      const fiveSecondsAgo = new Date();
      fiveSecondsAgo.setSeconds(fiveSecondsAgo.getSeconds() - 5);

      const duplicate = await this.prisma.trackingEvent.findFirst({
        where: {
          sessionId: session.id,
          type: dto.type,
          category: dto.category || null,
          action: dto.action || null,
          label: dto.label || null,
          timestamp: { gte: fiveSecondsAgo }
        },
        select: { id: true }
      });

      if (duplicate) {
        return duplicate; // Skip creation if duplicate
      }
    }

    return this.prisma.trackingEvent.create({
      data: {
        ...dto
      }
    });
  }

  private async getRealtorContextFromUser(user?: { id: string; role: string; agencyId?: string }) {
    if (user?.role === 'CORRETOR') {
      const realtor = await this.prisma.realtorLink.findUnique({
        where: { userId: user.id },
        select: { id: true }
      });
      return { realtorLinkId: realtor?.id || 'none' };
    }
    
    if (user?.role === 'IMOBILIARIA' && user.agencyId) {
      return { agencyId: user.agencyId };
    }
    
    return {};
  }

  private getSessionWhere(
    query: TrackingReportQueryDto,
    context: { realtorLinkId?: string; agencyId?: string } = {}
  ) {
    const { tenantId, projectId, startDate, endDate } = query;

    // Use Brasilia timezone boundaries (UTC-3) for consistent filtering
    const start = startDate ? new Date(`${startDate}T03:00:00.000Z`) : null;
    const end = endDate ? new Date(new Date(`${endDate}T03:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000 - 1) : null;

    return {
      tenantId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
      ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } }),
      ...(start || end
        ? {
            lastSeenAt: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    };
  }

  private getEventWhere(
    query: TrackingReportQueryDto,
    context: { realtorLinkId?: string; agencyId?: string } = {},
    type?: string,
    category?: string
  ) {
    const { tenantId, projectId, startDate, endDate } = query;

    // Use Brasilia timezone boundaries (UTC-3) for consistent filtering
    const start = startDate ? new Date(`${startDate}T03:00:00.000Z`) : null;
    const end = endDate ? new Date(new Date(`${endDate}T03:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000 - 1) : null;

    return {
      session: {
        tenantId,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
        ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
        ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } })
      },
      ...(type ? { type } : {}),
      ...(category ? { category } : {}),
      ...(start || end
        ? {
            timestamp: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {})
            }
          }
        : {})
    };
  }

  // Restore individual report methods for the controller
  async getMostAccessedLots(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereEvent = this.getEventWhere(
      query,
      context,
      undefined,
      'LOT'
    );
    const res = await this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20
    });
    return res.map((r) => ({ label: r.label, count: r._count.id }));
  }

  async getPageViews(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereEvent = this.getEventWhere(query, context, 'PAGE_VIEW');
    const raw = await this.prisma.trackingEvent.groupBy({
      by: ['path', 'label', 'category'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 100
    });
    return await this.processTopPaths(raw, query.tenantId, query.projectId);
  }

  async getRealtorLinkClicks(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereEvent = this.getEventWhere(
      query,
      context,
      undefined,
      'REALTOR_LINK'
    );
    const res = await this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    return res.map((r) => ({ label: r.label, count: r._count.id }));
  }

  async getLeadSources(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);
    const res = await this.prisma.trackingSession.groupBy({
      by: ['utmSource'],
      where: whereSession,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    return res.map((r) => ({ utmSource: r.utmSource, count: r._count.id }));
  }

  async getMetrics(
    query: TrackingReportQueryDto,
    user?: { id: string; role: string; agencyId?: string }
  ) {
    const context = await this.getRealtorContextFromUser(user);
    const whereSession = this.getSessionWhere(query, context);
    const whereEvent = this.getEventWhere(query, context);

    const [
      totalSessions,
      totalPageViews,
      totalLotClicks,
      totalRealtorClicks,
      totalLeads,
      topUtmSources,
      topUtmCampaigns,
      topLots,
      topRealtors,
      dailyStats,
      topProjects,
      topPathsRaw,
      topLinksRaw
    ] = await Promise.all([
      this.prisma.trackingSession.count({ where: whereSession }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'PAGE_VIEW' }
      }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'CLICK', category: 'LOT' }
      }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, category: 'REALTOR_LINK' }
      }),
      this.prisma.lead.count({
        where: {
          tenantId: whereSession.tenantId,
          ...(whereSession.projectId && { projectId: whereSession.projectId }),
          ...(context.realtorLinkId && { realtorLinkId: context.realtorLinkId }),
          ...(context.agencyId && { realtorLink: { agencyId: context.agencyId } })
        } as any
      }),
      this.prisma.trackingSession.groupBy({
        by: ['utmSource'],
        where: whereSession,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      this.prisma.trackingSession.groupBy({
        by: ['utmCampaign'],
        where: whereSession,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { ...whereEvent, category: 'LOT' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 50
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { ...whereEvent, category: 'REALTOR_LINK' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 30
      }),
      // Raw daily stats — use lastSeenAt so returning visitors count on the day they were active
      this.prisma.trackingSession.findMany({
        where: whereSession,
        select: { lastSeenAt: true },
        orderBy: { lastSeenAt: 'asc' }
      }),
      // Project stats
      this.prisma.trackingSession.groupBy({
        by: ['projectId'],
        where: { ...whereSession, projectId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      // Page paths - Fetch more to allow in-memory cleaning transition
      this.prisma.trackingEvent.groupBy({
        by: ['path', 'label', 'category'],
        where: { ...whereEvent, type: 'PAGE_VIEW' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 500 // Large number to group query params in-memory
      }),
      // Other Links - Clicks that are not lots or realtor links
      this.prisma.trackingEvent.groupBy({
        by: ['label', 'path'],
        where: {
          ...whereEvent,
          type: 'CLICK',
          category: { notIn: ['LOT', 'REALTOR_LINK'] }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20
      })
    ]);

    // Grouping sessions per day (by lastSeenAt = day of last activity)
    const history: Record<string, { sessions: number; views: number }> = {};
    dailyStats.forEach((s) => {
      const day = s.lastSeenAt.toISOString().split('T')[0];
      if (!history[day]) history[day] = { sessions: 0, views: 0 };
      history[day].sessions++;
    });

    // Also get page view history to correlate
    const viewHistory = await this.prisma.trackingEvent.findMany({
      where: { ...whereEvent, type: 'PAGE_VIEW' },
      select: { timestamp: true }
    });
    viewHistory.forEach((v) => {
      const day = v.timestamp.toISOString().split('T')[0];
      if (!history[day]) history[day] = { sessions: 0, views: 0 };
      history[day].views++;
    });

    // Enrich UTM Campaigns with Campaign Names if available
    const utmCampaignValues = topUtmCampaigns
      .map((c) => c.utmCampaign)
      .filter(Boolean);
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        tenantId: whereSession.tenantId,
        utmCampaign: { in: utmCampaignValues as string[] }
      },
      select: { utmCampaign: true, name: true }
    });

    const projectIds = topProjects.map((p) => p.projectId).filter(Boolean);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds as string[] } },
      select: { id: true, name: true }
    });

    const lotGroups = new Map<string, number>();
    for (const l of topLots) {
      let lotLabel = l.label || 'Desconhecido';

      // Remove common prefixes
      lotLabel = lotLabel.replace(/^(Lote\s+|lote-|Lote:\s+)/i, '');

      let projectName = '';
      let finalLotName = lotLabel;

      // Try to resolve ID to a friendly name if it looks like a CUID/UUID
      if (lotLabel.length > 20) {
        const element = await this.prisma.mapElement.findUnique({
          where: { id: lotLabel },
          select: {
            name: true,
            code: true,
            project: { select: { name: true } }
          }
        });
        if (element) {
          finalLotName = element.code || element.name || lotLabel;
          projectName = element.project?.name || '';
        }
      }

      if (!projectName) {
        const sampleEvent = await this.prisma.trackingEvent.findFirst({
          where: { ...whereEvent, category: 'LOT', label: l.label },
          select: {
            session: { select: { project: { select: { name: true } } } }
          }
        });
        projectName = sampleEvent?.session?.project?.name || '';
      }

      const label = projectName
        ? `${projectName} - ${finalLotName}`
        : finalLotName;
      const count = lotGroups.get(label) || 0;
      lotGroups.set(label, count + l._count.id);
    }

    const topLotsProcessed = Array.from(lotGroups.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      summary: {
        totalSessions,
        totalPageViews,
        totalLotClicks,
        totalRealtorClicks,
        totalLeads
      },
      history: Object.keys(history)
        .sort()
        .map((date) => ({
          date,
          sessions: history[date].sessions,
          views: history[date].views
        })),
      topUtmSources: topUtmSources.map((s) => ({
        label: s.utmSource || '(Direto)',
        count: s._count.id
      })),
      topUtmCampaigns: topUtmCampaigns.map((item) => {
        const camp = campaigns.find((c) => c.utmCampaign === item.utmCampaign);
        return {
          label: camp ? camp.name : item.utmCampaign || '(Nenhuma)',
          utm: item.utmCampaign,
          count: item._count.id
        };
      }),
      topLots: topLotsProcessed,
      topRealtors: await Promise.all(topRealtors.map(async (r) => {
        let label = r.label || 'Desconhecido';
        if (label.startsWith('Corretor Link: ')) {
          const code = label.replace('Corretor Link: ', '');
          const rl = await this.prisma.realtorLink.findFirst({
            where: { tenantId: whereSession.tenantId as string, code, enabled: true },
            select: { name: true }
          });
          if (rl) {
            label = `${rl.name} (${code})`;
          }
        }
        return {
          label,
          count: r._count.id
        };
      })),
      topProjects: topProjects.map((p) => {
        const proj = projects.find((pr) => pr.id === p.projectId);
        return {
          label: proj ? proj.name : 'Outro',
          count: p._count.id
        };
      }),
      topPaths: await this.processTopPaths(topPathsRaw, query.tenantId, query.projectId),
      topLinks: (topLinksRaw || []).map((l) => ({
        label: l.label || l.path,
        count: l._count.id
      }))
    };
  }

  private async processTopPaths(paths: any[], tenantId?: string, projectId?: string) {
    // Map with label as key to group by their friendly names
    const groupedByLabel = new Map<string, { count: number; path: string }>();

    // 1. Collect all potential IDs for batch lookup
    const potentialIds = new Set<string>();
    const potentialSlugs = new Set<string>();

    // If filtering by specific project, look it up by ID for guaranteed name resolution
    let contextProjectName: string | null = null;
    if (projectId && projectId !== 'all') {
      const contextProject = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true, slug: true }
      });
      if (contextProject) {
        contextProjectName = contextProject.name;
      }
    }

    for (const p of paths) {
      const rawPath = p.path || '/';
      const cleanPath = rawPath.split('?')[0].split('#')[0];
      const parts = cleanPath.split('/').filter(Boolean);

      // Collect potential element IDs (CUIDs are 25+ chars)
      for (const part of parts) {
        if (part && part.length > 20) {
          potentialIds.add(part);
        }
      }

      // Also check if label itself is an ID
      if (p.label && p.label.length > 20) {
        potentialIds.add(p.label);
      }

      // Collect first segment as potential project slug
      if (parts[0] && parts[0].length <= 60 && parts[0] !== 'painel' && parts[0] !== 'login' && parts[0] !== 'undefined') {
        potentialSlugs.add(parts[0]);
      }
    }

    // 2. Batch lookups
    const elements =
      potentialIds.size > 0
        ? await this.prisma.mapElement.findMany({
            where: { id: { in: Array.from(potentialIds) } },
            select: { id: true, code: true, name: true, project: { select: { name: true, slug: true } } }
          })
        : [];

    const elementMap = new Map(elements.map((e) => [e.id, { name: e.code || e.name, projectName: e.project?.name, projectSlug: e.project?.slug }]));

    // Resolve project slugs to names
    const projects =
      potentialSlugs.size > 0
        ? await this.prisma.project.findMany({
            where: { slug: { in: Array.from(potentialSlugs) } },
            select: { slug: true, name: true }
          })
        : [];

    const projectSlugMap = new Map(projects.map((pr) => [pr.slug, pr.name]));

    // If we have a context project and some slugs couldn't be resolved,
    // use the context project name as a fallback for unresolved slugs
    // This handles the case where a project slug was changed after tracking data was recorded
    if (contextProjectName) {
      for (const slug of potentialSlugs) {
        if (!projectSlugMap.has(slug)) {
          projectSlugMap.set(slug, contextProjectName);
        }
      }
    }

    // For global metrics (no specific project filter), also load all tenant projects
    // to maximize resolution of any slugs
    if ((!projectId || projectId === 'all') && tenantId && potentialSlugs.size > 0) {
      const allTenantProjects = await this.prisma.project.findMany({
        where: { tenantId },
        select: { slug: true, name: true }
      });
      for (const p of allTenantProjects) {
        if (!projectSlugMap.has(p.slug)) {
          projectSlugMap.set(p.slug, p.name);
        }
      }
    }

    // Known page sub-paths mapping
    const PAGE_LABELS: Record<string, string> = {
      'unidades': 'Unidades',
      'galeria': 'Galeria',
      'contato': 'Contato',
      'teste': 'Teste',
      'planta': 'Planta',
      'panorama': 'Panorama 360°',
      'obrigado': 'Obrigado',
      'pagamento': 'Pagamento',
    };

    for (const p of paths) {
      // Clean query and anchors for grouping
      const rawPath = p.path || '/';
      const cleanPath = rawPath.split('?')[0].split('#')[0];
      const parts = cleanPath.split('/').filter(Boolean);

      // Skip empty or root paths
      if (parts.length === 0) {
        const existing = groupedByLabel.get('Página Inicial');
        if (existing) {
          existing.count += p._count.id;
        } else {
          groupedByLabel.set('Página Inicial', { count: p._count.id, path: '/' });
        }
        continue;
      }

      // Skip junk: paths containing 'undefined', or painel admin pages
      if (parts.some((pt: string) => pt === 'undefined' || pt === 'null')) {
        continue; // skip garbage entries
      }
      if (parts[0] === 'painel' || parts[0] === 'login') {
        continue; // skip admin/login pages from public metrics
      }

      let label = '';

      // Determine what kind of page this is
      const firstPart = parts[0];
      const projectName = projectSlugMap.get(firstPart);

      if (parts.length === 1) {
        // Just project slug, this is the landing page
        label = projectName ? `${projectName} - Início` : `${firstPart} - Início`;
      } else if (parts.length >= 2) {
        const secondPart = parts[1];

        // Check if second part is a known sub-page
        if (PAGE_LABELS[secondPart]) {
          label = projectName
            ? `${projectName} - ${PAGE_LABELS[secondPart]}`
            : `${firstPart} - ${PAGE_LABELS[secondPart]}`;
        } else if (secondPart.length > 20) {
          // Likely a CUID (lot detail page)
          const elementInfo = elementMap.get(secondPart);
          if (elementInfo) {
            const pName = elementInfo.projectName || projectName || firstPart;
            label = `${pName} - Lote ${elementInfo.name}`;
          } else {
            // Unknown CUID, skip or give generic label
            label = projectName
              ? `${projectName} - Detalhe de Unidade`
              : `${firstPart} - Detalhe de Unidade`;
          }
        } else {
          // Some other sub-page
          label = projectName
            ? `${projectName} - ${secondPart}`
            : `${firstPart}/${secondPart}`;
        }
      }

      if (!label) {
        label = cleanPath;
      }

      // Final TRIM and casing for the Map key to ensure deduplication
      const mapKey = label.trim();

      const existing = groupedByLabel.get(mapKey);
      if (existing) {
        existing.count += p._count.id;
      } else {
        groupedByLabel.set(mapKey, { count: p._count.id, path: cleanPath });
      }
    }

    return Array.from(groupedByLabel.entries())
      .map(([label, data]) => ({ label, path: data.path, count: data.count }))
      .filter((entry) => {
        // Filter out entries with unresolved CUIDs in label
        const hasCuid = /[a-z0-9]{25,}/.test(entry.label);
        return !hasCuid;
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }
}
