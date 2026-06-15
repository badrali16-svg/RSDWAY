import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS error_code TEXT;
    `);
    logger.info("DB migrations applied successfully");
  } catch (err) {
    logger.error({ err }, "DB migration failed");
  } finally {
    client.release();
  }
}
