# =============================================
# Lotio Backend — Production Dockerfile
# Multi-stage build for NestJS + Prisma (pnpm monorepo)
# =============================================
# STRATEGY:
#   - prisma is in "dependencies" so pnpm deploy --prod includes
#     the CLI + all transitive deps (@prisma/engines, @prisma/debug, etc.)
#   - We only need to copy the GENERATED client (.prisma/client) from
#     the build stage; everything else comes from prod-deploy.
# =============================================

# -- Stage 1: Base image with pnpm ----------------------------------------
FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app

# -- Stage 2: Install ALL dependencies ------------------------------------
FROM base AS deps

# Copy workspace root configs
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace package.json files (lockfile validation)
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/

RUN pnpm install --frozen-lockfile

# -- Stage 3: Build -------------------------------------------------------
FROM deps AS build

COPY tsconfig.base.json ./
COPY apps/backend/ apps/backend/

WORKDIR /app/apps/backend

# Generate Prisma client (query engine for linux-musl / Alpine)
RUN npx prisma generate

# Build NestJS application
RUN npx nest build

# Resolve TypeScript path aliases (@/* → relative paths) in compiled output
RUN npx --yes tsc-alias -p tsconfig.json

# Stage the generated Prisma client to a known location
# pnpm hoists to /app/node_modules, so we search from /app
RUN mkdir -p /tmp/prisma-generated && \
    PRISMA_CLIENT=$(find /app -path "*/.prisma/client" -type d 2>/dev/null | head -1) && \
    if [ -n "$PRISMA_CLIENT" ]; then \
      cp -rL "$PRISMA_CLIENT" /tmp/prisma-generated/client && \
      echo "✓ Prisma client found at: $PRISMA_CLIENT"; \
    else \
      echo "FATAL: .prisma/client not found anywhere under /app" && exit 1; \
    fi

# -- Stage 4: Production deps (standalone, no symlinks) -------------------
FROM deps AS prod-deploy

RUN pnpm config set force-legacy-deploy true && \
    pnpm --filter lotio-backend deploy --prod --legacy /deploy

# -- Stage 5: Production runner -------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs -h /home/nestjs

# 1) Production node_modules from pnpm deploy (includes prisma CLI + all transitive deps)
COPY --from=prod-deploy --chown=nestjs:nodejs /deploy/node_modules ./node_modules

# 2) Prisma generated client (query engine binary + generated types)
#    This is the ONLY thing we need from the build stage
COPY --from=build --chown=nestjs:nodejs /tmp/prisma-generated/client ./node_modules/.prisma/client

# 3) Compiled NestJS application
COPY --from=build --chown=nestjs:nodejs /app/apps/backend/dist ./dist

# 4) Prisma schema + migrations (for prisma migrate deploy)
COPY --from=build --chown=nestjs:nodejs /app/apps/backend/prisma ./prisma

# 5) Package metadata
COPY --from=build --chown=nestjs:nodejs /app/apps/backend/package.json ./

USER nestjs

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "dist/main"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/docs',(r)=>{r.resume();r.on('end',()=>process.exit(r.statusCode<500?0:1))}).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
