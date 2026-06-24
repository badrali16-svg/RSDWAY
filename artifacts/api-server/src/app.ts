import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const app: Express = express();

app.set("trust proxy", 1);

// ── Canonical-host redirect ──────────────────────────────────────────────────
// If CANONICAL_HOST is set (e.g. "app.rsdway.com"), any request arriving on a
// different hostname is permanently redirected to the canonical domain.
// This prevents split-session issues when the app is reachable via multiple URLs.
const canonicalHost = process.env["CANONICAL_HOST"];
if (canonicalHost) {
  app.use((req, res, next) => {
    if (req.hostname && req.hostname !== canonicalHost) {
      const redirectUrl = `https://${canonicalHost}${req.originalUrl}`;
      res.redirect(301, redirectUrl);
      return;
    }
    next();
  });
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const PgStore = connectPgSimple(session);

const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

app.use(
  session({
    name: "rasid.sid",
    store: new PgStore({
      pool,
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env["COOKIE_SECURE"] === "true",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.use("/api", router);

// ── Serve built frontend (for standalone / external hosting) ─────────────────
const frontendDir = path.resolve(import.meta.dirname, "../public");
if (existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  // SPA fallback — all non-API routes return index.html (Express 5 requires regex for wildcard)
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });
}

export default app;
