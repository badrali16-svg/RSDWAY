#!/bin/bash
set -e

echo "▶  Installing pnpm to writable location..."
npm install pnpm --prefix /tmp/pnpm-local --silent
export PATH="/tmp/pnpm-local/node_modules/.bin:$PATH"
echo "✔  pnpm $(pnpm --version) ready"

echo "▶  Installing workspace dependencies..."
pnpm install --frozen-lockfile

echo "▶  Building frontend + API server..."
bash scripts/deploy-build.sh

echo "▶  Installing production dependencies..."
cd deploy && npm install --omit=dev

echo "✅  Build complete"
