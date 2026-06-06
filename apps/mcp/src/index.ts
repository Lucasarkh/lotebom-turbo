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

    // ── Single handler for all /mcp methods ──
    // The StreamableHTTPServerTransport.handleRequest() internally
    // handles GET (SSE stream), POST (JSON-RPC), and DELETE (session close).
    // No manual session validation — the SDK validates and returns proper
    // JSON-RPC errors that MCP clients (OpenCode etc.) understand.
    app.all('/mcp', async (req: any, res: any) => {
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: any;

        if (sessionId && transports[sessionId]) {
          // Reuse existing transport for this session
          transport = transports[sessionId];
        } else if (req.method === 'POST' && !sessionId && isInitializeRequest(req.body)) {
          // New initialization — create a fresh transport bound to this session
          transport = new (StreamableHTTPServerTransport as any)({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid: string) => {
              // Called by SDK after session ID is generated, before response sent
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
        } else {
          // No session / not an initialize — return proper JSON-RPC error.
          // Same error format the SDK would return, without creating a transport.
          if (sessionId) {
            // Session ID provided but not found (expired / wrong instance)
            res.status(404).json({
              jsonrpc: '2.0',
              error: { code: -32001, message: 'Session not found. Please re-initialize.' },
              id: null
            });
          } else {
            // No session ID and not an initialize request
            res.status(400).json({
              jsonrpc: '2.0',
              error: { code: -32000, message: 'Bad Request: Mcp-Session-Id header is required' },
              id: null
            });
          }
          return;
        }

        // Delegate everything to the transport.
        // For GET: opens SSE stream if session is valid
        // For POST: processes JSON-RPC messages
        // For DELETE: terminates session
        await transport.handleRequest(req, res, req.body);
      } catch (err: any) {
        console.error(`[Lotio MCP] Erro na requisição ${req.method}:`, err?.message || err);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null
          });
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
