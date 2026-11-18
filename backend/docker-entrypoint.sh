#!/bin/sh
set -e

mkdir -p /app/data /app/storage/audio

echo "[Entrypoint] Ejecutando migraciones de Prisma en SQLite..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "[Entrypoint] Verificando catálogo inicial (seed)..."
  node dist/seed.js || true
fi

echo "[Entrypoint] Iniciando servidor NeonBeat Backend..."
exec node dist/index.js
