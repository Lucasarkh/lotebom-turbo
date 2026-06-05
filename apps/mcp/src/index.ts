#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createServer } from './server.js';

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
    const { isInitializeRequest } = await import(
      '@modelcontextprotocol/sdk/types.js'
    );

    const app = createMcpExpressApp();
    const transports: Record<string, any> = {};

    app.all('/mcp', async (req: any, res: any) => {
      const sessionId = req.headers['mcp-session-id'] as string;
      let transport: any | undefined;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && req.method === 'POST') {
        try {
          // Verify body is an initialize request — accept any POST as init
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          // Create new transport for initialization
          transport = new (StreamableHTTPServerTransport as any)({
            sessionIdGenerator: () => randomUUID()
          });
          await server.connect(transport);
          if (transport.sessionId) {
            transports[transport.sessionId] = transport;
            transport.onclose = () => {
              const sid = (transport as any).sessionId;
              if (sid) delete transports[sid];
            };
          }
        } catch {
          res.status(400).json({ error: 'Invalid initialization request' });
          return;
        }
      } else {
        res.status(400).json({ error: 'No valid session' });
        return;
      }

      if (transport) {
        await transport.handleRequest(req, res, req.body);
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
      for (const sid of Object.keys(transports)) {
        try {
          await transports[sid].close();
        } catch {}
        delete transports[sid];
      }
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
