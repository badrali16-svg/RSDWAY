import bcrypt from "bcryptjs";
import { db, pool, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export const ALL_NAV_PERMISSIONS = [
  "dashboard",
  "import",
  "dispatch",
  "return",
  "transfer",
  "deactivation",
  "packages",
  "queries",
  "history",
  "clients",
] as const;

export const ALL_OP_PERMISSIONS = [
  "op:import", "op:import-cancel", "op:supply", "op:supply-cancel",
  "op:dispatch", "op:dispatch-cancel", "op:dispatch-batch", "op:dispatch-cancel-batch",
  "op:accept", "op:accept-dispatch", "op:accept-batch",
  "op:return", "op:return-batch", "op:consume", "op:consume-cancel",
  "op:transfer", "op:transfer-cancel", "op:transfer-batch", "op:transfer-cancel-batch",
  "op:pharmacy-sale", "op:pharmacy-sale-cancel",
  "op:deactivation", "op:deactivation-cancel",
  "op:export", "op:export-cancel",
  "op:package-upload", "op:package-download", "op:package-query",
] as const;

export const ALL_SETTINGS_PERMISSIONS = [
  "settings:env:view",  "settings:env:edit",
  "settings:api:view",  "settings:api:edit",
  "settings:dtts:view", "settings:dtts:edit",
] as const;

export const ALL_PERMISSIONS = [
  ...ALL_NAV_PERMISSIONS,
  ...ALL_OP_PERMISSIONS,
  ...ALL_SETTINGS_PERMISSIONS,
] as const;

const DEFAULT_ADMIN_USERNAME = "Admin";

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "client";
  permissions: string[];
}

type SessionLockAttempt = {
  userId: number;
  processId: number;
};

let sessionLockAttemptObserver: ((attempt: SessionLockAttempt) => void) | undefined;

export function observeSessionLockAttemptsForTests(
  observer: ((attempt: SessionLockAttempt) => void) | undefined,
): void {
  sessionLockAttemptObserver = observer;
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
    deviceId?: string;
    sessionToken?: string;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function acquireUserSessionLock(userId: number): Promise<() => Promise<void>> {
  const client = await pool.connect();
  let released = false;
  try {
    if (sessionLockAttemptObserver) {
      const result = await client.query<{ processId: number }>(
        `SELECT pg_backend_pid() AS "processId"`,
      );
      sessionLockAttemptObserver({ userId, processId: result.rows[0].processId });
    }
    await client.query("SELECT pg_advisory_lock($1)", [userId]);
  } catch (error) {
    client.release();
    throw error;
  }

  return async () => {
    if (released) return;
    released = true;
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [userId]);
    } finally {
      client.release();
    }
  };
}

export async function ensureDefaultAdmin(): Promise<void> {
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, DEFAULT_ADMIN_USERNAME)).limit(1);
  if (existing.length > 0) return;
  const defaultAdminPassword = process.env["DEFAULT_ADMIN_PASSWORD"];
  if (!defaultAdminPassword) {
    logger.warn("DEFAULT_ADMIN_PASSWORD is not configured; default admin was not created");
    return;
  }
  const passwordHash = await hashPassword(defaultAdminPassword);
  await db.insert(usersTable).values({
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash,
    role: "admin",
    permissions: [...ALL_PERMISSIONS],
  });
  logger.info("Seeded default admin user");
}
