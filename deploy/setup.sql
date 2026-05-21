-- ══════════════════════════════════════════════════════════════════
-- Rasid Integration Portal — Database Setup Script
-- Run this ONCE after creating your PostgreSQL database on Render
-- ══════════════════════════════════════════════════════════════════

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  permissions   JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Session table (for express-session / connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);

-- 3. Auth config table (DTTS credentials per user)
CREATE TABLE IF NOT EXISTS auth_config (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL,
  username           TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  base_url           TEXT NOT NULL DEFAULT 'https://tandttest.sfda.gov.sa',
  updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_config_user_id_unique ON auth_config (user_id);

-- 4. Operation logs table
CREATE TABLE IF NOT EXISTS operation_logs (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER,
  operation        TEXT NOT NULL,
  request_payload  TEXT NOT NULL,
  response_payload TEXT,
  success          BOOLEAN NOT NULL DEFAULT FALSE,
  notification_id  TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL,
  name         TEXT NOT NULL,
  key_value    TEXT NOT NULL UNIQUE,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- 6. Clients table
CREATE TABLE IF NOT EXISTS clients (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL,
  name           TEXT NOT NULL,
  gln            TEXT NOT NULL,
  gln_owner_name TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_gln_unique ON clients (user_id, gln);

-- ══════════════════════════════════════════════════════════════════
-- 7. Default Admin user
--    Username : Admin
--    Password : Ash@123456
-- ══════════════════════════════════════════════════════════════════
INSERT INTO users (username, password_hash, role, permissions, is_active)
VALUES (
  'Admin',
  '$2b$10$nE14G08mGyohGzL1qXTpGuGZJfSuDX/m8zdNaU0OgQXia0FhTiVtO',
  'admin',
  '[]',
  TRUE
)
ON CONFLICT (username) DO NOTHING;

-- Done!
SELECT 'Database setup complete. Tables created and admin user seeded.' AS status;
