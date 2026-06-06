# =============================================
# Lotio MCP Server — Production Dockerfile
# Servidor MCP (Model Context Protocol) para agentes de IA
# Transporte: HTTP/SSE (StreamableHTTP) na porta 3101
# =============================================

FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# -- Stage 1: Install ALL dependencies ------------------------------------
FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/mcp/package.json apps/mcp/
COPY apps/backend/package.json apps/backend/
COPY apps/backend/prisma/schema.prisma apps/backend/prisma/

RUN pnpm install --frozen-lockfile

# Generate Prisma client (reuses same schema as backend)
WORKDIR /app/apps/mcp
RUN npx prisma generate --schema ../backend/prisma/schema.prisma

# -- Stage 2: Build TypeScript --------------------------------------------
FROM deps AS build

WORKDIR /app

# Copy MCP source + tsconfig
COPY apps/mcp/tsconfig.json apps/mcp/
COPY apps/mcp/src apps/mcp/src/

WORKDIR /app/apps/mcp
RUN npx tsc -p tsconfig.json

# -- Stage 3: Production runner -------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs -h /home/mcp

# Root node_modules (pnpm virtual store .pnpm/)
COPY --from=deps --chown=mcp:nodejs /app/node_modules ./node_modules

# Workspace-specific node_modules (deps like dotenv live here with pnpm)
COPY --from=deps --chown=mcp:nodejs /app/apps/mcp/node_modules ./apps/mcp/node_modules

# Compiled output
COPY --from=build --chown=mcp:nodejs /app/apps/mcp/dist ./apps/mcp/dist

# Package metadata
COPY --from=build --chown=mcp:nodejs /app/apps/mcp/package.json ./apps/mcp/

# Prisma schema (needed at runtime for PrismaClient queries)
COPY --from=build --chown=mcp:nodejs /app/apps/backend/prisma ./apps/backend/prisma

WORKDIR /app/apps/mcp

USER mcp

EXPOSE 3101

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3101

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3101/health',(r)=>{process.exit(r.statusCode>0?0:1)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
