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
 *
 * Odoo mapping:
 *   Receipt (incoming)           → accept  / accept-batch
 *   Delivery (outgoing)          → dispatch / dispatch-batch
 *   Return picking               → return   / return-batch
 *   Internal transfer            → transfer / transfer-batch
 *   Vendor return (reverse recv) → dispatch-cancel / dispatch-cancel-batch
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { db, operationLogsTable, apiKeysTable } from "@workspace/db";
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

// Validate X-API-Key and return the associated userId
async function resolveApiKey(req: Request, res: Response): Promise<number | null> {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || typeof apiKey !== "string") {
    res.status(401).json({ success: false, error: "Missing X-API-Key header. Include your API key in the request header: X-API-Key: rsd_..." });
    return null;
  }
  const [row] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyValue, apiKey), eq(apiKeysTable.enabled, true)))
    .limit(1);
  if (!row) {
    res.status(401).json({ success: false, error: "Invalid or disabled API key." });
    return null;
  }
  // Update last used timestamp (fire-and-forget)
  db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, row.id)).catch(() => {});
  return row.userId;
}

// Run a DTTS SOAP call on behalf of the API key owner
async function proxyExternal(
  operation: string,
  svcName: string,
  soapBody: string,
  requestPayload: object,
  userId: number,
  res: Response
): Promise<void> {
  const creds = await getCredentialsForUser(userId);
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
  // Return the full key only once — store only in DB
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

// Middleware that resolves the API key for all /external/v1/* routes
async function apiKeyMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = await resolveApiKey(req, res);
  if (userId === null) return;
  (req as Request & { apiKeyUserId?: number }).apiKeyUserId = userId;
  next();
}

router.use("/external/v1", apiKeyMiddleware as (req: Request, res: Response, next: NextFunction) => void);

function getUserId(req: Request): number {
  return (req as Request & { apiKeyUserId?: number }).apiKeyUserId!;
}

// DISPATCH
router.post("/external/v1/dispatch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</dis:DispatchServiceRequest>`;
  await proxyExternal("Dispatch", "DispatchService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/dispatch-cancel", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchCancelServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchCancelService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</dis:DispatchCancelServiceRequest>`;
  await proxyExternal("DispatchCancel", "DispatchCancelService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/dispatch-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchBatchServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</dis:DispatchBatchServiceRequest>`;
  await proxyExternal("DispatchBatch", "DispatchBatchService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/dispatch-cancel-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchCancelBatchServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchCancelBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</dis:DispatchCancelBatchServiceRequest>`;
  await proxyExternal("DispatchCancelBatch", "DispatchCancelBatchService", body, req.body, getUserId(req), res);
});

// ACCEPT
router.post("/external/v1/accept", async (req, res): Promise<void> => {
  const { fromGLN, products } = req.body;
  const body = `<acc:AcceptServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptService"><FROMGLN>${fromGLN}</FROMGLN>${buildProductListXml(products)}</acc:AcceptServiceRequest>`;
  await proxyExternal("Accept", "AcceptService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/accept-dispatch", async (req, res): Promise<void> => {
  const { dispatchNotificationId } = req.body;
  const body = `<acc:AcceptDispatchServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptDispatchService"><DISPATCHNOTIFICATIONID>${dispatchNotificationId}</DISPATCHNOTIFICATIONID></acc:AcceptDispatchServiceRequest>`;
  await proxyExternal("AcceptDispatch", "AcceptDispatchService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/accept-batch", async (req, res): Promise<void> => {
  const { fromGLN, products } = req.body;
  const body = `<acc:AcceptBatchServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptBatchService"><FROMGLN>${fromGLN}</FROMGLN>${buildBatchXml(products)}</acc:AcceptBatchServiceRequest>`;
  await proxyExternal("AcceptBatch", "AcceptBatchService", body, req.body, getUserId(req), res);
});

// RETURN
router.post("/external/v1/return", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<ret:ReturnServiceRequest xmlns:ret="http://dtts.sfda.gov.sa/ReturnService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</ret:ReturnServiceRequest>`;
  await proxyExternal("Return", "ReturnService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/return-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<ret:ReturnBatchServiceRequest xmlns:ret="http://dtts.sfda.gov.sa/ReturnBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</ret:ReturnBatchServiceRequest>`;
  await proxyExternal("ReturnBatch", "ReturnBatchService", body, req.body, getUserId(req), res);
});

// TRANSFER
router.post("/external/v1/transfer", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</tran:TransferServiceRequest>`;
  await proxyExternal("Transfer", "TransferService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/transfer-cancel", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferCancelServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferCancelService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</tran:TransferCancelServiceRequest>`;
  await proxyExternal("TransferCancel", "TransferCancelService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/transfer-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferBatchServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</tran:TransferBatchServiceRequest>`;
  await proxyExternal("TransferBatch", "TransferBatchService", body, req.body, getUserId(req), res);
});

router.post("/external/v1/transfer-cancel-batch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferCancelBatchServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferCancelBatchService"><TOGLN>${toGLN}</TOGLN>${buildBatchXml(products)}</tran:TransferCancelBatchServiceRequest>`;
  await proxyExternal("TransferCancelBatch", "TransferCancelBatchService", body, req.body, getUserId(req), res);
});

// IMPORT
router.post("/external/v1/import", async (req, res): Promise<void> => {
  const { GTIN, MD, XD, BN, serialNumbers } = req.body;
  const sns = (serialNumbers as string[] ?? []).map((sn: string) => `<SN>${sn}</SN>`).join("");
  const body = `<imp:ImportServiceRequest xmlns:imp="http://dtts.sfda.gov.sa/ImportService"><GTIN>${GTIN}</GTIN><MD>${MD}</MD><XD>${XD}</XD><BN>${BN}</BN><SERIALNUMBERS>${sns}</SERIALNUMBERS></imp:ImportServiceRequest>`;
  await proxyExternal("Import", "ImportService", body, req.body, getUserId(req), res);
});

// SUPPLY
router.post("/external/v1/supply", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<sup:SupplyServiceRequest xmlns:sup="http://dtts.sfda.gov.sa/SupplyService"><TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}</sup:SupplyServiceRequest>`;
  await proxyExternal("Supply", "SupplyService", body, req.body, getUserId(req), res);
});

export default router;
