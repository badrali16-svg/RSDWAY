import { db, authConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthCredentials {
  username: string;
  password: string;
  baseUrl: string;
}

const cache = new Map<number, AuthCredentials>();

export async function getCredentialsForUser(userId: number): Promise<AuthCredentials | null> {
  const cached = cache.get(userId);
  if (cached) return cached;
  const rows = await db
    .select()
    .from(authConfigTable)
    .where(eq(authConfigTable.userId, userId))
    .limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  const creds: AuthCredentials = {
    username: row.username,
    password: row.passwordEncrypted,
    baseUrl: row.baseUrl,
  };
  cache.set(userId, creds);
  return creds;
}

export function clearCredentialCacheForUser(userId: number): void {
  cache.delete(userId);
}
