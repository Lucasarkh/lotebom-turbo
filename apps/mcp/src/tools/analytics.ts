import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { getAuth, requirePermission, requireProjectAccess } from '../auth.js';
import { logAudit } from '../audit.js';
import { z } from 'zod';

/**
 * Analytics tools — project/lead/lot metrics with period filtering.
 */
export function registerAnalyticsTools(
  server: McpServer,
  prisma: PrismaClient
) {
  // ─── get_project_analytics ────────────────────────────────────
  server.tool(
    'get_project_analytics',
    'Retorna métricas e estatísticas consolidadas de um projeto: pipeline de leads, vendas de lotes, receita, taxas de conversão e atribuição de marketing. Permite filtrar por período (últimos 7d, 30d, 90d, mês atual, ano atual ou período customizado).',
    {
      project_id: z.string().describe('ID do projeto'),
      period: z
        .enum(['last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'this_year', 'all_time', 'custom'])
        .optional()
        .default('all_time')
        .describe('Período de análise'),
      date_from: z
        .string()
        .optional()
        .describe('Data inicial (YYYY-MM-DD). Obrigatório se period=custom.'),
      date_to: z
        .string()
        .optional()
        .describe('Data final (YYYY-MM-DD). Obrigatório se period=custom.')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'projects:read');
      requireProjectAccess(auth, params.project_id);

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: { id: true, name: true, slug: true, status: true, startingPrice: true }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);

      // ── Date range ──
      const now = new Date();
      let dateFrom: Date;
      let dateTo: Date = now;

      switch (params.period) {
        case 'last_7_days':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last_30_days':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last_90_days':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'this_month':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'this_year':
          dateFrom = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (!params.date_from || !params.date_to) {
            throw new Error('Para period=custom, date_from e date_to são obrigatórios.');
          }
          dateFrom = new Date(params.date_from);
          dateTo = new Date(params.date_to + 'T23:59:59.999Z');
          break;
        default:
          dateFrom = new Date(0); // all_time
      }

      const projectWhere = { projectId: params.project_id, tenantId: auth.tenantId };
      const dateFilter = params.period !== 'all_time'
        ? { createdAt: { gte: dateFrom, lte: dateTo } }
        : {};

      // ── Leads ──
      const [leadsInPeriod, leadsByStatus, leadsBySource, leadsWon, leadsTotal] = await Promise.all([
        (prisma as any).lead.findMany({
          where: { ...projectWhere, ...dateFilter },
          select: { status: true, source: true, isRecurrent: true, createdAt: true }
        }),
        (prisma as any).lead.groupBy({
          by: ['status'],
          where: { ...projectWhere, ...dateFilter },
          _count: { _all: true }
        }),
        (prisma as any).lead.groupBy({
          by: ['source'],
          where: { ...projectWhere, ...dateFilter },
          _count: { _all: true }
        }),
        (prisma as any).lead.count({ where: { ...projectWhere, ...dateFilter, status: 'WON' } }),
        (prisma as any).lead.count({ where: projectWhere })
      ]);

      // Status distribution
      const statusMap: Record<string, number> = {};
      leadsByStatus.forEach((g: any) => { statusMap[g.status] = g._count._all; });

      // Source distribution
      const sourceMap: Record<string, number> = {};
      leadsBySource.forEach((g: any) => {
        sourceMap[g.source || '(sem fonte)'] = g._count._all;
      });

      // New vs recurrent
      const newLeads = leadsInPeriod.filter((l: any) => !l.isRecurrent).length;
      const recurrentLeads = leadsInPeriod.filter((l: any) => l.isRecurrent).length;

      // Conversion rate
      const totalInPeriod = leadsInPeriod.length;
      const conversionRate = totalInPeriod > 0
        ? Math.round((leadsWon / totalInPeriod) * 10000) / 100
        : 0;

      // ── Lots ──
      const lotDateFilter = params.period !== 'all_time'
        ? { updatedAt: { gte: dateFrom, lte: dateTo } }
        : {};

      const [lotsByStatus, lotsSoldInPeriod, lotsRevenue] = await Promise.all([
        prisma.lotDetails.groupBy({
          by: ['status'],
          where: projectWhere,
          _count: { _all: true }
        }),
        prisma.lotDetails.count({
          where: { ...projectWhere, status: 'SOLD', ...lotDateFilter }
        }),
        prisma.lotDetails.aggregate({
          where: { ...projectWhere, status: 'SOLD', ...lotDateFilter },
          _sum: { price: true },
          _avg: { price: true, areaM2: true }
        })
      ]);

      const lotStatusMap: Record<string, number> = {};
      lotsByStatus.forEach((g: any) => { lotStatusMap[g.status] = g._count._all; });

      const totalLots = Object.values(lotStatusMap).reduce((a: number, b: number) => a + b, 0);
      const soldLots = lotStatusMap['SOLD'] || 0;
      const reservedLots = lotStatusMap['RESERVED'] || 0;
      const availableLots = lotStatusMap['AVAILABLE'] || 0;

      // ── Pipeline velocity ──
      const avgDaysToClose = await getAvgDaysToClose(prisma, params.project_id, auth.tenantId, dateFrom, dateTo);

      // ── UTM Attribution ──
      const utmSources = await (prisma as any).lead.groupBy({
        by: ['ftUtmSource'],
        where: { ...projectWhere, ...dateFilter, ftUtmSource: { not: null } },
        _count: { _all: true }
      });

      const utmMap: Record<string, number> = {};
      utmSources.forEach((g: any) => {
        if (g.ftUtmSource) utmMap[g.ftUtmSource] = g._count._all;
      });

      // ── Price range distribution ──
      const priceRanges = await getPriceDistribution(prisma, projectWhere);

      await logAudit(prisma, auth.apiKeyId, 'analytics:project', params.project_id, 'Project', {
        period: params.period
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                project: { id: project.id, name: project.name, slug: project.slug },
                period: {
                  type: params.period,
                  from: dateFrom.toISOString(),
                  to: dateTo.toISOString()
                },
                leads: {
                  total_all_time: leadsTotal,
                  total_in_period: totalInPeriod,
                  new: newLeads,
                  recurrent: recurrentLeads,
                  won: leadsWon,
                  conversion_rate_percent: conversionRate,
                  by_status: statusMap,
                  by_source: sourceMap,
                  utm_sources: utmMap
                },
                lots: {
                  total: totalLots,
                  available: availableLots,
                  reserved: reservedLots,
                  sold: soldLots,
                  sold_in_period: lotsSoldInPeriod,
                  revenue: lotsRevenue._sum.price
                    ? Number(lotsRevenue._sum.price)
                    : 0,
                  avg_price: lotsRevenue._avg.price
                    ? Number(lotsRevenue._avg.price)
                    : null,
                  avg_area_m2: lotsRevenue._avg.areaM2
                    ? Math.round(Number(lotsRevenue._avg.areaM2))
                    : null,
                  by_status: lotStatusMap,
                  by_price_range: priceRanges
                },
                pipeline: {
                  avg_days_to_close: avgDaysToClose
                }
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── get_lead_funnel ────────────────────────────────────
  server.tool(
    'get_lead_funnel',
    'Retorna o funil de vendas completo: quantos leads em cada etapa do pipeline, taxas de conversão entre etapas, e tempo médio em cada fase. Permite filtrar por período.',
    {
      project_id: z.string().describe('ID do projeto'),
      period: z
        .enum(['last_7_days', 'last_30_days', 'last_90_days', 'this_month', 'all_time'])
        .optional()
        .default('all_time')
        .describe('Período de análise')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'leads:read');
      requireProjectAccess(auth, params.project_id);

      const now = new Date();
      let dateFrom: Date = new Date(0);
      switch (params.period) {
        case 'last_7_days': dateFrom = new Date(now.getTime() - 7 * 86400000); break;
        case 'last_30_days': dateFrom = new Date(now.getTime() - 30 * 86400000); break;
        case 'last_90_days': dateFrom = new Date(now.getTime() - 90 * 86400000); break;
        case 'this_month': dateFrom = new Date(now.getFullYear(), now.getMonth(), 1); break;
      }

      const projectWhere = { projectId: params.project_id, tenantId: auth.tenantId };

      // Funnel stages in order
      const stages = [
        'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING',
        'RESERVATION', 'UNDER_REVIEW', 'WAITING_DOCS',
        'WAITING_PAYMENT', 'WON'
      ];

      const [statusCounts, leadsCreated, leadsWon, leadsLost, historyEntries] = await Promise.all([
        (prisma as any).lead.groupBy({
          by: ['status'],
          where: projectWhere,
          _count: { _all: true }
        }),
        (prisma as any).lead.count({
          where: {
            ...projectWhere,
            createdAt: params.period !== 'all_time' ? { gte: dateFrom } : undefined
          }
        }),
        (prisma as any).lead.count({
          where: {
            ...projectWhere,
            status: 'WON',
            updatedAt: params.period !== 'all_time' ? { gte: dateFrom } : undefined
          }
        }),
        (prisma as any).lead.count({
          where: {
            ...projectWhere,
            status: 'LOST',
            updatedAt: params.period !== 'all_time' ? { gte: dateFrom } : undefined
          }
        }),
        (prisma as any).leadHistory.findMany({
          where: {
            lead: { ...projectWhere },
            ...(params.period !== 'all_time'
              ? { createdAt: { gte: dateFrom } }
              : {})
          },
          select: { fromStatus: true, toStatus: true, createdAt: true, leadId: true },
          orderBy: { createdAt: 'asc' }
        })
      ]);

      // Current counts per stage
      const currentCounts: Record<string, number> = {};
      statusCounts.forEach((g: any) => { currentCounts[g.status] = g._count._all; });

      // Conversion between stages (based on history transitions)
      const transitions: Record<string, number> = {};
      historyEntries.forEach((h: any) => {
        const key = `${h.fromStatus}→${h.toStatus}`;
        transitions[key] = (transitions[key] || 0) + 1;
      });

      // Funnel with conversion rates
      const funnel = stages.map((stage, idx) => {
        const count = currentCounts[stage] || 0;
        const prevStage = idx > 0 ? stages[idx - 1] : null;
        const prevCount = prevStage ? (currentCounts[prevStage] || 0) : null;
        const rate = prevCount && prevCount > 0
          ? Math.round((count / prevCount) * 10000) / 100
          : null;
        return { stage, count, conversion_from_previous_percent: rate };
      });

      // Add LOST at the end
      const lostCount = currentCounts['LOST'] || 0;
      const winRate = (leadsCreated > 0)
        ? Math.round((leadsWon / leadsCreated) * 10000) / 100
        : 0;

      await logAudit(prisma, auth.apiKeyId, 'analytics:funnel', params.project_id, 'Project', {
        period: params.period
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                period: params.period,
                total_created: leadsCreated,
                won: leadsWon,
                lost: lostCount,
                win_rate_percent: winRate,
                funnel,
                transitions: Object.entries(transitions)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 20)
                  .map(([key, count]) => ({ transition: key, count }))
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── get_lot_analytics ────────────────────────────────────
  server.tool(
    'get_lot_analytics',
    'Retorna análise detalhada dos lotes: distribuição por status, categoria, quadra, faixa de preço, área e topografia. Inclui estatísticas de preço/m².',
    {
      project_id: z.string().describe('ID do projeto')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:read');
      requireProjectAccess(auth, params.project_id);

      const projectWhere = { projectId: params.project_id, tenantId: auth.tenantId };

      const [
        byStatus,
        byCategory,
        byBlock,
        bySlope,
        priceStats,
        allLots
      ] = await Promise.all([
        prisma.lotDetails.groupBy({
          by: ['status'],
          where: projectWhere,
          _count: { _all: true },
          _sum: { price: true }
        }),
        prisma.lotDetails.groupBy({
          by: ['categoryId'],
          where: projectWhere,
          _count: { _all: true },
          _avg: { price: true, areaM2: true }
        }),
        prisma.lotDetails.groupBy({
          by: ['block'],
          where: { ...projectWhere, block: { not: null } },
          _count: { _all: true },
          _avg: { price: true }
        }),
        prisma.lotDetails.groupBy({
          by: ['slope'],
          where: projectWhere,
          _count: { _all: true }
        }),
        prisma.lotDetails.aggregate({
          where: { ...projectWhere, status: 'AVAILABLE' },
          _min: { price: true, pricePerM2: true, areaM2: true },
          _max: { price: true, pricePerM2: true, areaM2: true },
          _avg: { price: true, pricePerM2: true, areaM2: true }
        }),
        prisma.lotDetails.findMany({
          where: projectWhere,
          select: {
            id: true,
            status: true,
            price: true,
            areaM2: true,
            pricePerM2: true,
            block: true,
            categoryId: true
          },
          orderBy: { price: 'desc' }
        })
      ]);

      // Category names
      const catIds = [...new Set(byCategory.map((g: any) => g.categoryId).filter(Boolean))];
      const categories = catIds.length > 0
        ? await prisma.lotCategory.findMany({
            where: { id: { in: catIds } },
            select: { id: true, name: true }
          })
        : [];
      const catNameMap: Record<string, string> = {};
      categories.forEach((c: any) => { catNameMap[c.id] = c.name; });

      // Build price ranges
      const priceRanges = [
        { label: 'Até R$ 100k', min: 0, max: 100000 },
        { label: 'R$ 100k - 200k', min: 100000, max: 200000 },
        { label: 'R$ 200k - 300k', min: 200000, max: 300000 },
        { label: 'R$ 300k - 500k', min: 300000, max: 500000 },
        { label: 'Acima de R$ 500k', min: 500000, max: Infinity }
      ];
      const priceRangeCounts = priceRanges.map(r => ({
        range: r.label,
        count: allLots.filter((l: any) => {
          const p = Number(l.price || 0);
          return p >= r.min && p < r.max;
        }).length
      }));

      // Area ranges
      const areaRanges = [
        { label: 'Até 200m²', min: 0, max: 200 },
        { label: '200-300m²', min: 200, max: 300 },
        { label: '300-500m²', min: 300, max: 500 },
        { label: 'Acima de 500m²', min: 500, max: Infinity }
      ];
      const areaRangeCounts = areaRanges.map(r => ({
        range: r.label,
        count: allLots.filter((l: any) => {
          const a = l.areaM2 || 0;
          return a >= r.min && a < r.max;
        }).length
      }));

      const slopeMap: Record<string, string> = {
        FLAT: 'Plano', UPHILL: 'Aclive', DOWNHILL: 'Declive'
      };

      await logAudit(prisma, auth.apiKeyId, 'analytics:lots', params.project_id, 'Project');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                total_lots: allLots.length,
                by_status: byStatus.map((g: any) => ({
                  status: g.status,
                  count: g._count._all,
                  total_value: g._sum.price ? Number(g._sum.price) : 0
                })),
                by_category: byCategory
                  .filter((g: any) => g.categoryId)
                  .map((g: any) => ({
                    category: catNameMap[g.categoryId] || g.categoryId,
                    count: g._count._all,
                    avg_price: g._avg.price ? Math.round(Number(g._avg.price)) : null,
                    avg_area_m2: g._avg.areaM2 ? Math.round(Number(g._avg.areaM2)) : null
                  })),
                by_block: byBlock.map((g: any) => ({
                  block: g.block,
                  count: g._count._all,
                  avg_price: g._avg.price ? Math.round(Number(g._avg.price)) : null
                })),
                by_slope: bySlope.map((g: any) => ({
                  slope: slopeMap[g.slope] || g.slope,
                  count: g._count._all
                })),
                price_stats_available: {
                  min: priceStats._min.price ? Number(priceStats._min.price) : null,
                  max: priceStats._max.price ? Number(priceStats._max.price) : null,
                  avg: priceStats._avg.price ? Math.round(Number(priceStats._avg.price)) : null,
                  min_per_m2: priceStats._min.pricePerM2 ? Number(priceStats._min.pricePerM2) : null,
                  max_per_m2: priceStats._max.pricePerM2 ? Number(priceStats._max.pricePerM2) : null,
                  avg_per_m2: priceStats._avg.pricePerM2 ? Math.round(Number(priceStats._avg.pricePerM2)) : null,
                  min_area_m2: priceStats._min.areaM2 || null,
                  max_area_m2: priceStats._max.areaM2 || null,
                  avg_area_m2: priceStats._avg.areaM2 ? Math.round(Number(priceStats._avg.areaM2)) : null
                },
                by_price_range: priceRangeCounts.filter(r => r.count > 0),
                by_area_range: areaRangeCounts.filter(r => r.count > 0)
              },
              null,
              2
            )
          }
        ]
      };
    }
  );
}

// ─── Helpers ──────────────────────────────────────────────
async function getAvgDaysToClose(
  prisma: PrismaClient,
  projectId: string,
  tenantId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<number | null> {
  const wonLeads = await (prisma as any).lead.findMany({
    where: {
      projectId,
      tenantId,
      status: 'WON',
      updatedAt: { gte: dateFrom, lte: dateTo }
    },
    select: { id: true, createdAt: true, updatedAt: true }
  });

  if (wonLeads.length === 0) return null;

  const totalDays = wonLeads.reduce((sum: number, l: any) => {
    return sum + (l.updatedAt.getTime() - l.createdAt.getTime()) / 86400000;
  }, 0);

  return Math.round(totalDays / wonLeads.length);
}

async function getPriceDistribution(
  prisma: PrismaClient,
  where: any
): Promise<Record<string, { count: number; percent: number }>> {
  const lots = await prisma.lotDetails.findMany({
    where: { ...where, price: { not: null } },
    select: { price: true }
  });

  const ranges = [
    { key: '0-100k', min: 0, max: 100000 },
    { key: '100k-200k', min: 100000, max: 200000 },
    { key: '200k-300k', min: 200000, max: 300000 },
    { key: '300k-500k', min: 300000, max: 500000 },
    { key: '500k+', min: 500000, max: Infinity }
  ];

  const total = lots.length;
  const result: Record<string, { count: number; percent: number }> = {};

  ranges.forEach(r => {
    const count = lots.filter((l: any) => {
      const p = Number(l.price);
      return p >= r.min && p < r.max;
    }).length;
    if (count > 0) {
      result[r.key] = {
        count,
        percent: Math.round((count / total) * 10000) / 100
      };
    }
  });

  return result;
}
