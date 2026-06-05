import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { getAuth, requirePermission, requireProjectAccess } from '../auth.js';
import { logAudit } from '../audit.js';
import { z } from 'zod';

/**
 * Lot Category tools — list, create, update, delete categories.
 */
export function registerCategoryTools(
  server: McpServer,
  prisma: PrismaClient
) {
  // ─── list_categories ────────────────────────────────────
  server.tool(
    'list_lot_categories',
    'Lista todas as categorias de lote de um projeto com contagem de lotes por status.',
    {
      project_id: z.string().describe('ID do projeto')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:read');
      requireProjectAccess(auth, params.project_id);

      const categories = await prisma.lotCategory.findMany({
        where: { tenantId: auth.tenantId, projectId: params.project_id },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          lots: { select: { id: true, status: true } }
        }
      });

      const formatted = categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image_url: cat.imageUrl,
        sort_order: cat.sortOrder,
        lot_count: {
          total: cat.lots.length,
          available: cat.lots.filter((l: any) => l.status === 'AVAILABLE').length,
          reserved: cat.lots.filter((l: any) => l.status === 'RESERVED').length,
          sold: cat.lots.filter((l: any) => l.status === 'SOLD').length
        },
        created_at: cat.createdAt
      }));

      await logAudit(prisma, auth.apiKeyId, 'categories:list', params.project_id, 'Project');

      return {
        content: [{ type: 'text', text: JSON.stringify(formatted, null, 2) }]
      };
    }
  );

  // ─── create_category ────────────────────────────────────
  server.tool(
    'create_lot_category',
    'Cria uma nova categoria de lote em um projeto.',
    {
      project_id: z.string().describe('ID do projeto'),
      name: z.string().min(1).max(100).describe('Nome da categoria (ex: "Premium", "Standard")'),
      description: z.string().optional().describe('Descrição da categoria')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:write');
      requireProjectAccess(auth, params.project_id);

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: { agentEnabled: true, name: true }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);
      if (!project.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      // Generate slug
      const slug = params.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Ensure unique slug
      let finalSlug = slug;
      let suffix = 1;
      while (
        await prisma.lotCategory.findFirst({
          where: { projectId: params.project_id, slug: finalSlug }
        })
      ) {
        finalSlug = `${slug}-${suffix}`;
        suffix++;
      }

      const maxSort = await prisma.lotCategory.aggregate({
        where: { projectId: params.project_id },
        _max: { sortOrder: true }
      });

      const category = await prisma.lotCategory.create({
        data: {
          tenantId: auth.tenantId,
          projectId: params.project_id,
          name: params.name,
          slug: finalSlug,
          description: params.description || null,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1
        }
      });

      await logAudit(prisma, auth.apiKeyId, 'categories:create', category.id, 'LotCategory', {
        name: params.name
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { message: 'Categoria criada com sucesso.', category },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── update_category ────────────────────────────────────
  server.tool(
    'update_lot_category',
    'Atualiza nome ou descrição de uma categoria de lote.',
    {
      category_id: z.string().describe('ID da categoria'),
      name: z.string().min(1).max(100).optional().describe('Novo nome'),
      description: z.string().optional().describe('Nova descrição')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:write');

      const category = await prisma.lotCategory.findFirst({
        where: { id: params.category_id, tenantId: auth.tenantId },
        select: { id: true, projectId: true }
      });
      if (!category) throw new Error(`Categoria ${params.category_id} não encontrada.`);
      requireProjectAccess(auth, category.projectId);

      const project = await prisma.project.findFirst({
        where: { id: category.projectId },
        select: { agentEnabled: true }
      });
      if (!project?.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      const updated = await prisma.lotCategory.update({
        where: { id: params.category_id },
        data: {
          ...(params.name ? { name: params.name } : {}),
          ...(params.description !== undefined
            ? { description: params.description }
            : {})
        }
      });

      await logAudit(
        prisma,
        auth.apiKeyId,
        'categories:update',
        params.category_id,
        'LotCategory'
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { message: 'Categoria atualizada.', category: updated },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── delete_category ────────────────────────────────────
  server.tool(
    'delete_lot_category',
    'Remove uma categoria de lote. Lotes nesta categoria ficarão sem categoria. ⚠️ Não pode ser desfeito.',
    {
      category_id: z.string().describe('ID da categoria'),
      confirm: z.boolean().describe('Confirme com true')
    },
    async (params) => {
      if (!params.confirm) {
        throw new Error('Confirme com true para excluir.');
      }

      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:write');

      const category = await prisma.lotCategory.findFirst({
        where: { id: params.category_id, tenantId: auth.tenantId },
        select: { id: true, projectId: true, name: true }
      });
      if (!category) throw new Error(`Categoria ${params.category_id} não encontrada.`);
      requireProjectAccess(auth, category.projectId);

      const project = await prisma.project.findFirst({
        where: { id: category.projectId },
        select: { agentEnabled: true }
      });
      if (!project?.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      await prisma.lotCategory.delete({ where: { id: params.category_id } });

      await logAudit(
        prisma,
        auth.apiKeyId,
        'categories:delete',
        params.category_id,
        'LotCategory',
        { name: category.name }
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Categoria "${category.name}" removida.`
            })
          }
        ]
      };
    }
  );
}
