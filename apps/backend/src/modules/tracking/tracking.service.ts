import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@infra/db/prisma.service';
import { CreateSessionDto, CreateEventDto, TrackingReportQueryDto } from './dto/tracking.dto';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(dto: CreateSessionDto, ip?: string, userAgent?: string) {
    const { tenantSlug, projectSlug, realtorCode, ...data } = dto;
    let { tenantId, projectId } = data;

    // Use projectSlug as the primary identifier if available
    // Since slugs are now project-unique
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

    // Resolve tenantId if projectId is present but tenantId is not
    if (projectId && !tenantId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { tenantId: true }
      });
      if (project) {
        tenantId = project.tenantId;
      }
    }

    // Fallback if only tenantSlug is provided (old behavior)
    if (!tenantId && tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (tenant) {
        tenantId = tenant.id;
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
          type: 'REFERRAL',
          category: 'REALTOR_LINK',
          action: 'AUTOMATIC_LANDING',
          label: `${realtor.name} (${realtor.code})`,
        });
      }
    }

    return session;
  }

  async trackEvent(dto: CreateEventDto) {
    // Verify session existence to avoid foreign key errors and allow frontend to clear stale sessions
    const session = await this.prisma.trackingSession.findUnique({
      where: { id: dto.sessionId },
      select: { id: true }
    });

    if (!session) {
      throw new BadRequestException('Invalid session ID');
    }

    return this.prisma.trackingEvent.create({
      data: {
        ...dto,
      },
    });
  }

  private getSessionWhere(query: TrackingReportQueryDto) {
    const { tenantId, projectId, startDate, endDate } = query;
    
    // Use UTC boundaries for consistent filtering regardless of server timezone
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

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
    const { tenantId, projectId, startDate, endDate } = query;
    
    // Use UTC boundaries for consistent filtering regardless of server timezone
    const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : null;

    return {
      session: {
        tenantId,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
      },
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
    const res = await this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    return res.map(r => ({ label: r.label, count: r._count.id }));
  }

  async getPageViews(query: TrackingReportQueryDto) {
    const whereEvent = this.getEventWhere(query, 'PAGE_VIEW');
    const raw = await this.prisma.trackingEvent.groupBy({
      by: ['path', 'label', 'category'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 100,
    });
    return await this.processTopPaths(raw);
  }

  async getRealtorLinkClicks(query: TrackingReportQueryDto) {
    const whereEvent = this.getEventWhere(query, undefined, 'REALTOR_LINK');
    const res = await this.prisma.trackingEvent.groupBy({
      by: ['label'],
      where: whereEvent,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return res.map(r => ({ label: r.label, count: r._count.id }));
  }

  async getLeadSources(query: TrackingReportQueryDto) {
    const whereSession = this.getSessionWhere(query);
    const res = await this.prisma.trackingSession.groupBy({
      by: ['utmSource'],
      where: whereSession,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return res.map(r => ({ utmSource: r.utmSource, count: r._count.id }));
  }

  async getMetrics(query: TrackingReportQueryDto) {
    const whereSession = this.getSessionWhere(query);
    const whereEvent = this.getEventWhere(query);

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
      topLinksRaw,
    ] = await Promise.all([
      this.prisma.trackingSession.count({ where: whereSession }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'PAGE_VIEW' },
      }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'CLICK', category: 'LOT' },
      }),
      this.prisma.trackingEvent.count({
        where: { ...whereEvent, type: 'CLICK', category: 'REALTOR_LINK' },
      }),
      this.prisma.lead.count({ where: whereSession as any }),
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
        take: 50,
      }),
      this.prisma.trackingEvent.groupBy({
        by: ['label'],
        where: { ...whereEvent, category: 'REALTOR_LINK' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 30,
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
      // Page paths - Fetch more to allow in-memory cleaning transition
      this.prisma.trackingEvent.groupBy({
        by: ['path', 'label', 'category'],
        where: { ...whereEvent, type: 'PAGE_VIEW' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 500, // Large number to group query params in-memory
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
        take: 20,
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
          select: { name: true, code: true, project: { select: { name: true } } }
        });
        if (element) {
          finalLotName = element.code || element.name || lotLabel;
          projectName = element.project?.name || '';
        }
      }
      
      if (!projectName) {
        const sampleEvent = await this.prisma.trackingEvent.findFirst({
          where: { ...whereEvent, category: 'LOT', label: l.label },
          select: { session: { select: { project: { select: { name: true } } } } }
        });
        projectName = sampleEvent?.session?.project?.name || '';
      }

      const label = projectName ? `${projectName} - ${finalLotName}` : finalLotName;
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
        totalLeads,
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
      topPaths: await this.processTopPaths(topPathsRaw),
      topLinks: (topLinksRaw || []).map(l => ({ label: l.label || l.path, count: l._count.id })),
    };
  }

  private async processTopPaths(paths: any[]) {
    // Map with label as key to group by their friendly names
    const groupedByLabel = new Map<string, { count: number, path: string }>();

    // 1. Collect all potential IDs for batch lookup
    const potentialIds = new Set<string>();
    for (const p of paths) {
      const rawPath = p.path || '/';
      const cleanPath = rawPath.split('?')[0].split('#')[0];
      const parts = cleanPath.split('/').filter(Boolean);
      const code = parts[parts.length - 1] || (p.label && p.label.startsWith('lote-') ? p.label.split('lote-')[1] : null);
      
      if (code && code.length > 20) {
        potentialIds.add(code);
      }
      
      // Also check if label itself is an ID
      if (p.label && p.label.length > 20) {
        potentialIds.add(p.label);
      }
    }

    // 2. Batch lookup
    const elements = potentialIds.size > 0 
      ? await this.prisma.mapElement.findMany({
          where: { id: { in: Array.from(potentialIds) } },
          select: { id: true, code: true, name: true }
        })
      : [];
    
    const elementMap = new Map(elements.map(e => [e.id, e.code || e.name]));

    for (const p of paths) {
      // Clean query and anchors for grouping
      const rawPath = p.path || '/';
      const cleanPath = rawPath.split('?')[0].split('#')[0];
      
      // Normalize label
      let label = (p.label || cleanPath || 'Visitante').trim();

      // IF IT LOOKS LIKE A NUXT ROUTE NAME (which is what we see in the screenshot)
      const looksLikeRoute = /tenant|project|lote|code/i.test(label) && label.includes('-');
      
      if (looksLikeRoute || label === 'index') {
         // Fix route names back to human readable names
         if (cleanPath.includes('/lote/')) {
            const parts = cleanPath.split('/').filter(Boolean);
            label = `lote-${parts[parts.length - 1]}`;
         } else if (cleanPath.includes('/lote-')) {
            label = `lote-${cleanPath.split('/lote-')[1]}`;
         } else if (cleanPath.includes('/painel')) {
            label = 'Painel Administrativo';
         } else if (cleanPath.split('/').length > 2) {
            // Probably a project root
            const parts = cleanPath.split('/').filter(Boolean);
            label = parts[parts.length - 1] || 'Início';
         } else if (label.includes('lote') || label.includes('code')) {
            label = 'Visualização de Unidade';
         } else {
            label = 'Principal';
         }
      }

      // Final sanitization for lot pages
      if (cleanPath.includes('/lote/') || label.includes('lote-')) {
        const parts = cleanPath.split('/').filter(Boolean);
        // Normalize Lote labels to ensure grouping
        let code = parts[parts.length - 1] || (label.includes('lote-') ? label.split('lote-')[1] : '');
        
        // RESOLVE CUID TO CODE IF POSSIBLE via local map
        if (code && code.length > 20) {
          code = elementMap.get(code) || code;
        }

        if (code) {
           // We want to show the path components as requested: url/empreendimento/lote-01
           const projectSlug = parts[0] || '---';
           label = `${projectSlug}/${code}`;
        }
      } else if (cleanPath.split('/').filter(Boolean).length >= 1) {
         // It's a project path, show as project-slug
         const parts = cleanPath.split('/').filter(Boolean);
         if (parts.length === 1) {
            label = `${parts[0]}`;
         } else if (parts.length === 2) {
            // Likely /projectSlug/unidades or similar
            label = `${parts[0]}/${parts[1]}`;
         }
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
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }
}
