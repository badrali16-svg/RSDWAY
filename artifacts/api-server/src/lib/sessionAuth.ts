import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export const ALL_PERMISSIONS = [
  "dashboard",
  "import",
  "dispatch",
  "return",
  "transfer",
  "deactivation",
  "packages",
  "queries",
  "history",
] as const;

export const SETTINGS_PASSWORD = "Ash@123456";
const DEFAULT_ADMIN_USERNAME = "Admin";
const DEFAULT_ADMIN_PASSWORD = "Ash@123456";

export interface SessionUser {
  id: number;
  username: string;
  role: "admin" | "client";
  permissions: string[];
}

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function ensureDefaultAdmin(): Promise<void> {
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, DEFAULT_ADMIN_USERNAME)).limit(1);
  if (existing.length > 0) return;
  const passwordHash = await hashPassword(DEFAULT_ADMIN_PASSWORD);
  await db.insert(usersTable).values({
    username: DEFAULT_ADMIN_USERNAME,
    passwordHash,
    role: "admin",
    permissions: [...ALL_PERMISSIONS],
  });
  logger.info("Seeded default admin user");
}
