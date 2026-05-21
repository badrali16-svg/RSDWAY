#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Build script — creates a self-contained deploy/ folder ready for cPanel / VPS
# Usage: bash scripts/deploy-build.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

ROOT=$(pwd)
DEPLOY="$ROOT/deploy"

echo "▶  Cleaning previous deploy folder..."
rm -rf "$DEPLOY"
mkdir -p "$DEPLOY/public"

# ── 1. Build frontend ────────────────────────────────────────────────────────
echo "▶  Building frontend..."
cd "$ROOT/artifacts/rasid-integration"
PORT=3000 BASE_PATH=/ pnpm exec vite build --config vite.config.deploy.ts
cp -r dist/public/. "$DEPLOY/public/"
echo "✔  Frontend built → deploy/public/"

# ── 2. Build API server ──────────────────────────────────────────────────────
echo "▶  Building API server..."
cd "$ROOT/artifacts/api-server"
node ./build.mjs
cp -r dist/. "$DEPLOY/dist/"
echo "✔  API server built → deploy/dist/"

# ── 3. Copy pino worker files (required at runtime) ─────────────────────────
cd "$ROOT"

# ── 4. Write deploy/package.json ────────────────────────────────────────────
echo "▶  Writing deploy/package.json..."
cat > "$DEPLOY/package.json" << 'EOF'
{
  "name": "rasid-integration",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node --enable-source-maps ./dist/index.mjs"
  },
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "connect-pg-simple": "^10.0.0",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "drizzle-orm": "^0.41.0",
    "express": "^5.1.0",
    "express-session": "^1.19.0",
    "multer": "^2.1.1",
    "pg": "^8.13.3",
    "pino": "^9.7.0",
    "pino-http": "^10.4.0",
    "pino-pretty": "^13.0.0",
    "thread-stream": "3.1.0",
    "xlsx": "^0.18.5"
  }
}
EOF

# ── 5. Write deploy/.env.example ─────────────────────────────────────────────
cat > "$DEPLOY/.env.example" << 'EOF'
# ──────────────────────────────────────────────────────
# Copy this file to .env and fill in your values
# ──────────────────────────────────────────────────────

# Port the server will listen on (cPanel usually sets this automatically)
PORT=3000

# PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://user:password@localhost:5432/rasid_db

# Session secret — use a long random string (min 32 chars)
SESSION_SECRET=change_this_to_a_random_secret_at_least_32_chars

# Set to "true" if running behind HTTPS (recommended for production)
COOKIE_SECURE=false
EOF

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅  Deploy folder ready at: ./deploy"
echo ""
echo "  Contents:"
echo "    deploy/"
echo "    ├── dist/          ← compiled Node.js server"
echo "    ├── public/        ← built React frontend (static files)"
echo "    ├── package.json"
echo "    └── .env.example   ← copy to .env and fill values"
echo ""
echo "  Next steps:"
echo "    1. cd deploy && npm install"
echo "    2. cp .env.example .env  (fill in your DB + secret)"
echo "    3. npm start"
echo "════════════════════════════════════════════════════════════"
