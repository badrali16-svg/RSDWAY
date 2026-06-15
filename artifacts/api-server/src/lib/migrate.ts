import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Add error_code column if missing
    await client.query(`
      ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS error_code TEXT;
    `);

    // 2. Fix old records: notification_id = '-1' means the operation actually failed
    const r1 = await client.query(`
      UPDATE operation_logs
      SET success = false
      WHERE success = true
        AND notification_id = '-1';
    `);
    if (r1.rowCount && r1.rowCount > 0) {
      logger.info({ fixed: r1.rowCount }, "Fixed old records with notification_id=-1");
    }

    // 3. Fix old records: response XML contains a non-zero <FC> code → failed
    const r2 = await client.query(`
      UPDATE operation_logs
      SET success = false
      WHERE success = true
        AND response_payload IS NOT NULL
        AND response_payload ~* '<fc>(?!00000)[^<]+</fc>';
    `);
    if (r2.rowCount && r2.rowCount > 0) {
      logger.info({ fixed: r2.rowCount }, "Fixed old records with FC error codes");
    }

    // 4. Fix old records: response XML contains a SOAP Fault element → failed
    const r3 = await client.query(`
      UPDATE operation_logs
      SET success = false
      WHERE success = true
        AND response_payload IS NOT NULL
        AND response_payload ~* '<[a-zA-Z_:]*[Ff]ault[^>]*>';
    `);
    if (r3.rowCount && r3.rowCount > 0) {
      logger.info({ fixed: r3.rowCount }, "Fixed old records with SOAP Fault");
    }

    logger.info("DB migrations applied successfully");
  } catch (err) {
    logger.error({ err }, "DB migration failed");
  } finally {
    client.release();
  }
}
