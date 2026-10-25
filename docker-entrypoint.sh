#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set (configure it as a runtime variable in Coolify)" >&2
  exit 1
fi

echo "Running database migrations..."
if ! node ./node_modules/prisma/build/index.js migrate deploy --schema ./prisma/schema.prisma; then
  echo "FATAL: migrations failed; not starting the application" >&2
  # Delay so a restart policy cannot spin in a tight loop
  sleep 30
  exit 1
fi

echo "Starting application..."
exec "$@"