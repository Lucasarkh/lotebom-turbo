import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { getAuth, requirePermission } from '../auth.js';
import { logAudit } from '../audit.js';
import { z } from 'zod';

/**
 * Tenant tools — get tenant info and project-level agent status.
 */
export function registerTenantTools(
  server: McpServer,
  prisma: PrismaClient
) {
  // ─── get_tenant_info ────────────────────────────────────
  server.tool(
    'get_tenant_info',
    'Retorna informações do tenant (loteadora) vinculado à chave API, incluindo nome, slug, dados de contato, status de faturamento e total de projetos.',
    {},
    async () => {
      const auth = await getAuth(prisma);
      // No specific permission needed — always allowed

      const tenant = await prisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          customDomain: true,
          isActive: true,
          creci: true,
          phone: true,
          publicEmail: true,
          website: true,
          billingStatus: true,
          _count: { select: { projects: true, users: true } }
        }
      });

      await logAudit(prisma, auth.apiKeyId, 'tenant:info', null, 'Tenant');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                tenant,
                agent_context: {
                  key_name: auth.keyName,
                  permissions: auth.permissions,
                  project_scope: auth.projectIds.length === 0 ? 'ALL' : auth.projectIds,
                  project_count: auth.projectIds.length === 0
                    ? tenant?._count.projects
                    : auth.projectIds.length
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

  // ─── check_agent_access ────────────────────────────────────
  server.tool(
    'check_agent_access',
    'Verifica se um projeto tem edição agentica (MCP) habilitada e retorna o status atual.',
    {
      project_id: z.string().describe('ID do projeto a verificar')
    },
    async (params) => {
      const auth = await getAuth(prisma);

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          agentEnabled: true,
          aiEnabled: true,
          status: true,
          _count: { select: { lotDetails: true, leads: true } }
        }
      });

      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado no seu tenant.`);

      const inScope =
        auth.projectIds.length === 0 || auth.projectIds.includes(params.project_id);

      await logAudit(prisma, auth.apiKeyId, 'agent:check_access', params.project_id, 'Project');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                project,
                access: {
                  in_api_key_scope: inScope,
                  agent_enabled: project.agentEnabled,
                  can_edit: inScope && project.agentEnabled,
                  permissions: auth.permissions
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

  // ─── get_project_stats ────────────────────────────────────
  server.tool(
    'get_project_stats',
    'Retorna estatísticas resumidas de um projeto: quantidade de lotes por status, faixa de preços e áreas, total de leads.',
    {
      project_id: z.string().describe('ID do projeto')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'projects:read');

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: { id: true, name: true, slug: true }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);

      const [statusGroups, priceAgg, areaAgg, leadCount, categoryCount] = await Promise.all([
        (prisma as any).lotDetails.groupBy({
          by: ['status'],
          where: { projectId: params.project_id, tenantId: auth.tenantId },
          _count: { _all: true }
        }),
        (prisma as any).lotDetails.aggregate({
          where: { projectId: params.project_id, tenantId: auth.tenantId, status: 'AVAILABLE' },
          _min: { price: true },
          _max: { price: true },
          _avg: { price: true }
        }),
        (prisma as any).lotDetails.aggregate({
          where: { projectId: params.project_id, tenantId: auth.tenantId, status: 'AVAILABLE' },
          _min: { areaM2: true },
          _max: { areaM2: true },
          _avg: { areaM2: true }
        }),
        (prisma as any).lead.count({
          where: { projectId: params.project_id, tenantId: auth.tenantId }
        }),
        prisma.lotCategory.count({
          where: { projectId: params.project_id, tenantId: auth.tenantId }
        })
      ]);

      const statusMap: Record<string, number> = {};
      statusGroups.forEach((g: any) => {
        statusMap[g.status] = g._count._all;
      });

      await logAudit(prisma, auth.apiKeyId, 'projects:stats', params.project_id, 'Project');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                project: { id: project.id, name: project.name, slug: project.slug },
                lots_by_status: {
                  available: statusMap['AVAILABLE'] || 0,
                  reserved: statusMap['RESERVED'] || 0,
                  sold: statusMap['SOLD'] || 0,
                  total: Object.values(statusMap).reduce((a: number, b: number) => a + b, 0)
                },
                price_range_available: {
                  min: priceAgg._min.price,
                  max: priceAgg._max.price,
                  avg: priceAgg._avg.price
                },
                area_range_available: {
                  min_m2: areaAgg._min.areaM2,
                  max_m2: areaAgg._max.areaM2,
                  avg_m2: areaAgg._avg.areaM2
                },
                categories: categoryCount,
                total_leads: leadCount
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
