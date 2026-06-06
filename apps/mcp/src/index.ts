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

  const mcpServer = createServer(prisma);

  const transport = process.env.MCP_TRANSPORT || 'stdio';

  if (transport === 'http') {
    // ── HTTP/SSE transport (produção) ──────────────────
    const { createMcpExpressApp } = await import(
      '@modelcontextprotocol/sdk/server/express.js'
    );
    const { StreamableHTTPServerTransport } = await import(
      '@modelcontextprotocol/sdk/server/streamableHttp.js'
    );
    const { isInitializeRequest } = await import(
      '@modelcontextprotocol/sdk/types.js'
    );
    const { randomUUID } = await import('node:crypto');

    // host: '0.0.0.0' desabilita a proteção DNS rebinding do SDK MCP,
    // que rejeitaria o Host: lotio.com.br enviado pelo Caddy.
    // Em produção o servidor já está atrás de reverse proxy com auth.
    const app = createMcpExpressApp({ host: '0.0.0.0' });

    // ── Multi-session: um transporte por sessão ──
    const transports: Record<string, any> = {};

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

    // ── POST /mcp: initialize or continue session ──
    app.post('/mcp', async (req: any, res: any) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: any;

        if (sessionId && transports[sessionId]) {
          // Reuse existing transport for this session
          transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request — create a fresh transport
          transport = new (StreamableHTTPServerTransport as any)({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid: string) => {
              console.error(`[Lotio MCP] Sessão inicializada: ${sid}`);
              transports[sid] = transport;
            }
          });

          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && transports[sid]) {
              console.error(`[Lotio MCP] Sessão encerrada: ${sid}`);
              delete transports[sid];
            }
          };

          // Connect this transport to the shared MCP server
          await mcpServer.connect(transport as any);
          await transport.handleRequest(req, res, req.body);
          return; // Already handled (response sent by transport)
        } else if (sessionId) {
          // Session ID provided but not found — session expired
          res.status(404).json({
            jsonrpc: '2.0',
            error: {
              code: -32001,
              message: 'Session not found. Please re-initialize.'
            },
            id: null
          });
          return;
        } else {
          // No session ID and not an initialize request
          res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Bad Request: Mcp-Session-Id header is required'
            },
            id: null
          });
          return;
        }

        // Handle the request with existing transport
        await transport.handleRequest(req, res, req.body);
      } catch (err: any) {
        console.error('[Lotio MCP] Erro na requisição POST:', err?.message || err);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error'
            },
            id: null
          });
        }
      }
    });

    // ── GET /mcp: SSE stream for existing session ──
    app.get('/mcp', async (req: any, res: any) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        await transports[sessionId].handleRequest(req, res);
      } catch (err: any) {
        console.error('[Lotio MCP] Erro na requisição GET:', err?.message || err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });

    // ── DELETE /mcp: terminate session ──
    app.delete('/mcp', async (req: any, res: any) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        if (!sessionId || !transports[sessionId]) {
          res.status(400).send('Invalid or missing session ID');
          return;
        }
        await transports[sessionId].handleRequest(req, res);
      } catch (err: any) {
        console.error('[Lotio MCP] Erro na requisição DELETE:', err?.message || err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });

    const port = parseInt(process.env.MCP_PORT || '3101', 10);
    const host = process.env.MCP_HOST || '0.0.0.0';

    app.listen(port, host, () => {
      console.error(
        `[Lotio MCP] Servidor HTTP/SSE multi-sessão ouvindo em ${host}:${port}/mcp`
      );
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.error('[Lotio MCP] Encerrando...');
      for (const [sid, t] of Object.entries(transports)) {
        try {
          console.error(`[Lotio MCP] Fechando sessão ${sid}...`);
          await t.close();
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
    await mcpServer.connect(transport);

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
