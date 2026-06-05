import { PrismaClient } from '@prisma/client';

/**
 * Logs an audit entry for every agent action.
 * Non-blocking — failures are silently logged to stderr.
 */
export async function logAudit(
  prisma: PrismaClient,
  apiKeyId: string,
  action: string,
  targetId: string | null,
  targetType: string | null,
  metadata?: Record<string, any>
) {
  try {
    await (prisma as any).agentAuditLog.create({
      data: {
        apiKeyId,
        action,
        targetId,
        targetType,
        metadata: metadata || null,
        ip: 'mcp-server'
      }
    });
  } catch (err: any) {
    console.error(
      `[Audit] Falha ao registrar log: ${action} — ${err.message}`
    );
  }
}
