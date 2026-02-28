# =============================================
# Lotio Backend — Production Dockerfile
# Multi-stage build for NestJS + Prisma (pnpm monorepo)
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

# Resolve pnpm v10 legacy deploy requirement
RUN pnpm config set force-legacy-deploy true

# Copy prisma CLI (devDep) with symlink resolution for migrations
RUN cp -rL node_modules/prisma /tmp/prisma-cli 2>/dev/null || true

# Stage Prisma generated client — search entire /app since pnpm hoists to workspace root
RUN mkdir -p /tmp/prisma-generated/client && \
    PRISMA_CLIENT=$(find /app -path "*/.prisma/client" -type d 2>/dev/null | head -1) && \
    if [ -n "$PRISMA_CLIENT" ]; then \
      cp -rL "$PRISMA_CLIENT"/* /tmp/prisma-generated/client/ && \
      echo "✓ Prisma client copied from: $PRISMA_CLIENT"; \
    else \
      echo "FATAL: .prisma/client not found anywhere under /app" && exit 1; \
    fi

# Stage Prisma Engines (Required for Prisma CLI to run migrations)
RUN mkdir -p /tmp/prisma-engines && \
    ENGINES_DIR=$(find /app -path "*/@prisma/engines" -type d 2>/dev/null | head -1) && \
    if [ -n "$ENGINES_DIR" ]; then \
      cp -rL "$ENGINES_DIR"/* /tmp/prisma-engines/ && \
      echo "✓ Prisma engines copied from: $ENGINES_DIR"; \
    else \
      echo "WARNING: @prisma/engines not found, migrations might fail" ; \
    fi

# -- Stage 4: Production deps (standalone, no symlinks) -------------------
FROM deps AS prod-deploy

# Use --legacy flag for pnpm v10 compatibility in workspaces
RUN pnpm --filter lotio-backend deploy --prod --legacy /deploy

# -- Stage 5: Production runner -------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs -h /home/nestjs

# 1) Production node_modules (flat, no symlinks)
COPY --from=prod-deploy --chown=nestjs:nodejs /deploy/node_modules ./node_modules

# 2) Prisma generated client (query engine + generated types)
COPY --from=build /tmp/prisma-generated ./node_modules/.prisma

# 3) Prisma CLI for running migrations on deploy
COPY --from=build /tmp/prisma-cli ./node_modules/prisma
COPY --from=build /tmp/prisma-engines ./node_modules/@prisma/engines
RUN mkdir -p node_modules/.bin && \
    ln -sf ../prisma/build/index.js node_modules/.bin/prisma && \
    chmod +x node_modules/.bin/prisma 2>/dev/null || true

# 4) Compiled NestJS application
COPY --from=build --chown=nestjs:nodejs /app/apps/backend/dist ./dist

# 5) Prisma schema + migrations (for prisma migrate deploy)
COPY --from=build --chown=nestjs:nodejs /app/apps/backend/prisma ./prisma

# 6) Package metadata
COPY --from=build --chown=nestjs:nodejs /app/apps/backend/package.json ./

USER nestjs

EXPOSE 8080

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/docs',(r)=>{r.resume();r.on('end',()=>process.exit(r.statusCode<500?0:1))}).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
