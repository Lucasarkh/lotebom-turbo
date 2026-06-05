import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { getAuth, requirePermission, requireProjectAccess } from '../auth.js';
import { logAudit } from '../audit.js';
import { z } from 'zod';

/**
 * Lot tools — list, get, update, upsert lot details.
 */
export function registerLotTools(server: McpServer, prisma: PrismaClient) {
  // ─── list_lots ────────────────────────────────────
  server.tool(
    'list_lots',
    'Lista todos os lotes de um projeto. Retorna código, status, área, preço, categoria, topografia, tags e URL da página pública.',
    {
      project_id: z.string().describe('ID do projeto'),
      status: z
        .enum(['AVAILABLE', 'RESERVED', 'SOLD'])
        .optional()
        .describe('Filtrar por status do lote'),
      block: z.string().optional().describe('Filtrar por quadra'),
      category_id: z.string().optional().describe('Filtrar por categoria'),
      search: z.string().optional().describe('Buscar por código, quadra ou número'),
      page: z.number().int().min(1).optional().default(1).describe('Página'),
      limit: z.number().int().min(1).max(200).optional().default(50).describe('Itens por página')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:read');
      requireProjectAccess(auth, params.project_id);

      const where: any = {
        tenantId: auth.tenantId,
        projectId: params.project_id
      };
      if (params.status) where.status = params.status;
      if (params.block) where.block = params.block;
      if (params.category_id) where.categoryId = params.category_id;

      if (params.search) {
        const term = params.search.trim();
        where.OR = [
          { block: { contains: term, mode: 'insensitive' } },
          { lotNumber: { contains: term, mode: 'insensitive' } },
          { mapElement: { code: { contains: term, mode: 'insensitive' } } }
        ];
      }

      const [lots, total] = await Promise.all([
        prisma.lotDetails.findMany({
          where,
          include: {
            mapElement: { select: { code: true, name: true, type: true } },
            category: { select: { id: true, name: true, slug: true } }
          },
          orderBy: [{ block: 'asc' }, { lotNumber: 'asc' }],
          skip: (params.page - 1) * params.limit,
          take: params.limit
        }),
        prisma.lotDetails.count({ where })
      ]);

      // Human-readable status map
      const statusMap: Record<string, string> = {
        AVAILABLE: 'Disponível',
        RESERVED: 'Reservado',
        SOLD: 'Vendido'
      };
      const slopeMap: Record<string, string> = {
        FLAT: 'Plano',
        UPHILL: 'Aclive',
        DOWNHILL: 'Declive'
      };

      const formatted = lots.map((lot: any) => ({
        id: lot.id,
        code: lot.mapElement?.code || lot.mapElement?.name || 'S/N',
        block: lot.block,
        lot_number: lot.lotNumber,
        status: statusMap[lot.status] || lot.status,
        area_m2: lot.areaM2,
        price: lot.price ? Number(lot.price) : null,
        price_per_m2: lot.pricePerM2 ? Number(lot.pricePerM2) : null,
        topography: slopeMap[lot.slope] || 'Plano',
        frontage: lot.frontage,
        depth: lot.depth,
        category: lot.category?.name || null,
        tags: lot.tags || [],
        notes: lot.notes,
        panorama_url: lot.panoramaUrl,
        matricula: lot.matricula
      }));

      await logAudit(prisma, auth.apiKeyId, 'lots:list', params.project_id, 'Project', {
        resultCount: formatted.length
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                data: formatted,
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

  // ─── get_lot ────────────────────────────────────
  server.tool(
    'get_lot',
    'Busca um lote específico pelo ID ou pelo mapElementId e retorna todos os seus detalhes, incluindo restrições urbanísticas, confrontações e dados legais.',
    {
      lot_id: z.string().describe('ID do lote (LotDetails id ou mapElementId)')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:read');

      // Try LotDetails id first, then mapElementId
      let lot = await prisma.lotDetails.findFirst({
        where: {
          OR: [
            { id: params.lot_id, tenantId: auth.tenantId },
            { mapElementId: params.lot_id, tenantId: auth.tenantId }
          ]
        },
        include: {
          mapElement: true,
          category: { select: { id: true, name: true, slug: true } },
          medias: { orderBy: { createdAt: 'desc' } }
        }
      });

      if (!lot) throw new Error(`Lote ${params.lot_id} não encontrado.`);
      requireProjectAccess(auth, lot.projectId);

      // Also check agentEnabled on project
      const project = await prisma.project.findFirst({
        where: { id: lot.projectId, tenantId: auth.tenantId },
        select: { id: true, name: true, slug: true, agentEnabled: true }
      });

      await logAudit(prisma, auth.apiKeyId, 'lots:read', lot.id, 'LotDetails');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ...lot, project }, null, 2)
          }
        ]
      };
    }
  );

  // ─── update_lot ────────────────────────────────────
  server.tool(
    'update_lot',
    'Atualiza os dados de um lote. Envie apenas os campos que deseja alterar. Pode atualizar preço, status, área, topografia, tags, restrições urbanísticas, dados legais e mais.',
    {
      lot_id: z.string().describe('ID do lote (LotDetails id)'),
      status: z
        .enum(['AVAILABLE', 'RESERVED', 'SOLD'])
        .optional()
        .describe('Status do lote'),
      price: z.number().min(0).optional().describe('Preço total (R$)'),
      price_per_m2: z.number().min(0).optional().describe('Preço por m² (R$)'),
      area_m2: z.number().min(0).optional().describe('Área em m²'),
      block: z.string().optional().describe('Quadra'),
      lot_number: z.string().optional().describe('Número do lote'),
      frontage: z.number().min(0).optional().describe('Frente (m)'),
      depth: z.number().min(0).optional().describe('Profundidade (m)'),
      side_left: z.number().min(0).optional().describe('Lateral esquerda (m)'),
      side_right: z.number().min(0).optional().describe('Lateral direita (m)'),
      slope: z.enum(['FLAT', 'UPHILL', 'DOWNHILL']).optional().describe('Topografia'),
      category_id: z.string().optional().describe('ID da categoria'),
      tags: z.array(z.string()).optional().describe('Tags (ex: ["esquina", "sol da manhã"])'),
      notes: z.string().optional().describe('Observações internas'),
      panorama_url: z.string().optional().describe('URL do panorama 360'),
      matricula: z.string().optional().describe('Matrícula do imóvel'),
      inscricao_imobiliaria: z.string().optional().describe('Inscrição Imobiliária'),
      confrontacoes: z.string().optional().describe('Confrontações'),
      recuo_frontal: z.number().optional().describe('Recuo frontal (m)'),
      recuo_lateral: z.number().optional().describe('Recuo lateral (m)'),
      recuo_fundos: z.number().optional().describe('Recuo fundos (m)'),
      taxa_ocupacao: z.number().optional().describe('Taxa de ocupação (%)'),
      coeficiente_aproveitamento: z.number().optional().describe('Coeficiente de aproveitamento'),
      gabarito_maximo: z.number().optional().describe('Gabarito máximo (m)'),
      taxa_permeabilidade: z.number().optional().describe('Taxa de permeabilidade (%)'),
      zoneamento: z.string().optional().describe('Zoneamento'),
      uso_permitido: z.string().optional().describe('Uso permitido')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:write');

      const lot = await prisma.lotDetails.findFirst({
        where: { id: params.lot_id, tenantId: auth.tenantId }
      });
      if (!lot) throw new Error(`Lote ${params.lot_id} não encontrado.`);
      requireProjectAccess(auth, lot.projectId);

      // Check agentEnabled
      const project = await prisma.project.findFirst({
        where: { id: lot.projectId, tenantId: auth.tenantId },
        select: { agentEnabled: true }
      });
      if (!project?.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      const { lot_id, category_id, ...rest } = params;
      const data: any = { ...rest };
      if (category_id !== undefined) data.categoryId = category_id;

      // Clean undefined
      for (const key of Object.keys(data)) {
        if (data[key] === undefined) delete data[key];
      }

      const updated = await prisma.lotDetails.update({
        where: { id: lot_id },
        data,
        include: {
          mapElement: { select: { code: true, name: true } },
          category: { select: { id: true, name: true } }
        }
      });

      await logAudit(prisma, auth.apiKeyId, 'lots:update', lot_id, 'LotDetails', {
        updatedFields: Object.keys(data)
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { message: 'Lote atualizado com sucesso.', lot: updated },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── upsert_lot ────────────────────────────────────
  server.tool(
    'upsert_lot',
    'Cria ou atualiza detalhes de um lote vinculado a um MapElement (elemento do mapa). Use quando o lote já existe no mapa (criado pelo editor de planta) e você quer preencher seus dados comerciais.',
    {
      project_id: z.string().describe('ID do projeto'),
      map_element_id: z.string().describe('ID do MapElement (elemento no mapa)'),
      block: z.string().optional().describe('Quadra'),
      lot_number: z.string().optional().describe('Número do lote'),
      price: z.number().min(0).optional().describe('Preço total (R$)'),
      area_m2: z.number().min(0).optional().describe('Área em m²'),
      status: z.enum(['AVAILABLE', 'RESERVED', 'SOLD']).optional().describe('Status'),
      slope: z.enum(['FLAT', 'UPHILL', 'DOWNHILL']).optional().describe('Topografia'),
      category_id: z.string().optional().describe('ID da categoria'),
      tags: z.array(z.string()).optional().describe('Tags'),
      frontage: z.number().optional().describe('Frente (m)'),
      depth: z.number().optional().describe('Profundidade (m)')
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

      // Verify map element exists and belongs to project
      const el = await prisma.mapElement.findFirst({
        where: {
          id: params.map_element_id,
          tenantId: auth.tenantId,
          projectId: params.project_id
        }
      });
      if (!el) throw new Error(`MapElement ${params.map_element_id} não encontrado no projeto.`);

      const { project_id, map_element_id, category_id, ...rest } = params;
      const data: any = { ...rest };
      if (category_id !== undefined) data.categoryId = category_id;

      for (const key of Object.keys(data)) {
        if (data[key] === undefined) delete data[key];
      }

      const lot = await prisma.lotDetails.upsert({
        where: { mapElementId: map_element_id },
        create: {
          tenantId: auth.tenantId,
          projectId: project_id,
          mapElementId: map_element_id,
          ...data
        },
        update: data,
        include: {
          mapElement: { select: { code: true, name: true } },
          category: { select: { name: true } }
        }
      });

      await logAudit(prisma, auth.apiKeyId, 'lots:upsert', lot.id, 'LotDetails', {
        mapElementId: map_element_id,
        operation: 'upsert'
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                message: 'Lote criado/atualizado com sucesso.',
                lot
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  // ─── update_lot_status ────────────────────────────────────
  server.tool(
    'update_lot_status',
    'Atualiza apenas o status de um lote (Disponível, Reservado, Vendido). Atalho rápido para alteração de status.',
    {
      lot_id: z.string().describe('ID do lote'),
      status: z
        .enum(['AVAILABLE', 'RESERVED', 'SOLD'])
        .describe('Novo status do lote')
    },
    async (params) => {
      const auth = await getAuth(prisma);
      requirePermission(auth, 'lots:write');

      const lot = await prisma.lotDetails.findFirst({
        where: { id: params.lot_id, tenantId: auth.tenantId },
        select: { id: true, projectId: true, status: true }
      });
      if (!lot) throw new Error(`Lote ${params.lot_id} não encontrado.`);
      requireProjectAccess(auth, lot.projectId);

      const project = await prisma.project.findFirst({
        where: { id: lot.projectId },
        select: { agentEnabled: true }
      });
      if (!project?.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      const updated = await prisma.lotDetails.update({
        where: { id: params.lot_id },
        data: { status: params.status },
        select: {
          id: true,
          status: true,
          mapElement: { select: { code: true } }
        }
      });

      const statusMap: Record<string, string> = {
        AVAILABLE: 'Disponível',
        RESERVED: 'Reservado',
        SOLD: 'Vendido'
      };

      await logAudit(prisma, auth.apiKeyId, 'lots:status_update', params.lot_id, 'LotDetails', {
        from: lot.status,
        to: params.status
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `Status do lote ${updated.mapElement?.code || params.lot_id} alterado para "${statusMap[updated.status]}".`,
              lot_id: updated.id,
              status: updated.status
            })
          }
        ]
      };
    }
  );
}
