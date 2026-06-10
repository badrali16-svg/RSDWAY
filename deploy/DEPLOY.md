# Deploying to Render — Step-by-Step Guide

This guide walks you through connecting the GitHub repository to Render so that every push to `main` automatically redeploys the app.

---

## Prerequisites

- A [Render](https://render.com) account
- A [PostgreSQL database](https://render.com/docs/databases) provisioned on Render (or an external Postgres URL)
- The code pushed to: **https://github.com/badrali16-svg/RSDWAY.git**

---

## Option A — Blueprint (Recommended, one-click setup)

Render can read `render.yaml` from the repo root and configure everything automatically.

1. In Render, go to **Blueprints → New Blueprint Instance**.
2. Connect your GitHub account and select the **RSDWAY** repository.
3. Render reads `render.yaml` and shows a preview of the service.
4. Fill in the two secret environment variables it flags as `sync: false`:
   - `DATABASE_URL` — your PostgreSQL connection string (e.g. from a Render Postgres service)
   - `ENCRYPTION_KEY` — a 32-character hex string used to encrypt DTTS passwords at rest
5. Click **Apply** — Render creates the web service and triggers the first deploy.

From this point on, every push to `main` automatically triggers a new deploy.

---

## Option B — Manual Web Service Setup

If you prefer to configure the service by hand:

### 1. Create a new Web Service

1. Render Dashboard → **New → Web Service**
2. Connect GitHub → select **badrali16-svg/RSDWAY**
3. Choose branch: **main**

### 2. Configure Build & Start

| Setting | Value |
|---------|-------|
| **Runtime** | Node |
| **Build Command** | `bash scripts/deploy-build.sh && cd deploy && npm install --omit=dev` |
| **Start Command** | `node --enable-source-maps ./deploy/dist/index.mjs` |

### 3. Set Environment Variables

Go to **Environment** and add:

| Key | Value / Notes |
|-----|---------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Postgres URL — `postgresql://user:pass@host:5432/db?sslmode=require` |
| `SESSION_SECRET` | A random string ≥ 32 characters |
| `COOKIE_SECURE` | `true` |
| `ENCRYPTION_KEY` | A 32-character hex string (generate with `openssl rand -hex 16`) |

### 4. Enable Auto-Deploy

In the service settings, make sure **Auto-Deploy** is set to **Yes**. Render will watch the `main` branch and redeploy on every push.

### 5. Health Check

Set the **Health Check Path** to `/api/healthz` so Render knows when the service is ready.

---

## Database Setup (first deploy only)

After the first successful deploy, run the database migrations from the Render **Shell** tab:

```bash
# Open the Render Shell and run:
cd deploy
node -e "
import('./dist/index.mjs').then(() => {
  console.log('DB tables created via server startup');
});
"
```

Or push the schema directly from your local machine:

```bash
DATABASE_URL=<your_render_db_url> pnpm --filter @workspace/db run push
```

---

## How the Build Pipeline Works

```
git push main
    │
    ▼
render.yaml / Render Build
    │
    ├── bash scripts/deploy-build.sh
    │       ├── vite build (frontend → deploy/public/)
    │       └── esbuild (API server → deploy/dist/)
    │
    ├── cd deploy && npm install --omit=dev
    │
    └── node --enable-source-maps ./deploy/dist/index.mjs
            └── Express serves /api routes + static frontend from public/
```

The `scripts/deploy-build.sh` script at the repo root:
- Builds the React frontend with Vite
- Bundles the Express API server with esbuild
- Assembles everything into `deploy/` (a self-contained production folder)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails at `pnpm exec vite build` | Make sure Render's Node version is ≥ 18; pnpm is auto-installed by the build script |
| `DATABASE_URL` connection error | Add `?sslmode=require` (or `?ssl=true`) to the end of the connection string |
| Session cookies not persisting | Confirm `COOKIE_SECURE=true` and the service is running behind HTTPS |
| `ENCRYPTION_KEY` error on startup | Provide a 32-character hex value: `openssl rand -hex 16` |
| 502 after deploy | Check the **Logs** tab; the health check path `/api/healthz` must return HTTP 200 |
