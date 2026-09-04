import type { Request, Response, NextFunction } from "express";
import { activeSessionsTable, db, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { acquireUserSessionLock } from "../lib/sessionAuth";

export const SESSION_REPLACED_CODE = "SESSION_REPLACED";
export const SESSION_REPLACED_MESSAGE =
  "تم تسجيل الدخول إلى هذا الحساب من جهاز آخر، وتم إنهاء جلستك الحالية.";

type SessionStatus = {
  valid: boolean;
  replaced: boolean;
  active: boolean;
};

export async function getCurrentSessionStatus(req: Request): Promise<SessionStatus> {
  if (!req.session?.user) {
    return { valid: false, replaced: false, active: false };
  }

  const rows = await db
    .select({
      active: usersTable.isActive,
      deviceId: activeSessionsTable.deviceId,
      sessionToken: activeSessionsTable.sessionToken,
    })
    .from(usersTable)
    .leftJoin(activeSessionsTable, eq(activeSessionsTable.userId, usersTable.id))
    .where(eq(usersTable.id, req.session.user.id))
    .limit(1);

  if (rows.length === 0 || !rows[0].active) {
    return { valid: false, replaced: false, active: false };
  }

  const deviceId = req.session.deviceId;
  const sessionToken = req.session.sessionToken;
  const replaced =
    !deviceId ||
    !sessionToken ||
    rows[0].deviceId !== deviceId ||
    rows[0].sessionToken !== sessionToken;

  if (replaced) {
    return { valid: false, replaced: true, active: true };
  }

  await db
    .update(activeSessionsTable)
    .set({ lastActivity: new Date() })
    .where(and(
      eq(activeSessionsTable.userId, req.session.user.id),
      eq(activeSessionsTable.sessionToken, sessionToken),
    ));

  return { valid: true, replaced: false, active: true };
}

function rejectInvalidSession(req: Request, res: Response, replaced: boolean): void {
  if (replaced) {
    res.status(401).json({
      error: SESSION_REPLACED_MESSAGE,
      code: SESSION_REPLACED_CODE,
    });
    return;
  }
  req.session.destroy(() => {});
  res.clearCookie("rasid.sid");
  res.status(401).json({ error: "Not logged in" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session?.user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  const releaseLock = await acquireUserSessionLock(req.session.user.id);
  const release = () => {
    void releaseLock();
  };
  res.once("finish", release);
  res.once("close", release);
  if (res.destroyed) {
    await releaseLock();
    return;
  }
  let status: SessionStatus;
  try {
    status = await getCurrentSessionStatus(req);
  } catch (error) {
    await releaseLock();
    throw error;
  }
  if (!status.valid) {
    await releaseLock();
    rejectInvalidSession(req, res, status.replaced);
    return;
  }
  if (res.destroyed) {
    await releaseLock();
    return;
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.session?.user) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  const releaseLock = await acquireUserSessionLock(req.session.user.id);
  const release = () => {
    void releaseLock();
  };
  res.once("finish", release);
  res.once("close", release);
  if (res.destroyed) {
    await releaseLock();
    return;
  }
  let status: SessionStatus;
  try {
    status = await getCurrentSessionStatus(req);
  } catch (error) {
    await releaseLock();
    throw error;
  }
  if (!status.valid) {
    await releaseLock();
    rejectInvalidSession(req, res, status.replaced);
    return;
  }
  if (req.session.user?.role !== "admin") {
    await releaseLock();
    res.status(403).json({ error: "Admin only" });
    return;
  }
  if (res.destroyed) {
    await releaseLock();
    return;
  }
  next();
}
