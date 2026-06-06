#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createServer } from './server.js';
import { getAuth, authStorage } from './auth.js';

async function main() {
  const prisma = new PrismaClient({
    log: ['warn', 'error']
  });

  await prisma.$connect();
  console.error('[Lotio MCP] Conectado ao banco de dados');

  const server = createServer(prisma);

  const transport = process.env.MCP_TRANSPORT || 'stdio';

  if (transport === 'http') {
    // ── HTTP/SSE transport (produção) ──────────────────
    const { createMcpExpressApp } = await import(
      '@modelcontextprotocol/sdk/server/express.js'
    );
    const { StreamableHTTPServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    const { randomUUID } = await import('node:crypto');

    // host: '0.0.0.0' desabilita a proteção DNS rebinding do SDK MCP,
    // que rejeitaria o Host: lotio.com.br enviado pelo Caddy.
    // Em produção o servidor já está atrás de reverse proxy com auth.
    const app = createMcpExpressApp({ host: '0.0.0.0' });

    // ── Transport único: o SDK gerencia sessões internamente ──
    const transport = new (StreamableHTTPServerTransport as any)({
      sessionIdGenerator: () => randomUUID()
    });
    await server.connect(transport);

    // ── Auth middleware: valida X-Lotio-API-Key em toda request ──
    app.use(async (req: any, _res: any, next: any) => {
      const apiKey =
        req.headers['x-lotio-api-key']?.trim() ||
        req.headers['x-api-key']?.trim() ||
        req.headers['authorization']?.replace(/^Bearer\s+/i, '')?.trim() ||
        '';

      try {
        const auth = await getAuth(prisma, apiKey);
        // Run the rest of the request with auth context in ALS
        authStorage.run(auth, () => next());
      } catch (err: any) {
        _res.status(401).json({
          error: err.message || 'Authentication failed',
          hint: 'Passe X-Lotio-API-Key no header HTTP. Gere a chave em /painel/chaves-api'
        });
      }
    });

    // ── Rota MCP: delega para o transport único ──
    app.all('/mcp', async (req: any, res: any) => {
      try {
        await transport.handleRequest(req, res, req.body);
      } catch (err: any) {
        console.error('[Lotio MCP] Erro na requisição:', err?.message || err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    const port = parseInt(process.env.MCP_PORT || '3101', 10);
    const host = process.env.MCP_HOST || '0.0.0.0';

    app.listen(port, host, () => {
      console.error(
        `[Lotio MCP] Servidor HTTP/SSE ouvindo em ${host}:${port}/mcp`
      );
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.error('[Lotio MCP] Encerrando...');
      try {
        await transport.close();
      } catch {}
      process.exit(0);
    });
  } else {
    // ── stdio transport (dev local) ────────────────────
    const { StdioServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/stdio.js'
    );
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('[Lotio MCP] Servidor iniciado via stdio');
    console.error(
      '[Lotio MCP] Aguardando conexao do agente...'
    );
  }
}

main().catch((err) => {
  console.error('[Lotio MCP] Erro fatal:', err);
  process.exit(1);
});
