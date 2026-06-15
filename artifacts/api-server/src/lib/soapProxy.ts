import { logger } from "./logger";

export interface SoapCallOptions {
  endpoint: string;
  action: string;
  body: string;
  username: string;
  password: string;
}

export interface SoapResult {
  success: boolean;
  rawXml: string | null;
  error: string | null;
  faultCode: string | null;
}

// FC error code descriptions (from DTTS documentation)
const FC_MESSAGES: Record<string, string> = {
  "00000": "نجاح",
  // Auth errors
  "401":   "غير مصرح — بيانات الاعتماد مفقودة",
  "80000": "بيانات الاعتماد غير صحيحة (اسم المستخدم أو كلمة المرور خاطئة)",
  "80001": "المستخدم غير موجود في النظام",
  "80002": "المستخدم غير مفعّل",
  "80003": "كلمة المرور منتهية الصلاحية",
  // Product / GTIN errors
  "10001": "GTIN غير مسجّل في النظام",
  "10002": "الرقم التسلسلي مكرر",
  "10003": "تاريخ الإنتاج أكبر من اليوم",
  "10004": "تاريخ الانتهاء أقل من اليوم",
  "10005": "الرقم التسلسلي غير موجود",
  "10006": "حالة المنتج لا تسمح بهذه العملية",
  "10007": "GTIN غير مرتبط بالمنشأة",
  "10008": "كمية غير صالحة",
  "10009": "بيانات المنتج غير مكتملة",
  "11037": "صيغة GTIN لمعلومات المنتج غير صالحة",
  // GLN / Stakeholder errors
  "20001": "GLN المُرسَل إليه غير موجود",
  "20002": "GLN المُرسِل غير موجود",
  "20003": "GLN غير مرتبط بالمنشأة",
  "20004": "نوع المنشأة لا يدعم هذه العملية",
  // Dispatch / Batch errors
  "21000": "خطأ في طلب الإرسال",
  "21001": "الإشعار غير موجود",
  "21002": "الإشعار منتهي الصلاحية",
  "21003": "الإشعار مُستخدم مسبقاً",
  "21030": "صيغة بيانات الدُفعة (Batch) غير صالحة",
  "21031": "رقم الدُفعة (BN) غير صالح",
  "21032": "تاريخ انتهاء الصلاحية غير صالح",
  // Notification errors
  "30001": "رقم الإشعار غير موجود",
  "30002": "الإشعار لا ينتمي لهذه المنشأة",
};

function extractFaultCode(xml: string): string | null {
  const fcMatch = xml.match(/<FC>([^<]+)<\/FC>/i);
  if (fcMatch) return fcMatch[1].trim();
  const faultStringMatch = xml.match(/<faultstring>([^<]+)<\/faultstring>/i);
  if (faultStringMatch) return faultStringMatch[1].trim();
  return null;
}

function hasSoapFault(xml: string): boolean {
  return /<[Ss](OAP-ENV|oapenv|SOAP-ENV)?:?Fault/i.test(xml) ||
         /<S:Fault/i.test(xml);
}

export async function callSoap(opts: SoapCallOptions): Promise<SoapResult> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Header/>
  <soapenv:Body>
    ${opts.body}
  </soapenv:Body>
</soapenv:Envelope>`;

  const credentials = Buffer.from(`${opts.username}:${opts.password}`).toString("base64");

  try {
    const response = await fetch(opts.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": opts.action,
        "Authorization": `Basic ${credentials}`,
      },
      body: envelope,
    });

    const rawXml = await response.text();
    const faultCode = rawXml ? extractFaultCode(rawXml) : null;

    if (!response.ok) {
      logger.warn({ status: response.status, endpoint: opts.endpoint, faultCode }, "SOAP call failed");
      const fcMsg = faultCode ? (FC_MESSAGES[faultCode] ?? `كود الخطأ: ${faultCode}`) : null;
      const error = fcMsg ?? `HTTP ${response.status}: ${response.statusText}`;
      return { success: false, rawXml, error, faultCode };
    }

    // Even with HTTP 200, check for SOAP faults in the body
    if (hasSoapFault(rawXml)) {
      const fcMsg = faultCode ? (FC_MESSAGES[faultCode] ?? `كود الخطأ: ${faultCode}`) : "خطأ في المعالجة";
      logger.warn({ endpoint: opts.endpoint, faultCode }, "SOAP fault in 200 response");
      return { success: false, rawXml, error: fcMsg, faultCode };
    }

    // SFDA sometimes returns HTTP 200 with <FC> error code but no SOAP Fault element
    // Any non-zero FC code means the operation failed
    if (faultCode && faultCode !== "00000") {
      const fcMsg = FC_MESSAGES[faultCode] ?? `كود الخطأ: ${faultCode}`;
      logger.warn({ endpoint: opts.endpoint, faultCode }, "SFDA returned FC error code in 200 response");
      return { success: false, rawXml, error: fcMsg, faultCode };
    }

    return { success: true, rawXml, error: null, faultCode };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, endpoint: opts.endpoint }, "SOAP call error");
    return { success: false, rawXml: null, error: msg, faultCode: null };
  }
}

export function buildProductListXml(products: Array<{ GTIN: string; SN?: string | null; BN?: string | null; XD?: string | null; QUANTITY?: number | null }>): string {
  return `<PRODUCTLIST>${products.map(p => {
    const sn = p.SN != null && p.SN !== "" ? `<SN>${p.SN}</SN>` : "";
    const bn = p.BN != null && p.BN !== "" ? `<BN>${p.BN}</BN>` : "";
    const xd = p.XD != null && p.XD !== "" ? `<XD>${p.XD}</XD>` : "";
    const qty = p.QUANTITY != null && Number(p.QUANTITY) > 0 ? `<QUANTITY>${p.QUANTITY}</QUANTITY>` : "";
    return `<PRODUCT><GTIN>${p.GTIN}</GTIN>${sn}${bn}${xd}${qty}</PRODUCT>`;
  }).join("")}</PRODUCTLIST>`;
}

export function extractNotificationId(xml: string): string | null {
  const match = xml.match(/<NOTIFICATIONID>([^<]+)<\/NOTIFICATIONID>/i) ||
                xml.match(/<NOTIFICATION_ID>([^<]+)<\/NOTIFICATION_ID>/i);
  return match ? match[1] : null;
}

export function parseXmlToObject(xml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const tagRegex = /<([A-Z_][A-Z0-9_]*)(?:\s[^>]*)?>([^<]*)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(xml)) !== null) {
    result[m[1]] = m[2].trim();
  }
  return result;
}
