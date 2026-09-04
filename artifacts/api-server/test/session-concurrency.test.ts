import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { sql } from "drizzle-orm";
import {
  activeSessionsTable,
  db,
  pool,
  sessionTable,
  usersTable,
} from "@workspace/db";
import sessionRouter from "../src/routes/session";
import { requireAuth, SESSION_REPLACED_CODE } from "../src/middlewares/requireAuth";
import {
  hashPassword,
  observeSessionLockAttemptsForTests,
} from "../src/lib/sessionAuth";

const TEST_PASSWORD = "concurrency-test-password";
const TEST_TIMEOUT_MS = 5_000;
const testUsernames = new Set<string>();
const lockAttemptWaiters = new Map<number, Array<(processId: number) => void>>();
let baseUrl = "";
let server: ReturnType<ReturnType<typeof express>["listen"]>;
let protectedActions = 0;

function cookieFrom(response: Response): string {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "login should set a session cookie");
  return setCookie.split(";", 1)[0];
}

async function login(username: string, deviceId: string): Promise<{ cookie: string; response: Response }> {
  const response = await fetch(`${baseUrl}/api/session/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password: TEST_PASSWORD, deviceId }),
  });
  assert.equal(response.status, 200, await response.text());
  return { cookie: cookieFrom(response), response };
}

async function protectedRequest(cookie: string, signal?: AbortSignal): Promise<Response> {
  return fetch(`${baseUrl}/api/test/protected-action`, {
    method: "POST",
    headers: { cookie },
    signal,
  });
}

async function createUser(): Promise<{ id: number; username: string }> {
  const username = `session-race-${process.pid}-${Date.now()}-${testUsernames.size}`;
  testUsernames.add(username);
  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      passwordHash: await hashPassword(TEST_PASSWORD),
      role: "client",
      permissions: [],
    })
    .returning({ id: usersTable.id, username: usersTable.username });
  return user;
}

async function withUserLock<T>(userId: number, run: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [userId]);
    return await run();
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [userId]);
    client.release();
  }
}

function nextLockAttempt(userId: number): Promise<number> {
  return new Promise((resolve) => {
    const waiters = lockAttemptWaiters.get(userId) ?? [];
    waiters.push(resolve);
    lockAttemptWaiters.set(userId, waiters);
  });
}

async function waitForAdvisoryLockQueue(processId: number): Promise<void> {
  await withTimeout((async () => {
    while (true) {
      const result = await pool.query<{
        wait_event_type: string | null;
        wait_event: string | null;
      }>(
        `SELECT wait_event_type, wait_event
         FROM pg_stat_activity
         WHERE pid = $1`,
        [processId],
      );
      if (
        result.rows[0]?.wait_event_type === "Lock" &&
        result.rows[0]?.wait_event === "advisory"
      ) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  })(), `connection ${processId} to enter the advisory lock queue`);
}

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out`)), TEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

before(async () => {
  observeSessionLockAttemptsForTests(({ userId, processId }) => {
    const waiters = lockAttemptWaiters.get(userId);
    const resolve = waiters?.shift();
    if (waiters?.length === 0) lockAttemptWaiters.delete(userId);
    resolve?.(processId);
  });
  const app = express();
  app.use(express.json());
  const PgStore = connectPgSimple(session);
  app.use(session({
    name: "rasid.sid",
    store: new PgStore({ pool, tableName: "session", createTableIfMissing: false }),
    secret: process.env.SESSION_SECRET ?? "test-only-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false },
  }));
  app.use("/api", sessionRouter);
  app.post("/api/test/protected-action", requireAuth, (_req, res) => {
    protectedActions += 1;
    res.json({ ok: true });
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  observeSessionLockAttemptsForTests(undefined);
  await db.delete(activeSessionsTable).where(
    sql`${activeSessionsTable.userId} in (
      select ${usersTable.id} from ${usersTable}
      where ${usersTable.username} like 'session-race-%'
    )`,
  );
  await db.delete(sessionTable).where(
    sql`${sessionTable.sess}::jsonb -> 'user' ->> 'username' like 'session-race-%'`,
  );
  await db.delete(usersTable).where(
    sql`${usersTable.username} like 'session-race-%'`,
  );
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  await pool.end();
});

test("a new login replaces an old session before its queued protected action can run", async () => {
  const user = await createUser();
  const oldLogin = await login(user.username, "old-device");
  protectedActions = 0;

  let newLoginPromise!: Promise<{ cookie: string; response: Response }>;
  let oldActionPromise!: Promise<Response>;
  await withUserLock(user.id, async () => {
    const newLoginLockAttempt = nextLockAttempt(user.id);
    newLoginPromise = login(user.username, "new-device");
    await waitForAdvisoryLockQueue(await newLoginLockAttempt);
    const oldActionLockAttempt = nextLockAttempt(user.id);
    oldActionPromise = protectedRequest(oldLogin.cookie);
    await waitForAdvisoryLockQueue(await oldActionLockAttempt);
  });

  await withTimeout(newLoginPromise, "new login");
  const oldAction = await withTimeout(oldActionPromise, "old protected action");
  assert.equal(oldAction.status, 401);
  assert.equal((await oldAction.json() as { code?: string }).code, SESSION_REPLACED_CODE);
  assert.equal(protectedActions, 0);
});

test("overlapping logins leave only the last queued login valid", async () => {
  const user = await createUser();
  let firstLoginPromise!: Promise<{ cookie: string; response: Response }>;
  let secondLoginPromise!: Promise<{ cookie: string; response: Response }>;

  await withUserLock(user.id, async () => {
    const firstLockAttempt = nextLockAttempt(user.id);
    firstLoginPromise = login(user.username, "first-device");
    await waitForAdvisoryLockQueue(await firstLockAttempt);
    const secondLockAttempt = nextLockAttempt(user.id);
    secondLoginPromise = login(user.username, "second-device");
    await waitForAdvisoryLockQueue(await secondLockAttempt);
  });

  const firstLogin = await withTimeout(firstLoginPromise, "first login");
  const secondLogin = await withTimeout(secondLoginPromise, "second login");
  assert.equal((await protectedRequest(firstLogin.cookie)).status, 401);
  assert.equal((await protectedRequest(secondLogin.cookie)).status, 200);
});

test("an aborted protected request releases its lock so the next login does not hang", async () => {
  const user = await createUser();
  const oldLogin = await login(user.username, "abort-device");
  const controller = new AbortController();
  let abortedRequest!: Promise<Response>;

  await withUserLock(user.id, async () => {
    const protectedLockAttempt = nextLockAttempt(user.id);
    abortedRequest = protectedRequest(oldLogin.cookie, controller.signal);
    await waitForAdvisoryLockQueue(await protectedLockAttempt);
    controller.abort();
    await assert.rejects(abortedRequest, { name: "AbortError" });
  });

  const replacement = await withTimeout(
    login(user.username, "replacement-device"),
    "login after browser abort",
  );
  assert.equal((await protectedRequest(replacement.cookie)).status, 200);
});