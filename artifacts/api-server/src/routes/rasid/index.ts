import { Router } from "express";
import type { IRouter } from "express";
import { db, operationLogsTable, authConfigTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { callSoap, buildProductListXml, extractNotificationId } from "../../lib/soapProxy";
import { getCredentialsForUser, clearCredentialCacheForUser } from "../../lib/authStore";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ── helpers ─────────────────────────────────────────────────────────────────
const BASE_URL = "https://tandttest.sfda.gov.sa/ws";

function svcUrl(svc: string): string {
  return `${BASE_URL}/${svc}/${svc}`;
}

async function proxy(
  operation: string,
  endpoint: string,
  soapBody: string,
  requestPayload: object,
  req: import("express").Request,
  res: import("express").Response
): Promise<void> {
  const userId = req.session?.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: "Not logged in", rawXml: null, notificationId: null });
    return;
  }
  const creds = await getCredentialsForUser(userId);
  if (!creds) {
    res.status(401).json({ success: false, error: "لم يتم ضبط بيانات اعتماد رصد. يرجى الذهاب إلى الإعدادات وحفظ اسم المستخدم وكلمة المرور.", rawXml: null, notificationId: null });
    return;
  }

  const result = await callSoap({
    endpoint,
    action: "",
    body: soapBody,
    username: creds.username,
    password: creds.password,
  });

  const notificationId = result.rawXml ? extractNotificationId(result.rawXml) : null;

  await db.insert(operationLogsTable).values({
    operation,
    requestPayload: JSON.stringify(requestPayload),
    responsePayload: result.rawXml,
    success: result.success,
    notificationId,
  });

  res.json({
    success: result.success,
    rawXml: result.rawXml,
    error: result.error,
    notificationId,
  });
}

// ── AUTH CONFIG (per logged-in user) ─────────────────────────────────────────
router.get("/auth/config", async (req, res): Promise<void> => {
  const userId = req.session?.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  const rows = await db
    .select()
    .from(authConfigTable)
    .where(eq(authConfigTable.userId, userId))
    .limit(1);
  if (rows.length === 0) {
    res.json({ username: "", hasPassword: false, baseUrl: "https://tandttest.sfda.gov.sa" });
    return;
  }
  const row = rows[0];
  res.json({ username: row.username, hasPassword: !!row.passwordEncrypted, baseUrl: row.baseUrl });
});

router.post("/auth/config", async (req, res): Promise<void> => {
  const userId = req.session?.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  const { username, password, baseUrl } = req.body as { username: string; password: string; baseUrl: string };
  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  const finalBaseUrl = baseUrl || "https://tandttest.sfda.gov.sa";
  const existing = await db
    .select()
    .from(authConfigTable)
    .where(eq(authConfigTable.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(authConfigTable)
      .set({ username, passwordEncrypted: password, baseUrl: finalBaseUrl, updatedAt: new Date() })
      .where(eq(authConfigTable.userId, userId));
  } else {
    await db.insert(authConfigTable).values({
      userId,
      username,
      passwordEncrypted: password,
      baseUrl: finalBaseUrl,
    });
  }

  clearCredentialCacheForUser(userId);
  res.json({ username, hasPassword: true, baseUrl: finalBaseUrl });
});

// ── IMPORT ───────────────────────────────────────────────────────────────────
router.post("/rasid/import", async (req, res): Promise<void> => {
  const { GTIN, MD, XD, BN, serialNumbers } = req.body;
  const snList = (serialNumbers as string[]).map((sn: string) => `<SN>${sn}</SN>`).join("");
  const body = `<imp:ImportServiceRequest xmlns:imp="http://dtts.sfda.gov.sa/ImportService">
  <MD>${MD}</MD><GTIN>${GTIN}</GTIN><XD>${XD}</XD><BN>${BN}</BN>
  <SNREQUESTLIST>${snList}</SNREQUESTLIST>
</imp:ImportServiceRequest>`;
  await proxy("Import", svcUrl("ImportService"), body, req.body, req, res);
});

router.post("/rasid/import-cancel", async (req, res): Promise<void> => {
  const { products } = req.body;
  const body = `<imp:ImportCancelServiceRequest xmlns:imp="http://dtts.sfda.gov.sa/ImportCancelService">
  ${buildProductListXml(products)}
</imp:ImportCancelServiceRequest>`;
  await proxy("ImportCancel", svcUrl("ImportCancelService"), body, req.body, req, res);
});

// ── SUPPLY ───────────────────────────────────────────────────────────────────
router.post("/rasid/supply", async (req, res): Promise<void> => {
  const { GTIN, MD, XD, BN, serialNumbers } = req.body;
  const snList = (serialNumbers as string[]).map((sn: string) => `<SN>${sn}</SN>`).join("");
  const body = `<sup:SupplyServiceRequest xmlns:sup="http://dtts.sfda.gov.sa/SupplyService">
  <MD>${MD}</MD><GTIN>${GTIN}</GTIN><XD>${XD}</XD><BN>${BN}</BN>
  <SNREQUESTLIST>${snList}</SNREQUESTLIST>
</sup:SupplyServiceRequest>`;
  await proxy("Supply", svcUrl("SupplyService"), body, req.body, req, res);
});

router.post("/rasid/supply-cancel", async (req, res): Promise<void> => {
  const { products } = req.body;
  const body = `<sup:SupplyCancelServiceRequest xmlns:sup="http://dtts.sfda.gov.sa/SupplyCancelService">
  ${buildProductListXml(products)}
</sup:SupplyCancelServiceRequest>`;
  await proxy("SupplyCancel", svcUrl("SupplyCancelService"), body, req.body, req, res);
});

// ── DISPATCH ─────────────────────────────────────────────────────────────────
router.post("/rasid/dispatch", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchService">
  <TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}
</dis:DispatchServiceRequest>`;
  await proxy("Dispatch", svcUrl("DispatchService"), body, req.body, req, res);
});

router.post("/rasid/dispatch-cancel", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<dis:DispatchCancelServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchCancelService">
  <TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}
</dis:DispatchCancelServiceRequest>`;
  await proxy("DispatchCancel", svcUrl("DispatchCancelService"), body, req.body, req, res);
});

// ── ACCEPT ───────────────────────────────────────────────────────────────────
router.post("/rasid/accept", async (req, res): Promise<void> => {
  const { fromGLN, products } = req.body;
  const body = `<acc:AcceptServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptService">
  <FROMGLN>${fromGLN}</FROMGLN>${buildProductListXml(products)}
</acc:AcceptServiceRequest>`;
  await proxy("Accept", svcUrl("AcceptService"), body, req.body, req, res);
});

router.post("/rasid/accept-dispatch", async (req, res): Promise<void> => {
  const { dispatchNotificationId } = req.body;
  const body = `<acc:AcceptDispatchServiceRequest xmlns:acc="http://dtts.sfda.gov.sa/AcceptDispatchService">
  <DISPATCHNOTIFICATIONID>${dispatchNotificationId}</DISPATCHNOTIFICATIONID>
</acc:AcceptDispatchServiceRequest>`;
  await proxy("AcceptDispatch", svcUrl("AcceptDispatchService"), body, req.body, req, res);
});

// ── RETURN ───────────────────────────────────────────────────────────────────
router.post("/rasid/return", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<ret:ReturnServiceRequest xmlns:ret="http://dtts.sfda.gov.sa/ReturnService">
  <TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}
</ret:ReturnServiceRequest>`;
  await proxy("Return", svcUrl("ReturnService"), body, req.body, req, res);
});

// ── CONSUME ──────────────────────────────────────────────────────────────────
router.post("/rasid/consume", async (req, res): Promise<void> => {
  const { products } = req.body;
  const body = `<con:ConsumeServiceRequest xmlns:con="http://dtts.sfda.gov.sa/ConsumeService">
  ${buildProductListXml(products)}
</con:ConsumeServiceRequest>`;
  await proxy("Consume", svcUrl("ConsumeService"), body, req.body, req, res);
});

router.post("/rasid/consume-cancel", async (req, res): Promise<void> => {
  const { products } = req.body;
  const body = `<con:ConsumeCancelServiceRequest xmlns:con="http://dtts.sfda.gov.sa/ConsumeCancelService">
  ${buildProductListXml(products)}
</con:ConsumeCancelServiceRequest>`;
  await proxy("ConsumeCancel", svcUrl("ConsumeCancelService"), body, req.body, req, res);
});

// ── TRANSFER ─────────────────────────────────────────────────────────────────
router.post("/rasid/transfer", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferService">
  <TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}
</tran:TransferServiceRequest>`;
  await proxy("Transfer", svcUrl("TransferService"), body, req.body, req, res);
});

router.post("/rasid/transfer-cancel", async (req, res): Promise<void> => {
  const { toGLN, products } = req.body;
  const body = `<tran:TransferCancelServiceRequest xmlns:tran="http://dtts.sfda.gov.sa/TransferCancelService">
  <TOGLN>${toGLN}</TOGLN>${buildProductListXml(products)}
</tran:TransferCancelServiceRequest>`;
  await proxy("TransferCancel", svcUrl("TransferCancelService"), body, req.body, req, res);
});

// ── PHARMACY SALE ────────────────────────────────────────────────────────────
router.post("/rasid/pharmacy-sale", async (req, res): Promise<void> => {
  const { toGLN, doctorId, patientNationalId, prescriptionId, prescriptionDate, products } = req.body;
  const body = `<phar:PharmacySaleServiceRequest xmlns:phar="http://dtts.sfda.gov.sa/PharmacySaleService">
  <TOGLN>${toGLN}</TOGLN>
  ${doctorId ? `<DOCTORID>${doctorId}</DOCTORID>` : "<DOCTORID/>"}
  ${patientNationalId ? `<PATIENTNATIONALID>${patientNationalId}</PATIENTNATIONALID>` : "<PATIENTNATIONALID/>"}
  <PRESCRIPTIONID>${prescriptionId}</PRESCRIPTIONID>
  <PRESCRIPTIONDATE>${prescriptionDate}</PRESCRIPTIONDATE>
  ${buildProductListXml(products)}
</phar:PharmacySaleServiceRequest>`;
  await proxy("PharmacySale", svcUrl("PharmacySaleService"), body, req.body, req, res);
});

router.post("/rasid/pharmacy-sale-cancel", async (req, res): Promise<void> => {
  const { toGLN, prescriptionId, products } = req.body;
  const body = `<phar:PharmacySaleCancelServiceRequest xmlns:phar="http://dtts.sfda.gov.sa/PharmacySaleCancelService">
  <TOGLN>${toGLN}</TOGLN>
  <PRESCRIPTIONID>${prescriptionId}</PRESCRIPTIONID>
  ${buildProductListXml(products)}
</phar:PharmacySaleCancelServiceRequest>`;
  await proxy("PharmacySaleCancel", svcUrl("PharmacySaleCancelService"), body, req.body, req, res);
});

// ── DEACTIVATION ─────────────────────────────────────────────────────────────
router.post("/rasid/deactivation", async (req, res): Promise<void> => {
  const { DR, explanation, products } = req.body;
  const body = `<deac:DeactivationServiceRequest xmlns:deac="http://dtts.sfda.gov.sa/DeactivationService">
  <DR>${DR}</DR><EXPLANATION>${explanation}</EXPLANATION>
  ${buildProductListXml(products)}
</deac:DeactivationServiceRequest>`;
  await proxy("Deactivation", svcUrl("DeactivationService"), body, req.body, req, res);
});

router.post("/rasid/deactivation-cancel", async (req, res): Promise<void> => {
  const { products } = req.body;
  const body = `<deac:DeactivationCancelServiceRequest xmlns:deac="http://dtts.sfda.gov.sa/DeactivationCancelService">
  ${buildProductListXml(products)}
</deac:DeactivationCancelServiceRequest>`;
  await proxy("DeactivationCancel", svcUrl("DeactivationCancelService"), body, req.body, req, res);
});

// ── EXPORT ───────────────────────────────────────────────────────────────────
router.post("/rasid/export", async (req, res): Promise<void> => {
  const { countryCode, products } = req.body;
  const body = `<exp:ExportServiceRequest xmlns:exp="http://dtts.sfda.gov.sa/ExportService">
  <COUNTRYCODE>${countryCode}</COUNTRYCODE>
  ${buildProductListXml(products)}
</exp:ExportServiceRequest>`;
  await proxy("Export", svcUrl("ExportService"), body, req.body, req, res);
});

router.post("/rasid/export-cancel", async (req, res): Promise<void> => {
  const { products } = req.body;
  const body = `<exp:ExportCancelServiceRequest xmlns:exp="http://dtts.sfda.gov.sa/ExportCancelService">
  ${buildProductListXml(products)}
</exp:ExportCancelServiceRequest>`;
  await proxy("ExportCancel", svcUrl("ExportCancelService"), body, req.body, req, res);
});

// ── PACKAGE TRANSFER ─────────────────────────────────────────────────────────
router.post("/rasid/package-upload", async (req, res): Promise<void> => {
  const { toGLN, fileBase64 } = req.body;
  const body = `<pac:PackageUploadServiceRequest xmlns:pac="http://dtts.sfda.gov.sa/PackageUploadService">
  <TOGLN>${toGLN}</TOGLN><FILE>${fileBase64}</FILE>
</pac:PackageUploadServiceRequest>`;
  await proxy("PackageUpload", svcUrl("PackageUploadService"), body, req.body, req, res);
});

router.post("/rasid/package-download", async (req, res): Promise<void> => {
  const { transferId } = req.body;
  const body = `<pac:PackageDownloadServiceRequest xmlns:pac="http://dtts.sfda.gov.sa/PackageDownloadService">
  <TRANSFERID>${transferId}</TRANSFERID>
</pac:PackageDownloadServiceRequest>`;
  await proxy("PackageDownload", svcUrl("PackageDownloadService"), body, req.body, req, res);
});

router.post("/rasid/package-query", async (req, res): Promise<void> => {
  const { fromGLN, toGLN, getAll, startDate, endDate } = req.body;
  const body = `<pac:PackageQueryServiceRequest xmlns:pac="http://dtts.sfda.gov.sa/PackageQueryService">
  ${fromGLN ? `<FROMGLN>${fromGLN}</FROMGLN>` : "<FROMGLN/>"}
  ${toGLN ? `<TOGLN>${toGLN}</TOGLN>` : "<TOGLN/>"}
  <GETALL>${getAll ? "true" : "false"}</GETALL>
  ${startDate ? `<STARTDATE>${startDate}</STARTDATE>` : ""}
  ${endDate ? `<ENDDATE>${endDate}</ENDDATE>` : ""}
</pac:PackageQueryServiceRequest>`;
  await proxy("PackageQuery", svcUrl("PackageQueryService"), body, req.body, req, res);
});

// ── QUERY UTILITIES ──────────────────────────────────────────────────────────
router.post("/rasid/check-status", async (req, res): Promise<void> => {
  const { products } = req.body;
  const body = `<chec:CheckStatusServiceRequest xmlns:chec="http://dtts.sfda.gov.sa/CheckStatusService">
  ${buildProductListXml(products)}
</chec:CheckStatusServiceRequest>`;
  await proxy("CheckStatus", svcUrl("CheckStatusService"), body, req.body, req, res);
});

router.post("/rasid/dispatch-detail", async (req, res): Promise<void> => {
  const { dispatchNotificationId } = req.body;
  const body = `<dis:DispatchDetailServiceRequest xmlns:dis="http://dtts.sfda.gov.sa/DispatchDetailService">
  <DISPATCHNOTIFICATIONID>${dispatchNotificationId}</DISPATCHNOTIFICATIONID>
</dis:DispatchDetailServiceRequest>`;
  await proxy("DispatchDetail", svcUrl("DispatchDetailService"), body, req.body, req, res);
});

router.post("/rasid/country-list", async (req, res): Promise<void> => {
  const body = `<coun:CountryListServiceRequest xmlns:coun="http://dtts.sfda.gov.sa/CountryListService"/>`;
  await proxy("CountryList", svcUrl("CountryListService"), body, {}, req, res);
});

router.post("/rasid/city-list", async (req, res): Promise<void> => {
  const body = `<cit:CityListServiceRequest xmlns:cit="http://dtts.sfda.gov.sa/CityListService"/>`;
  await proxy("CityList", svcUrl("CityListService"), body, {}, req, res);
});

router.post("/rasid/drug-list", async (req, res): Promise<void> => {
  const { drugStatus } = req.body ?? {};
  const body = `<drug:DrugListServiceRequest xmlns:drug="http://dtts.sfda.gov.sa/DrugListService">
  ${drugStatus != null ? `<DRUGSTATUS>${drugStatus}</DRUGSTATUS>` : ""}
</drug:DrugListServiceRequest>`;
  await proxy("DrugList", svcUrl("DrugListService"), body, req.body ?? {}, req, res);
});

router.post("/rasid/error-code-list", async (req, res): Promise<void> => {
  const body = `<err:ErrorCodeListServiceRequest xmlns:err="http://dtts.sfda.gov.sa/ErrorCodeListService"/>`;
  await proxy("ErrorCodeList", svcUrl("ErrorCodeListService"), body, {}, req, res);
});

router.post("/rasid/stakeholder-list", async (req, res): Promise<void> => {
  const { stakeholderType, getAll, cityId } = req.body ?? {};
  const body = `<stak:StakeholderListServiceRequest xmlns:stak="http://dtts.sfda.gov.sa/StakeholderListService">
  ${stakeholderType != null ? `<STAKEHOLDERTYPE>${stakeholderType}</STAKEHOLDERTYPE>` : ""}
  <GETALL>${getAll ? "true" : "false"}</GETALL>
  ${cityId != null ? `<CITYID>${cityId}</CITYID>` : "<CITYID/>"}
</stak:StakeholderListServiceRequest>`;
  await proxy("StakeholderList", svcUrl("StakeholderListService"), body, req.body ?? {}, req, res);
});

// ── HISTORY ──────────────────────────────────────────────────────────────────
router.get("/rasid/history", async (_req, res): Promise<void> => {
  const logs = await db
    .select()
    .from(operationLogsTable)
    .orderBy(desc(operationLogsTable.createdAt))
    .limit(100);
  res.json(logs.map(l => ({
    id: l.id,
    operation: l.operation,
    requestPayload: l.requestPayload,
    responsePayload: l.responsePayload,
    success: l.success,
    notificationId: l.notificationId,
    createdAt: l.createdAt.toISOString(),
  })));
});

export default router;
