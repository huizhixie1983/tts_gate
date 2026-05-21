#!/usr/bin/env bash
# Start MOSI API proxy + Vite dev server with Node 16 (bypasses broken npm .bin wrappers).
set -euo pipefail

source "$(dirname "$0")/_common.sh"
setup_node

API_PID=""
cleanup() {
  if [[ -n "${API_PID}" ]] && kill -0 "${API_PID}" 2>/dev/null; then
    kill "${API_PID}" 2>/dev/null || true
    wait "${API_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if command -v fuser >/dev/null 2>&1; then
  fuser -k 5173/tcp 8787/tcp 2>/dev/null || true
  sleep 0.5
fi

node server/api.mjs &
API_PID=$!

PROXY_PORT="${MOSI_PROXY_PORT:-8787}"
echo "MOSI proxy: http://127.0.0.1:${PROXY_PORT}"
echo "Vite:       http://127.0.0.1:5173/"
echo "Press Ctrl+C to stop both."

exec node node_modules/vite/bin/vite.js --host 127.0.0.1
