import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

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
 * AsyncLocalStorage for per-request auth in HTTP mode.
 * Stores auth context for the duration of an MCP request.
 */
export const authStorage = new AsyncLocalStorage<AuthContext>();

/**
 * Returns the current auth context.
 * In HTTP mode, reads from AsyncLocalStorage (set by middleware).
 * In stdio mode, authenticates via env var (one-time).
 */
export async function getAuth(
  prisma: PrismaClient,
  apiKey?: string
): Promise<AuthContext> {
  // Try ALS first (HTTP mode)
  const stored = authStorage.getStore();
  if (stored) return stored;

  // Fall back to env var (stdio mode)
  return authenticateFromKey(prisma, apiKey || process.env.LOTIO_API_KEY || '');
}

/**
 * Validates an API key and returns the auth context.
 */
async function authenticateFromKey(
  prisma: PrismaClient,
  apiKey: string
): Promise<AuthContext> {
  const cleanKey = apiKey.trim();

  if (!cleanKey) {
    throw new Error(
      '❌ LOTIO_API_KEY não configurada.\n\n' +
        'Configure a variável de ambiente LOTIO_API_KEY no seu cliente MCP.\n' +
        'Ou passe X-Lotio-API-Key no header HTTP.\n\n' +
        'Gere uma chave API no painel Lotio em: Configurações → Chaves API para Agentes'
    );
  }

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
      '❌ Chave API inválida. A chave fornecida não foi encontrada.\n' +
        'Verifique se a chave está correta e não foi revogada.'
    );
  }

  if (!record.isActive) {
    throw new Error('❌ Chave API inativa. Gere uma nova no painel Lotio.');
  }

  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    throw new Error('❌ Chave API expirada. Gere uma nova no painel Lotio.');
  }

  // Update lastUsedAt (non-blocking)
  try {
    await (prisma as any).agentApiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() }
    });
  } catch {}

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
 */
export function requirePermission(
  auth: AuthContext,
  permission: string
): void {
  if (!auth.permissions.includes(permission)) {
    throw new Error(
      `❌ Permissão negada: "${permission}".\n\n` +
        `Permissões atuais: ${auth.permissions.join(', ') || 'nenhuma'}\n` +
        'Solicite ao administrador que atualize as permissões desta chave.'
    );
  }
}

/**
 * Validates that the agent can access a specific project.
 */
export function requireProjectAccess(
  auth: AuthContext,
  projectId: string
): void {
  if (auth.projectIds.length === 0) return;
  if (auth.projectIds.includes(projectId)) return;

  throw new Error(
    `❌ Projeto não autorizado: ${projectId}.\n` +
      `Projetos permitidos: ${auth.projectIds.join(', ') || 'nenhum'}`
  );
}
