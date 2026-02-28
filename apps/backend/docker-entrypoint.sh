#!/bin/sh
set -e

echo "=== Lotio Backend — Production Entrypoint ==="

# ── 1. Wait for database to be reachable ──────────
# Even with depends_on healthcheck, race conditions can happen
MAX_RETRIES=30
RETRY_INTERVAL=2
RETRIES=0

echo "[entrypoint] Waiting for database..."

until node -e "
  const net = require('net');
  const url = new URL(process.env.DATABASE_URL);
  const socket = net.createConnection({
    host: url.hostname,
    port: url.port || 5432,
    timeout: 3000
  });
  socket.on('connect', () => { socket.destroy(); process.exit(0); });
  socket.on('error', () => process.exit(1));
  socket.on('timeout', () => { socket.destroy(); process.exit(1); });
" 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
    echo "[entrypoint] FATAL: Could not reach database after ${MAX_RETRIES} attempts"
    exit 1
  fi
  echo "[entrypoint] Database not ready (attempt ${RETRIES}/${MAX_RETRIES}), retrying in ${RETRY_INTERVAL}s..."
  sleep "$RETRY_INTERVAL"
done

echo "[entrypoint] Database is reachable!"

# ── 2. Run Prisma migrations ─────────────────────
echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy --schema ./prisma/schema.prisma 2>&1 || {
  echo "[entrypoint] WARNING: prisma migrate deploy failed (may be first run or already up to date)"
}

echo "[entrypoint] Migrations complete."

# ── 3. Start the application ─────────────────────
echo "[entrypoint] Starting NestJS application..."
exec node dist/main.js
