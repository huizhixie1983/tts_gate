#!/usr/bin/env bash
# Production build with Node 16 and direct node entrypoints (no npm .bin shims).
set -euo pipefail

source "$(dirname "$0")/_common.sh"
setup_node

echo "Using $(node -v) at $(command -v node)"
echo "Typecheck..."
node node_modules/typescript/bin/tsc --noEmit
echo "Build..."
node node_modules/vite/bin/vite.js build
echo "Done. Output: ${ROOT_DIR}/dist/"
