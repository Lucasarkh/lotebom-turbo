# =============================================
# Lotio MCP Server — Production Dockerfile
# Servidor MCP (Model Context Protocol) para agentes de IA
# Transporte: HTTP/SSE (StreamableHTTP) na porta 3101
# =============================================

FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# -- Stage 1: Install dependencies + generate Prisma client --------
FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/mcp/package.json apps/mcp/
COPY apps/backend/package.json apps/backend/
COPY apps/backend/prisma apps/backend/prisma/

RUN pnpm install --frozen-lockfile

# Generate Prisma client for MCP (reuses same schema as backend)
WORKDIR /app/apps/mcp
RUN npx prisma generate --schema ../backend/prisma/schema.prisma

# -- Stage 2: Build TypeScript ------------------------------------
FROM deps AS build

COPY tsconfig.base.json ./
COPY apps/mcp/tsconfig.json apps/mcp/
COPY apps/mcp/src apps/mcp/src/

WORKDIR /app/apps/mcp
RUN npx tsc

# -- Stage 3: Production runner -----------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs -h /home/mcp

# Copy production node_modules (hoisted from pnpm)
COPY --from=deps --chown=mcp:nodejs /app/node_modules ./node_modules

# Copy compiled MCP server
COPY --from=build --chown=mcp:nodejs /app/apps/mcp/dist ./dist

# Copy package.json for metadata
COPY --from=build --chown=mcp:nodejs /app/apps/mcp/package.json ./

# Copy Prisma schema (needed for Prisma client at runtime)
COPY --from=build --chown=mcp:nodejs /app/apps/backend/prisma ./prisma

USER mcp

EXPOSE 3101

ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV MCP_PORT=3101

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3101/health',(r)=>{process.exit(r.statusCode===404?0:1)})" || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
