import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission, requireProjectAccess } from '../auth.js';
import { logAudit } from '../audit.js';
import { z } from 'zod';

/**
 * Project tools — create, read, update, publish, delete projects.
 */
export function registerProjectTools(
  server: McpServer,
  prisma: PrismaClient
) {
  // ─── list_projects ────────────────────────────────────
  server.tool(
    'list_projects',
    'Lista todos os projetos (loteamentos) do tenant. Retorna ID, nome, slug, status, se o agente está habilitado, se IA está habilitada e datas.',
    {
      status: z
        .enum(['DRAFT', 'PUBLISHED'])
        .optional()
        .describe('Filtrar por status do projeto'),
      page: z.number().int().min(1).optional().default(1).describe('Número da página'),
      limit: z.number().int().min(1).max(100).optional().default(20).describe('Itens por página')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'projects:read');

      const where: any = { tenantId: auth.tenantId };
      if (params.status) where.status = params.status;
      if (auth.projectIds.length > 0) where.id = { in: auth.projectIds };

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            description: true,
            address: true,
            agentEnabled: true,
            aiEnabled: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' },
          skip: (params.page - 1) * params.limit,
          take: params.limit
        }),
        prisma.project.count({ where })
      ]);

      await logAudit(prisma, auth.apiKeyId, 'projects:list', null, 'Project', {
        status: params.status,
        resultCount: projects.length
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                data: projects,
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

  // ─── get_project ────────────────────────────────────
  server.tool(
    'get_project',
    'Busca um projeto específico pelo ID e retorna todos os seus dados detalhados.',
    {
      project_id: z.string().describe('ID do projeto (cuid)')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'projects:read');
      requireProjectAccess(auth, params.project_id);

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        include: {
          lotCategories: { select: { id: true, name: true, slug: true, sortOrder: true } },
          _count: {
            select: {
              lotDetails: true,
              leads: true,
              mapElements: true
            }
          }
        }
      });

      if (!project) {
        throw new Error(`Projeto ${params.project_id} não encontrado.`);
      }

      await logAudit(prisma, auth.apiKeyId, 'projects:read', project.id, 'Project');

      return {
        content: [{ type: 'text', text: JSON.stringify(project, null, 2) }]
      };
    }
  );

  // ─── create_project ────────────────────────────────────
  server.tool(
    'create_project',
    'Cria um novo projeto (loteamento) no tenant. Gera slug automaticamente a partir do nome.',
    {
      name: z.string().min(2).max(200).describe('Nome do loteamento'),
      description: z.string().optional().describe('Descrição do projeto'),
      address: z.string().optional().describe('Endereço completo'),
      latitude: z.number().min(-90).max(90).optional().describe('Latitude geográfica'),
      longitude: z.number().min(-180).max(180).optional().describe('Longitude geográfica'),
      starting_price: z.number().optional().describe('Preço inicial (R$)'),
      max_installments: z.number().int().min(1).max(600).optional().describe('Máximo de parcelas'),
      reservation_fee: z.number().optional().describe('Valor da taxa de reserva (R$)'),
      agent_enabled: z.boolean().optional().describe('Habilitar edição agentica (MCP)')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'projects:write');

      // Generate slug from name
      const slug = params.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Ensure unique slug
      let finalSlug = slug;
      let suffix = 1;
      while (await prisma.project.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${suffix}`;
        suffix++;
      }

      const project = await prisma.project.create({
        data: {
          tenantId: auth.tenantId,
          name: params.name,
          slug: finalSlug,
          description: params.description || null,
          address: params.address || null,
          latitude: params.latitude || null,
          longitude: params.longitude || null,
          startingPrice: params.starting_price || null,
          maxInstallments: params.max_installments || null,
          reservationFeeValue: params.reservation_fee || 500,
          agentEnabled: params.agent_enabled ?? false,
          status: 'DRAFT'
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          agentEnabled: true,
          createdAt: true
        }
      });

      await logAudit(prisma, auth.apiKeyId, 'projects:create', project.id, 'Project', {
        name: params.name
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Projeto criado com sucesso.',
                project
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── update_project ────────────────────────────────────
  server.tool(
    'update_project',
    'Atualiza dados de um projeto existente. Envie apenas os campos que deseja alterar.',
    {
      project_id: z.string().describe('ID do projeto'),
      name: z.string().min(2).max(200).optional().describe('Novo nome'),
      description: z.string().optional().describe('Nova descrição'),
      address: z.string().optional().describe('Novo endereço'),
      status: z.enum(['DRAFT', 'PUBLISHED']).optional().describe('Status'),
      latitude: z.number().min(-90).max(90).optional().describe('Latitude'),
      longitude: z.number().min(-180).max(180).optional().describe('Longitude'),
      starting_price: z.number().optional().describe('Preço inicial'),
      max_installments: z.number().int().optional().describe('Máx. parcelas'),
      reservation_fee: z.number().optional().describe('Taxa de reserva (R$)'),
      agent_enabled: z.boolean().optional().describe('Habilitar/desabilitar edição agentica'),
      ai_enabled: z.boolean().optional().describe('Habilitar/desabilitar chat IA'),
      show_payment_conditions: z.boolean().optional().describe('Mostrar condições de pagamento'),
      pre_launch_enabled: z.boolean().optional().describe('Habilitar pré-lançamento'),
      banner_image_url: z.string().optional().describe('URL da imagem banner'),
      youtube_video_url: z.string().optional().describe('URL do vídeo do YouTube'),
      location_text: z.string().optional().describe('Texto sobre localização'),
      google_maps_url: z.string().optional().describe('URL do Google Maps'),
      legal_notice: z.string().optional().describe('Aviso legal')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'projects:write');
      requireProjectAccess(auth, params.project_id);

      // Check agent permission on project
      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: { id: true, agentEnabled: true }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);
      if (!project.agentEnabled) {
        throw new Error(
          `❌ Edição agentica desabilitada para este projeto.\n\n` +
            `O projeto "${params.project_id}" tem agentEnabled = false.\n` +
            'Acesse o painel Lotio e habilite "Edição por Agente" nas configurações do projeto.'
        );
      }

      const { project_id, ...updateFields } = params;
      // Clean undefined values
      const data: any = {};
      for (const [key, value] of Object.entries(updateFields)) {
        if (value !== undefined) data[key] = value;
      }

      const updated = await prisma.project.update({
        where: { id: params.project_id },
        data,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          description: true,
          address: true,
          agentEnabled: true,
          aiEnabled: true,
          latitude: true,
          longitude: true,
          startingPrice: true,
          maxInstallments: true,
          reservationFeeValue: true,
          preLaunchEnabled: true,
          updatedAt: true
        }
      });

      await logAudit(
        prisma,
        auth.apiKeyId,
        'projects:update',
        params.project_id,
        'Project',
        { updatedFields: Object.keys(data) }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { message: 'Projeto atualizado com sucesso.', project: updated },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── publish_project ────────────────────────────────────
  server.tool(
    'publish_project',
    'Publica um projeto (muda status de DRAFT para PUBLISHED).',
    {
      project_id: z.string().describe('ID do projeto')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'projects:write');
      requireProjectAccess(auth, params.project_id);

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);
      if (!project.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      await prisma.project.update({
        where: { id: params.project_id },
        data: { status: 'PUBLISHED' }
      });

      await logAudit(prisma, auth.apiKeyId, 'projects:publish', params.project_id, 'Project');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Projeto "${project.name}" publicado com sucesso.`,
              project_id: params.project_id,
              status: 'PUBLISHED'
            })
          }
        ]
      };
    }
  );

  // ─── unpublish_project ────────────────────────────────────
  server.tool(
    'unpublish_project',
    'Despublica um projeto (volta para DRAFT).',
    {
      project_id: z.string().describe('ID do projeto')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'projects:write');
      requireProjectAccess(auth, params.project_id);

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);
      if (!project.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      await prisma.project.update({
        where: { id: params.project_id },
        data: { status: 'DRAFT' }
      });

      await logAudit(prisma, auth.apiKeyId, 'projects:unpublish', params.project_id, 'Project');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Projeto "${project.name}" despublicado com sucesso.`,
              status: 'DRAFT'
            })
          }
        ]
      };
    }
  );

  // ─── delete_project ────────────────────────────────────
  server.tool(
    'delete_project',
    'Remove permanentemente um projeto e todos os seus dados. ⚠️ Esta ação é irreversível.',
    {
      project_id: z.string().describe('ID do projeto'),
      confirm: z.boolean().describe('Confirme com true para prosseguir com a exclusão')
    },
    async (params) => {
      if (!params.confirm) {
        throw new Error('Confirmação necessária. Passe confirm: true para excluir.');
      }

      const auth = await authenticate(prisma);
      requirePermission(auth, 'projects:write');
      requireProjectAccess(auth, params.project_id);

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: { id: true, name: true, agentEnabled: true }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);
      if (!project.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      await prisma.project.delete({ where: { id: params.project_id } });

      await logAudit(prisma, auth.apiKeyId, 'projects:delete', params.project_id, 'Project', {
        name: project.name
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Projeto "${project.name}" removido permanentemente.`,
              project_id: params.project_id
            })
          }
        ]
      };
    }
  );
}
