import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission, requireProjectAccess } from '../auth.js';
import { logAudit } from '../audit.js';
import { z } from 'zod';

/**
 * Lead tools — list, get, update status, add notes.
 */
export function registerLeadTools(server: McpServer, prisma: PrismaClient) {
  // ─── list_leads ────────────────────────────────────
  server.tool(
    'list_leads',
    'Lista leads de um projeto com filtros por status, período e busca textual.',
    {
      project_id: z.string().describe('ID do projeto'),
      status: z
        .enum([
          'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'RESERVATION',
          'UNDER_REVIEW', 'WAITING_DOCS', 'WAITING_PAYMENT',
          'WON', 'LOST', 'CANCELLED', 'ABANDONED', 'REVERSED'
        ])
        .optional()
        .describe('Filtrar por status'),
      search: z.string().optional().describe('Buscar por nome, email ou telefone'),
      page: z.number().int().min(1).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20)
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'leads:read');
      requireProjectAccess(auth, params.project_id);

      const where: any = {
        tenantId: auth.tenantId,
        projectId: params.project_id
      };
      if (params.status) where.status = params.status;
      if (params.search) {
        const term = params.search.trim();
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term, mode: 'insensitive' } }
        ];
      }

      const [leads, total] = await Promise.all([
        (prisma as any).lead.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            source: true,
            message: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            mapElement: { select: { code: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (params.page - 1) * params.limit,
          take: params.limit
        }),
        (prisma as any).lead.count({ where })
      ]);

      await logAudit(prisma, auth.apiKeyId, 'leads:list', params.project_id, 'Project', {
        resultCount: leads.length
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                data: leads,
                meta: {
                  total,
                  page: params.page,
                  limit: params.limit,
                  totalPages: Math.ceil(total / params.limit)
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

  // ─── get_lead ────────────────────────────────────
  server.tool(
    'get_lead',
    'Busca um lead específico pelo ID com todos os detalhes, pagamentos, documentos e histórico.',
    {
      lead_id: z.string().describe('ID do lead')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'leads:read');

      const lead = await (prisma as any).lead.findFirst({
        where: { id: params.lead_id, tenantId: auth.tenantId },
        include: {
          project: { select: { id: true, name: true, slug: true } },
          mapElement: { select: { code: true, name: true } },
          payments: { orderBy: { dueDate: 'asc' } },
          documents: { orderBy: { createdAt: 'desc' } },
          history: { orderBy: { createdAt: 'desc' }, take: 50 }
        }
      });

      if (!lead) throw new Error(`Lead ${params.lead_id} não encontrado.`);
      requireProjectAccess(auth, lead.projectId);

      await logAudit(prisma, auth.apiKeyId, 'leads:read', params.lead_id, 'Lead');

      return {
        content: [{ type: 'text', text: JSON.stringify(lead, null, 2) }]
      };
    }
  );

  // ─── update_lead_status ────────────────────────────────────
  server.tool(
    'update_lead_status',
    'Atualiza o status de um lead no pipeline de vendas.',
    {
      lead_id: z.string().describe('ID do lead'),
      status: z
        .enum([
          'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATING', 'RESERVATION',
          'UNDER_REVIEW', 'WAITING_DOCS', 'WAITING_PAYMENT',
          'WON', 'LOST', 'CANCELLED', 'ABANDONED', 'REVERSED'
        ])
        .describe('Novo status do lead'),
      notes: z.string().optional().describe('Nota sobre a mudança de status')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'leads:write');

      const lead = await (prisma as any).lead.findFirst({
        where: { id: params.lead_id, tenantId: auth.tenantId },
        select: { id: true, projectId: true, status: true, name: true }
      });
      if (!lead) throw new Error(`Lead ${params.lead_id} não encontrado.`);
      requireProjectAccess(auth, lead.projectId);

      const oldStatus = lead.status;

      await (prisma as any).lead.update({
        where: { id: params.lead_id },
        data: {
          status: params.status,
          notes: params.notes ? lead.notes + '\n' + params.notes : undefined,
          lastContactAt: new Date()
        }
      });

      // Create history entry
      await (prisma as any).leadHistory.create({
        data: {
          leadId: params.lead_id,
          fromStatus: oldStatus,
          toStatus: params.status,
          notes: params.notes || `Status alterado via agente`,
          createdBy: auth.apiKeyId
        }
      });

      await logAudit(prisma, auth.apiKeyId, 'leads:status_update', params.lead_id, 'Lead', {
        from: oldStatus,
        to: params.status
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Status do lead "${lead.name}" alterado de "${oldStatus}" para "${params.status}".`,
              lead_id: params.lead_id,
              status: params.status
            })
          }
        ]
      };
    }
  );

  // ─── add_lead_note ────────────────────────────────────
  server.tool(
    'add_lead_note',
    'Adiciona uma observação/nota a um lead existente.',
    {
      lead_id: z.string().describe('ID do lead'),
      note: z.string().min(1).max(2000).describe('Nota a ser adicionada')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'leads:write');

      const lead = await (prisma as any).lead.findFirst({
        where: { id: params.lead_id, tenantId: auth.tenantId },
        select: { id: true, projectId: true, notes: true, name: true }
      });
      if (!lead) throw new Error(`Lead ${params.lead_id} não encontrado.`);
      requireProjectAccess(auth, lead.projectId);

      const timestamp = new Date().toISOString();
      const newNote = `[${timestamp}] ${params.note}\n${lead.notes || ''}`;

      await (prisma as any).lead.update({
        where: { id: params.lead_id },
        data: { notes: newNote }
      });

      await logAudit(prisma, auth.apiKeyId, 'leads:add_note', params.lead_id, 'Lead', {
        noteLength: params.note.length
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Nota adicionada ao lead "${lead.name}".`,
              lead_id: params.lead_id
            })
          }
        ]
      };
    }
  );
}
