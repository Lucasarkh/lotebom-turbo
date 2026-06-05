import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

export interface AuthContext {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  apiKeyId: string;
  keyName: string;
  projectIds: string[];
  permissions: string[];
}

/**
 * Authenticates the agent by reading the LOTIO_API_KEY environment variable,
 * looking up its hash in the AgentApiKey table, validating it's active and
 * not expired, and returning the tenant authorization context.
 *
 * This is called once at the start of every tool invocation.
 */
export async function authenticate(
  prisma: PrismaClient
): Promise<AuthContext> {
  const apiKey = process.env.LOTIO_API_KEY;

  if (!apiKey) {
    throw new Error(
      '❌ LOTIO_API_KEY não configurada.\n\n' +
        'Configure a variável de ambiente LOTIO_API_KEY no seu cliente MCP.\n' +
        'Exemplo para Claude Desktop ou Cursor:\n\n' +
        '  {\n' +
        '    "lotio-mcp": {\n' +
        '      "command": "node",\n' +
        '      "args": ["dist/index.js"],\n' +
        '      "cwd": "/caminho/para/apps/mcp",\n' +
        '      "env": {\n' +
        '        "LOTIO_API_KEY": "lotio_agent_..."\n' +
        '      }\n' +
        '    }\n' +
        '  }\n\n' +
        'Gere uma chave API no painel Lotio em: Configurações → Chaves API para Agentes'
    );
  }

  const cleanKey = apiKey.trim();
  const keyHash = crypto
    .createHash('sha256')
    .update(cleanKey)
    .digest('hex');

  const record = await (prisma as any).agentApiKey.findUnique({
    where: { keyHash },
    include: {
      tenant: { select: { id: true, name: true, slug: true } }
    }
  });

  if (!record) {
    throw new Error(
      '❌ Chave API inválida.\n\n' +
        'A chave fornecida não foi encontrada no sistema.\n' +
        'Verifique se a LOTIO_API_KEY está correta e se a chave não foi revogada.'
    );
  }

  if (!record.isActive) {
    throw new Error(
      '❌ Chave API inativa.\n\n' +
        'Esta chave foi desativada. Gere uma nova chave no painel Lotio:\n' +
        'Configurações → Chaves API para Agentes'
    );
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    throw new Error(
      '❌ Chave API expirada.\n\n' +
        `Esta chave expirou em ${record.expiresAt.toISOString()}.\n` +
        'Gere uma nova chave no painel Lotio.'
    );
  }

  try {
    await (prisma as any).agentApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() }
    });
  } catch {
    // Non-critical — just update lastUsedAt
  }

  return {
    tenantId: record.tenantId,
    tenantName: record.tenant.name,
    tenantSlug: record.tenant.slug,
    apiKeyId: record.id,
    keyName: record.name,
    projectIds: record.projectIds || [],
    permissions: record.permissions || []
  };
}

/**
 * Validates that the agent has a specific permission.
 * Permissions format: "resource:action" (e.g., "projects:read", "lots:write")
 */
export function requirePermission(
  auth: AuthContext,
  permission: string
): void {
  if (!auth.permissions.includes(permission)) {
    throw new Error(
      `❌ Permissão negada: "${permission}".\n\n` +
        `Sua chave API "${auth.keyName}" não tem a permissão "${permission}".\n` +
        `Permissões atuais: ${auth.permissions.join(', ') || 'nenhuma'}\n\n` +
        'Solicite ao administrador da loteadora que atualize as permissões desta chave.'
    );
  }
}

/**
 * Validates that the agent can access a specific project.
 * If projectIds is empty, all projects are allowed.
 */
export function requireProjectAccess(
  auth: AuthContext,
  projectId: string
): void {
  if (auth.projectIds.length === 0) return; // All projects allowed
  if (auth.projectIds.includes(projectId)) return;

  throw new Error(
    `❌ Projeto não autorizado.\n\n` +
      `Sua chave API "${auth.keyName}" não tem acesso ao projeto ${projectId}.\n` +
      `Projetos permitidos: ${auth.projectIds.join(', ') || 'nenhum'}\n\n` +
      'Solicite ao administrador que adicione este projeto ao escopo da chave.'
  );
}
