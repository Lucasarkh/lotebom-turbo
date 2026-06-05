import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { PrismaClient } from '@prisma/client';
import { registerProjectTools } from './tools/projects.js';
import { registerLotTools } from './tools/lots.js';
import { registerLeadTools } from './tools/leads.js';
import { registerAiConfigTools } from './tools/ai-config.js';
import { registerCategoryTools } from './tools/categories.js';
import { registerTenantTools } from './tools/tenants.js';

export function createServer(prisma: PrismaClient): McpServer {
  const server = new McpServer(
    {
      name: 'lotio-mcp',
      version: '0.1.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  registerProjectTools(server, prisma);
  registerLotTools(server, prisma);
  registerLeadTools(server, prisma);
  registerAiConfigTools(server, prisma);
  registerCategoryTools(server, prisma);
  registerTenantTools(server, prisma);

  return server;
}
