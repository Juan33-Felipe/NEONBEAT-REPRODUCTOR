#!/usr/bin/env bash
set -e

SCENARIO="${SCENARIO:-baseline}"
DURATION="${DURATION:-5m}"
VUS="${VUS:-15}"
MAX_VUS="${MAX_VUS:-80}"
BASE_URL="${BASE_URL:-http://localhost:3001}"
SAMPLE_INTERVAL_MS="${SAMPLE_INTERVAL_MS:-2000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
mkdir -p "$SCRIPT_DIR/results"

TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
LABEL="${SCENARIO}-${TIMESTAMP}"
SUMMARY_FILE="measurements/results/k6-${LABEL}-summary.json"

echo "[Experimento] Iniciando recolector de métricas del sistema ($LABEL)..."
node "$SCRIPT_DIR/collect-metrics.mjs" --label "$LABEL" --interval "$SAMPLE_INTERVAL_MS" &
COLLECTOR_PID=$!

cleanup() {
  echo "[Experimento] Deteniendo recolector de métricas (PID=$COLLECTOR_PID)..."
  kill -SIGINT "$COLLECTOR_PID" 2>/dev/null || true
  wait "$COLLECTOR_PID" 2>/dev/null || true
}
trap cleanup EXIT

sleep 2

echo "[Experimento] Ejecutando k6 (SCENARIO=$SCENARIO, DURATION=$DURATION, VUS=$VUS)..."
if command -v k6 >/dev/null 2>&1; then
  k6 run \
    -e BASE_URL="$BASE_URL" \
    -e SCENARIO="$SCENARIO" \
    -e DURATION="$DURATION" \
    -e VUS="$VUS" \
    -e MAX_VUS="$MAX_VUS" \
    -e SUMMARY_FILE="$SUMMARY_FILE" \
    "$REPO_ROOT/load-tests/neonbeat-load.js"
else
  DOCKER_BASE_URL="${BASE_URL/localhost/host.docker.internal}"
  docker run --rm -i \
    -v "$REPO_ROOT:/work" -w /work \
    -e BASE_URL="$DOCKER_BASE_URL" \
    -e SCENARIO="$SCENARIO" \
    -e DURATION="$DURATION" \
    -e VUS="$VUS" \
    -e MAX_VUS="$MAX_VUS" \
    -e SUMMARY_FILE="$SUMMARY_FILE" \
    grafana/k6:latest run /work/load-tests/neonbeat-load.js
fi
