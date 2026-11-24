#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set (configure it as a runtime variable in Coolify)" >&2
  exit 1
fi

echo "============================================"
echo "RecyTrack Deployment - $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "============================================"

echo ""
echo "[1/3] Checking migration status..."
node ./node_modules/prisma/build/index.js migrate status --schema ./prisma/schema.prisma 2>&1 || true

echo ""
echo "[2/3] Running database migrations..."
if ! node ./node_modules/prisma/build/index.js migrate deploy --schema ./prisma/schema.prisma; then
  echo ""
  echo "============================================"
  echo "FATAL: migrations failed; not starting the application"
  echo "============================================"
  echo ""
  echo "Please check:"
  echo "  1. Database connectivity (DATABASE_URL is correct)"
  echo "  2. Migration files are valid"
  echo "  3. No conflicting schema changes"
  echo ""
  # Delay so a restart policy cannot spin in a tight loop
  sleep 30
  exit 1
fi

echo ""
echo "[3/3] Migrations successful. Starting application..."
echo "============================================"
echo ""
exec "$@"