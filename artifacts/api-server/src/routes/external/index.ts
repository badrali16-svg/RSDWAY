/**
 * External Integration API
 * ========================
 * Allows Odoo (or any external system) to submit DTTS operations via API Key.
 *
 * Authentication:
 *   Include header:  X-API-Key: rsd_<your-key>
 *
 * Key management endpoints (require user session login):
 *   GET    /api/external/keys          — list your API keys
 *   POST   /api/external/keys          — create a new key
 *   DELETE /api/external/keys/:id      — revoke a key
 *
 * Operation endpoints (require X-API-Key header):
 *   POST /api/external/v1/dispatch
 *   POST /api/external/v1/dispatch-cancel
 *   POST /api/external/v1/dispatch-batch
 *   POST /api/external/v1/dispatch-cancel-batch
 *   POST /api/external/v1/accept
 *   POST /api/external/v1/accept-dispatch
 *   POST /api/external/v1/accept-batch
 *   POST /api/external/v1/return
 *   POST /api/external/v1/return-batch
 *   POST /api/external/v1/transfer
 *   POST /api/external/v1/transfer-cancel
 *   POST /api/external/v1/transfer-batch
 *   POST /api/external/v1/transfer-cancel-batch
 *   POST /api/external/v1/import
 *   POST /api/external/v1/supply
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { db, operationLogsTable, apiKeysTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";
import { callSoap, buildProductListXml, extractNotificationId } from "../../lib/soapProxy";
import { getCredentialsForUser } from "../../lib/authStore";
import { requireAuth } from "../../middlewares/requireAuth";

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function svcEndpoint(baseUrl: string, svc: string, op?: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${svc}/${op ?? svc}`;
}

function buildBatchXml(products: Array<{ GTIN: string; BN?: string; XD?: string; QUANTITY: number }>): string {
  if (!products?.length) return "<PRODUCTLIST/>";
  return `<PRODUCTLIST>${products.map(p =>
    `<PRODUCT><GTIN>${p.GTIN}</GTIN>${p.BN ? `<BN>${p.BN}</BN>` : ""}${p.XD ? `<XD>${p.XD}</XD>` : ""}<QUANTITY>${p.QUANTITY}</QUANTITY></PRODUCT>`
  ).join("")}</PRODUCTLIST>`;
}

interface KeyInfo {
  userId: number;
  role: string;
  permissions: string[];
}

// Validate X-API-Key and return key owner info (userId, role, permissions)
async function resolveApiKey(req: Request, res: Response): Promise<KeyInfo | null> {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    res.status(401).json({ success: false, error: "Missing X-API-Key header. Include your API key in the request header: X-API-Key: rsd_..." });
    return null;
  }
  const [keyRow] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyValue, apiKey), eq(apiKeysTable.enabled, true)))
    .limit(1);
  if (!keyRow) {
    res.status(401).json({ success: false, error: "Invalid or disabled API key." });
    return null;
  }
  // Update last used timestamp (fire-and-forget)
  db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, keyRow.id)).catch(() => {});

  // Fetch user to get current role + permissions
  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, keyRow.userId)).limit(1);
  if (!userRow) {
    res.status(401).json({ success: false, error: "API key owner no longer exists." });
    return null;
  }
  return { userId: keyRow.userId, role: userRow.role, permissions: userRow.permissions ?? [] };
}

// Run a DTTS SOAP call on behalf of the API key owner, enforcing op permissions
async function proxyExternal(
  opSlug: string,
  operation: string,
  svcName: string,
  soapBody: string,
  requestPayload: object,
  keyInfo: KeyInfo,
  res: Response
): Promise<void> {
  // Operation permission check — admin bypasses all
  if (keyInfo.role !== "admin" && !keyInfo.permissions.includes(opSlug)) {
    res.status(403).json({
      success: false,
      error: `العملية '${operation}' غير مصرّح بها لصاحب مفتاح API هذا. يرجى التواصل مع المدير لتفعيلها.`,
      rawXml: null,
      notificationId: null,
    });
    return;
  }
  const creds = await getCredentialsForUser(keyInfo.userId);
  if (!creds) {
    res.status(400).json({
      success: false,
      error: "DTTS credentials not configured for this API key owner. Please configure them in Settings.",
      rawXml: null,
      notificationId: null,
    });
    return;
  }
  const endpoint = svcEndpoint(creds.baseUrl ?? "https://tandttest.sfda.gov.sa/ws", svcName);
  const result = await callSoap({ endpoint, action: "", body: soapBody, username: creds.username, password: creds.password });
  const notificationId = result.rawXml ? extractNotificationId(result.rawXml) : null;
  await db.insert(operationLogsTable).values({
    operation: `[API] ${operation}`,
    requestPayload: JSON.stringify(requestPayload),
    responsePayload: result.rawXml,
    success: result.success,
    notificationId,
  });
  res.json({ success: result.success, rawXml: result.rawXml, error: result.error, notificationId });
}

// ── KEY MANAGEMENT (session auth) ─────────────────────────────────────────────

// GET /api/external/keys — list keys for logged-in user
router.get("/external/keys", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session!.user!.id;
  const rows = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      enabled: apiKeysTable.enabled,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
      keyValue: apiKeysTable.keyValue,
    })
    .from(apiKeysTable)
    .where(eq(apiKeysTable.userId, userId));

  res.json(rows.map(k => ({
    id: k.id,
    name: k.name,
    enabled: k.enabled,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    keyPreview: `${k.keyValue.slice(0, 12)}...${k.keyValue.slice(-4)}`,
  })));
});

// POST /api/external/keys — create a new API key
router.post("/external/keys", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session!.user!.id;
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const keyValue = `rsd_${crypto.randomBytes(28).toString("hex")}`;
  const [row] = await db
    .insert(apiKeysTable)
    .values({ userId, name: name.trim(), keyValue, enabled: true })
    .returning();
  res.json({ id: row.id, name: row.name, key: keyValue, createdAt: row.createdAt });
});

// DELETE /api/external/keys/:id — revoke a key
router.delete("/external/keys/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session!.user!.id;
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(apiKeysTable).where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));
  res.json({ success: true });
});

// ── EXTERNAL OPERATION ENDPOINTS (API key auth) ───────────────────────────────

type ExtendedRequest = Request & { keyInfo?: KeyInfo };

async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const keyInfo = await resolveApiKey(req, res);
  if (keyInfo === null) return;
  (req as ExtendedRequest).keyInfo = keyInfo;
  next();
}

router.use("/external/v1", apiKeyMiddleware as (req: Request, res: Response, next: NextFunction) => void);

function getKeyInfo(req: Request): KeyInfo {
  return (req as ExtendedRequest).keyInfo!;
}

// DISPATCH
router.post("/external/v1/dispatch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</dis:DispatchServiceRequest>`;
  await proxyExternal("op:dispatch", "Dispatch", "DispatchService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/dispatch-cancel", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchCancelServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchCancelService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</dis:DispatchCancelServiceRequest>`;
  await proxyExternal("op:dispatch-cancel", "DispatchCancel", "DispatchCancelService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/dispatch-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchBatchServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</dis:DispatchBatchServiceRequest>`;
  await proxyExternal("op:dispatch-batch", "DispatchBatch", "DispatchBatchService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/dispatch-cancel-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchCancelBatchServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchCancelBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</dis:DispatchCancelBatchServiceRequest>`;
  await proxyExternal("op:dispatch-cancel-batch", "DispatchCancelBatch", "DispatchCancelBatchService", body, req.body, getKeyInfo(req), res);
});

// ACCEPT
router.post("/external/v1/accept", async (req, res): Promise<void> => {
  const { fromGLN, products } = req.body;
  const body = `<acc:AcceptServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptService"><FROMGLN>${fromGLN}</FROMGLN>${buildProductListXml(products)}</acc:AcceptServiceRequest>`;
  await proxyExternal("op:accept", "Accept", "AcceptService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/accept-dispatch", async (req, res): Promise<void> => {
  const { dispatchNotificationId } = req.body;
  const body = `<acc:AcceptDispatchServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptDispatchService"><DISPATCHNOTIFICATIONID>${dispatchNotificationId}</DISPATCHNOTIFICATIONID></acc:AcceptDispatchServiceRequest>`;
  await proxyExternal("op:accept-dispatch", "AcceptDispatch", "AcceptDispatchService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/accept-batch", async (req, res): Promise<void> => {
  const { fromGLN, products } = req.body;
  const body = `<acc:AcceptBatchServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptBatchService"><FROMGLN>${fromGLN}</FROMGLN>${buildBatchXml(products)}</acc:AcceptBatchServiceRequest>`;
  await proxyExternal("op:accept-batch", "AcceptBatch", "AcceptBatchService", body, req.body, getKeyInfo(req), res);
});

// RETURN
router.post("/external/v1/return", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<ret:ReturnServiceRequest xmlns:ret="http://dtts.sfda.gov.sa/ReturnService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</ret:ReturnServiceRequest>`;
  await proxyExternal("op:return", "Return", "ReturnService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/return-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<ret:ReturnBatchServiceRequest xmlns:ret="http://dtts.sfda.gov.sa/ReturnBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</ret:ReturnBatchServiceRequest>`;
  await proxyExternal("op:return-batch", "ReturnBatch", "ReturnBatchService", body, req.body, getKeyInfo(req), res);
});

// TRANSFER
router.post("/external/v1/transfer", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</tran:TransferServiceRequest>`;
  await proxyExternal("op:transfer", "Transfer", "TransferService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/transfer-cancel", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferCancelServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferCancelService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</tran:TransferCancelServiceRequest>`;
  await proxyExternal("op:transfer-cancel", "TransferCancel", "TransferCancelService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/transfer-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferBatchServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</tran:TransferBatchServiceRequest>`;
  await proxyExternal("op:transfer-batch", "TransferBatch", "TransferBatchService", body, req.body, getKeyInfo(req), res);
});

router.post("/external/v1/transfer-cancel-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferCancelBatchServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferCancelBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</tran:TransferCancelBatchServiceRequest>`;
  await proxyExternal("op:transfer-cancel-batch", "TransferCancelBatch", "TransferCancelBatchService", body, req.body, getKeyInfo(req), res);
});

// IMPORT
router.post("/external/v1/import", async (req, res): Promise<void> => {
  const { GTIN, MD, XD, BN, serialNumbers } = req.body;
  const sns = (serialNumbers as string[] ?? []).map((sn: string) => `<SN>${sn}</SN>`).join("");
  const body = `<imp:ImportServiceRequest xmlns:imp="http://dtts.sfda.gov.sa/ImportService"><GTIN>${GTIN}</GTIN><MD>${MD}</MD><XD>${XD}</XD><BN>${BN}</BN><SERIALNUMBERS>${sns}</SERIALNUMBERS></imp:ImportServiceRequest>`;
  await proxyExternal("op:import", "Import", "ImportService", body, req.body, getKeyInfo(req), res);
});

// SUPPLY
router.post("/external/v1/supply", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<sup:SupplyServiceRequest xmlns:sup="http://dtts.sfda.gov.sa/SupplyService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</sup:SupplyServiceRequest>`;
  await proxyExternal("op:supply", "Supply", "SupplyService", body, req.body, getKeyInfo(req), res);
});

export default router;
