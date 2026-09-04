import { Router, type IRouter } from "express";
import { activeSessionsTable, db, usersTable, pool } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { acquireUserSessionLock, verifyPassword, type SessionUser } from "../lib/sessionAuth";
import { randomUUID } from "node:crypto";
import {
  getCurrentSessionStatus,
  SESSION_REPLACED_CODE,
  SESSION_REPLACED_MESSAGE,
} from "../middlewares/requireAuth";

const router: IRouter = Router();

router.post("/session/login", async (req, res): Promise<void> => {
  const { username, password, deviceId } = req.body as {
    username?: string;
    password?: string;
    deviceId?: string;
  };
  if (!username || !password || !deviceId) {
    res.status(400).json({ error: "username, password and deviceId are required" });
    return;
  }
  if (deviceId.length < 8 || deviceId.length > 200) {
    res.status(400).json({ error: "Invalid deviceId" });
    return;
  }
  const rows = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (rows.length === 0) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const row = rows[0];
  if (!row.isActive) {
    res.status(403).json({ error: "Account is inactive. Please contact the administrator." });
    return;
  }
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const user: SessionUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
  };
  const sessionToken = randomUUID();
  const releaseLock = await acquireUserSessionLock(row.id);
  const previousActiveSessions = await db
    .select()
    .from(activeSessionsTable)
    .where(eq(activeSessionsTable.userId, row.id))
    .limit(1);
  const previousActiveSession = previousActiveSessions[0];

  try {
    await db
      .insert(activeSessionsTable)
      .values({
        userId: row.id,
        deviceId,
        sessionToken,
        lastActivity: new Date(),
      })
      .onConflictDoUpdate({
        target: activeSessionsTable.userId,
        set: {
          deviceId,
          sessionToken,
          lastActivity: new Date(),
        },
      });

    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    req.session.user = user;
    req.session.deviceId = deviceId;
    req.session.sessionToken = sessionToken;

    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    if (previousActiveSession) {
      await db
        .insert(activeSessionsTable)
        .values(previousActiveSession)
        .onConflictDoUpdate({
          target: activeSessionsTable.userId,
          set: {
            deviceId: previousActiveSession.deviceId,
            sessionToken: previousActiveSession.sessionToken,
            lastActivity: previousActiveSession.lastActivity,
          },
        });
    } else {
      await db
        .delete(activeSessionsTable)
        .where(and(
          eq(activeSessionsTable.userId, row.id),
          eq(activeSessionsTable.sessionToken, sessionToken),
        ));
    }
    throw error;
  } finally {
    await releaseLock();
  }

  res.json({ id: user.id, username: user.username, role: user.role, permissions: user.permissions });
});

router.post("/session/logout", async (req, res): Promise<void> => {
  if (req.session?.user && req.session.sessionToken) {
    await db
      .delete(activeSessionsTable)
      .where(and(
        eq(activeSessionsTable.userId, req.session.user.id),
        eq(activeSessionsTable.sessionToken, req.session.sessionToken),
      ));
  }
  req.session.destroy(() => {
    res.clearCookie("rasid.sid");
    res.json({ ok: true });
  });
});

router.get("/session/me", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");

  if (!req.session?.user) {
    res.json({ user: null });
    return;
  }

  const sessionStatus = await getCurrentSessionStatus(req);
  if (!sessionStatus.valid) {
    req.session.destroy(() => {});
    res.clearCookie("rasid.sid");
    if (sessionStatus.replaced) {
      res.status(401).json({
        error: SESSION_REPLACED_MESSAGE,
        code: SESSION_REPLACED_CODE,
      });
      return;
    }
    res.json({ user: null });
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.id, req.session.user.id)).limit(1);
  if (rows.length === 0 || !rows[0].isActive) {
    req.session.destroy(() => {});
    res.json({ user: null });
    return;
  }

  const row = rows[0];
  const freshUser: SessionUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: row.permissions ?? [],
  };
  req.session.user = freshUser;
  res.json({ user: { id: freshUser.id, username: freshUser.username, role: freshUser.role, permissions: freshUser.permissions } });
});

// Emergency endpoint: verifies credentials then wipes ALL sessions for that user
// so the user can log in fresh from any device/browser.
router.post("/session/reset", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  const rows = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (rows.length === 0) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const row = rows[0];
  if (!row.isActive) {
    res.status(403).json({ error: "Account is inactive" });
    return;
  }
  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  try {
    await db.delete(activeSessionsTable).where(eq(activeSessionsTable.userId, row.id));
    await pool.query(
      `DELETE FROM session WHERE sess::jsonb -> 'user' ->> 'id' = $1`,
      [String(row.id)],
    );
  } catch {
    // Best-effort
  }
  res.json({ ok: true });
});

router.post("/session/unlock-settings", async (req, res): Promise<void> => {
  const sessionStatus = await getCurrentSessionStatus(req);
  if (!sessionStatus.valid) {
    req.session.destroy(() => {});
    res.clearCookie("rasid.sid");
    if (sessionStatus.replaced) {
      res.status(401).json({
        ok: false,
        error: SESSION_REPLACED_MESSAGE,
        code: SESSION_REPLACED_CODE,
      });
      return;
    }
    res.status(401).json({ ok: false, error: "Not logged in" });
    return;
  }
  const { password } = req.body as { password?: string };
  const rows = await db
    .select({ passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.user!.id))
    .limit(1);
  if (password && rows.length > 0 && await verifyPassword(password, rows[0].passwordHash)) {
    res.json({ ok: true });
    return;
  }
  res.status(401).json({ ok: false });
});

export default router;
