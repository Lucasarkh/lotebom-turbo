import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../auth.js';
import { logAudit } from '../audit.js';
import { z } from 'zod';

/**
 * AI Config tools — get and update AI configuration for projects.
 */
export function registerAiConfigTools(
  server: McpServer,
  prisma: PrismaClient
) {
  // ─── get_ai_config ────────────────────────────────────
  server.tool(
    'get_ai_config',
    'Lista as configurações de IA do tenant (provedor, modelo, prompt ativo, etc.).',
    {},
    async () => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'ai:read');

      const configs = await (prisma as any).aiConfig.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          provider: true,
          model: true,
          isActive: true,
          temperature: true,
          maxTokens: true,
          hasSystemPrompt: true,
          systemPrompt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      // Mask API key — never return it
      const safe = configs.map((c: any) => ({
        ...c,
        hasApiKey: c.hasApiKey !== undefined,
        systemPrompt: c.systemPrompt ? c.systemPrompt.substring(0, 100) + '...' : null
      }));

      await logAudit(prisma, auth.apiKeyId, 'ai:list', null, 'AiConfig');

      return {
        content: [{ type: 'text', text: JSON.stringify(safe, null, 2) }]
      };
    }
  );

  // ─── get_project_ai_status ────────────────────────────────────
  server.tool(
    'get_project_ai_status',
    'Verifica se a IA está habilitada e configurada para um projeto específico.',
    {
      project_id: z.string().describe('ID do projeto')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'ai:read');

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: {
          id: true,
          name: true,
          aiEnabled: true,
          aiConfigId: true,
          aiConfig: {
            select: {
              id: true,
              name: true,
              provider: true,
              model: true,
              isActive: true,
              temperature: true,
              maxTokens: true
            }
          }
        }
      });

      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);

      await logAudit(prisma, auth.apiKeyId, 'ai:read', params.project_id, 'Project');

      return {
        content: [{ type: 'text', text: JSON.stringify(project, null, 2) }]
      };
    }
  );

  // ─── enable_project_ai ────────────────────────────────────
  server.tool(
    'enable_project_ai',
    'Habilita ou desabilita o chat IA para um projeto específico.',
    {
      project_id: z.string().describe('ID do projeto'),
      enabled: z.boolean().describe('true para habilitar, false para desabilitar'),
      ai_config_id: z.string().optional().describe('ID da configuração de IA a vincular')
    },
    async (params) => {
      const auth = await authenticate(prisma);
      requirePermission(auth, 'ai:write');

      const project = await prisma.project.findFirst({
        where: { id: params.project_id, tenantId: auth.tenantId },
        select: { id: true, agentEnabled: true }
      });
      if (!project) throw new Error(`Projeto ${params.project_id} não encontrado.`);
      if (!project.agentEnabled) {
        throw new Error('Edição agentica desabilitada para este projeto.');
      }

      const data: any = { aiEnabled: params.enabled };
      if (params.ai_config_id) data.aiConfigId = params.ai_config_id;

      await prisma.project.update({
        where: { id: params.project_id },
        data
      });

      await logAudit(prisma, auth.apiKeyId, 'ai:enable_project', params.project_id, 'Project', {
        enabled: params.enabled
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: `IA ${params.enabled ? 'habilitada' : 'desabilitada'} para o projeto.`,
              project_id: params.project_id,
              ai_enabled: params.enabled
            })
          }
        ]
      };
    }
  );
}
