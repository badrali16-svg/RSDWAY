import { db, authConfigTable } from "@workspace/db";

export interface AuthCredentials {
  username: string;
  password: string;
  baseUrl: string;
}

let cachedCreds: AuthCredentials | null = null;

export async function getCredentials(): Promise<AuthCredentials | null> {
  if (cachedCreds) return cachedCreds;
  const rows = await db.select().from(authConfigTable).limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  cachedCreds = {
    username: row.username,
    password: row.passwordEncrypted,
    baseUrl: row.baseUrl,
  };
  return cachedCreds;
}

export function clearCredentialCache(): void {
  cachedCreds = null;
}
