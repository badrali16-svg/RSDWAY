# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Rasid Integration Portal (`artifacts/rasid-integration`)
- **Path**: `/`
- **Purpose**: Bilingual (Arabic RTL primary) web portal for integrating with Saudi Arabia's SFDA DTTS (رصد) Drug Track & Trace System via SOAP web services.
- **Pages**: Dashboard, Settings (DTTS credentials, password-gated with `Ash@123456`), Import/Supply, Dispatch/Accept, Return/Consume, Transfer/Pharmacy Sale, Deactivation/Export, Package Transfer, Query Services, Operation History, User Management (admin only)
- **Auth**: Whole portal requires login. Default admin = `Admin` / `Ash@123456`. Admin can create client accounts with per-user sidebar visibility (checkbox per nav item). Sessions stored in PostgreSQL (`session` table) via `connect-pg-simple`.
- **Per-user DTTS credentials**: `auth_config` table is keyed by `user_id` (unique). Each user (admin or client) configures their own SFDA Rasid credentials in Settings; SOAP proxy uses the logged-in user's stored credentials. Settings page is always visible to every logged-in user (still gated by the `Ash@123456` password).

### API Server (`artifacts/api-server`)
- **Path**: `/api`
- **Purpose**: REST-to-SOAP proxy that converts JSON requests to SOAP XML and forwards them to the DTTS endpoints. Stores operation logs in PostgreSQL.
- **Key routes**: `/api/auth/config`, `/api/rasid/{operation}`, `/api/rasid/history`

## DTTS Services Supported

All SFDA DTTS SOAP services are proxied via the API server:
- Import / Import Cancel
- Supply / Supply Cancel
- Dispatch / Dispatch Cancel
- Accept / Accept Dispatch
- Return
- Consume / Consume Cancel
- Transfer / Transfer Cancel
- Pharmacy Sale / Pharmacy Sale Cancel
- Deactivation / Deactivation Cancel
- Export / Export Cancel
- Package Upload / Download / Query
- Check Status, Dispatch Detail
- Country List, City List, Drug List, Error Code List, Stakeholder List

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Tables

- `operation_logs` — Stores history of all DTTS operations with request/response payloads, success status, and notification IDs
- `auth_config` — Stores DTTS credentials (username, password, base URL)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
