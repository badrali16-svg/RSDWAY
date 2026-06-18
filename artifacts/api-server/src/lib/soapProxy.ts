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
  "00000": "العملية التي تم تنفيذها على المنتج ناجحة",
  // Auth
  "401":   "غير مصرح — بيانات الاعتماد مفقودة",
  "80000": "اسم المستخدم أو كلمة المرور غير صحيحة",
  "80001": "اسم المستخدم فارغ",
  "80002": "كلمة المرور فارغة",
  "80003": "كلمة المرور منتهية الصلاحية",
  "80004": "تم حظرك مؤقتاً، الرجاء المحاولة في وقت لاحق",
  "80005": "تم إلغاء تنشيط المستخدم",
  "80100": "خطأ في قاعدة البيانات",
  "80199": "لم يتم العثور على اسم المستخدم لصاحب المصلحة",
  "80200": "لم يتم العثور على صاحب المصلحة",
  "80201": "نوع صاحب المصلحة غير صالح",
  "80202": "صيغة GLN غير صالحة",
  // Product / GTIN
  "10007": "هذا الرقم التسلسلي قد تم تسجيله سابقاً",
  "10008": "خطأ غير محدد",
  "10201": "منتج غير معرّف",
  "10202": "منتج منتهي الصلاحية (لا يمكن تنفيذ هذه العملية)",
  "10203": "معلومات المنتج متناقضة",
  "10204": "المنتج المحدد قد تم بيعه سابقاً",
  "10205": "هذه العملية ممنوعة على هذا المنتج",
  "10206": "خطأ في قاعدة البيانات",
  "10207": "هذا المنتج قد تم تصديره سابقاً",
  "10209": "المنتج مسجل في مخزون صيدلية أخرى",
  "10210": "المنتج مسجل في مخزونك",
  "10211": "المنتج غير مسجل في مخزونك",
  "10215": "تم تعليق هذا المنتج لا تستطيع القيام بهذه العملية",
  "10216": "تم سحب هذا المنتج لا تستطيع القيام بهذه العملية",
  "10219": "العملية التي تريد إلغائها لا تخصك",
  "10221": "لا يمكن إلغاء بيع المنتج",
  "10223": "المنتج قد تم تسجيله في مخزونك سابقاً",
  "10230": "تم استهلاك المنتج سابقاً",
  "10231": "تم استهلاك المنتج",
  "10232": "المنتج تم استهلاكه من قبل صاحب مصلحة آخر",
  "10233": "انتهت فترة إلغاء الاستهلاك للمنتج",
  "10234": "المنتج لم يتم استهلاكه",
  // Input validation
  "11001": "صاحب المصلحة المرسل غير نشط، لا يمكن إرسال أي إشعار",
  "11003": "رقم الموقع العالمي لصاحب المصلحة غير محدد",
  "11004": "الأدوية غير محددة (رقم بند التجارة العالمية غير موجود)",
  "11005": "صاحب المصلحة غير مصرح له لتزويد هذا الدواء",
  "11011": "حقل نوع المنتج مفقود أو غير صحيح — يتم قبول الدواء فقط",
  "11012": "حقل رقم الدفعة غير موجود أو غير صالح",
  "11017": "لم يتم إدخال معلومات الرقم التسلسلي للمنتجات",
  "11018": "معلومات رقم الموقع العالمي للمرسل مفقودة أو غير صالحة",
  "11019": "معلومات المستلم مفقودة أو غير صالحة",
  "11023": "ليس لديك صلاحية لاستخدام هذه الخدمة",
  "11031": "بنية بيانات XML المرسلة غير متوافقة مع النظام في وثيقة WSDL",
  "11032": "صيغة الرقم التسلسلي غير صالحة",
  "11035": "صيغة تاريخ انتهاء الصلاحية للمنتج غير صالحة",
  "11036": "صيغة رقم الدفعة للمنتج غير صالحة",
  "11037": "صيغة رقم بند التجارة العالمي لمعلومات المنتج غير صالحة",
  "11038": "لا يمكن أن يتجاوز تاريخ انتهاء الصلاحية تاريخ الإنتاج بأكثر من 7 سنوات",
  "11042": "لديك كمية فعالة أقل من الكمية المرسلة، يرجى التحقق من كمية الدواء الفعالة",
  "11045": "تم سحب رقم الدفعة المحدد",
  "11208": "معلومات المكان المقصود غير صالحة",
  "11801": "مستوى المنتج غير محدد",
  "11802": "الرقم التسلسلي غير صالح",
  "11807": "لا يمكن لصاحب المصلحة المقصود استلام هذا الدواء",
  "11810": "صاحب المصلحة غير مصرح له للأدوية البشرية",
  "11811": "صاحب المصلحة غير مصرح له للأدوية البيطرية",
  "11813": "يمنع التصدير للبلد الذي تم اختياره",
  "11814": "المستخدم المرسل غير نشط، لا يمكن إجراء هذه العملية",
  "11815": "يجب أن يكون صاحب المصلحة المقصود مختلفاً عن صاحب المصلحة المرسل",
  "11816": "صاحب المصلحة المستلم غير نشط",
  "11819": "لم يتم العثور على إشعار الإرسال لمعرّف الإشعار المحدد",
  "11901": "المستخدم غير مصرح له بهذه الخدمة. يرجى التواصل مع المسؤول",
  "11902": "المستلم المحدد غير مسجّل في النظام",
  "11904": "المستلم المحدد غير نشط",
  "11905": "البائع المحدد غير نشط",
  // Package transfer
  "20001": "معلومات رقم الموقع العالمي للمصدر مفقودة",
  "20002": "معلومات رقم الموقع العالمي للمستهدف مفقودة",
  "20003": "لا يمكن للمستخدم إرسال طرد لهذه الشركة",
  "20004": "لا يمكن للمستخدم استلام طرد لهذه الشركة",
  "20008": "لا يمكن العثور على معرّف النقل في النظام",
  "20201": "نوع صاحب المصلحة غير صالح",
  // Dispatch / Batch
  "21000": "تاريخ الوصفة الطبية غير صالح",
  "21001": "صيغة معرّف النقل غير صحيحة — يجب أن يحتوي على أرقام فقط",
  "21002": "صيغة GLN المستلم غير مناسبة — يجب أن يتكون من 13 رقماً",
  "21003": "صيغة الحزمة غير معتمدة — تأكد من أن الحزمة بصيغة ZIP",
  "21013": "صيغة GLN المرسل غير مناسبة — يجب أن يتكون من 13 رقماً",
  "21017": "صاحب المصلحة غير مصرح بهذه العملية",
  "21018": "حالة الباركود غير معرّفة، تواصل مع مسؤول النظام",
  "21019": "سبب غير محدد",
  "21020": "سبب إلغاء التنشيط غير صالح",
  "21021": "GLN المستهدف غير صالح",
  "21022": "يمكن بيع هذا الدواء فقط للمستشفيات",
  "21023": "لا يمكن إلغاء عملية متعلقة بصاحب مصلحة آخر",
  "21026": "المستخدم غير صحيح",
  "21030": "يرجى التحقق من حالة اشتراك نقاط صحة والتأكد من أنه فعّال",
  // Quota
  "30001": "تم تجاوز القيمة النسبية",
  // Product status
  "40001": "المنتج غير مسجل بمخزونك",
  "40004": "لقد قمت ببيع هذا المنتج سابقاً",
  "40005": "تم سحب هذا المنتج",
  "40006": "هذا المنتج منتهي الصلاحية",
  // System
  "50000": "حدث خطأ في النظام. تواصل مع مسؤول النظام",
  "50004": "لا يمكن استلام رقم الإشعار",
  // Product query
  "60000": "تم إلغاء تنشيط المنتج سابقاً",
  "60001": "المنتج في حالة غير نشط",
  "60005": "تم تصدير المنتج",
  "60006": "تم استهلاك المنتج",
  "60007": "تم سحب المنتج",
  "60013": "لا يمكنك تنفيذ أي عملية على هذا المنتج",
  "60016": "المنتج غير نشط",
  "60021": "المنتج تم سحبه",
  "60022": "المنتج تم إيقافه",
  "60050": "هذا الدواء لا يمكن تصديره",
  // Block
  "99000": "لا توجد عملية إيقاف مرتبطة بمعرّف الإشعار هذا",
  "99001": "عملية إلغاء الحظر غير ناجحة",
  "99002": "تم إلغاء عملية الحظر سابقاً",
  "99111": "تمت عملية الإيقاف على GTIN/BN — نفّذ عملية الاستدعاء في شاشة الحظر أولاً",
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

/**
 * Mirrors the frontend parseDttsResponse + getDttsStatus logic.
 * Returns { success, faultCode } based on the actual DTTS XML content.
 *
 * Rules (same as frontend):
 *  - success  : top-level RC == "00000" AND no per-product failures
 *  - partial  : RC == "00000" BUT some units failed → treated as FAILED for logging
 *  - failed   : RC != "00000" OR all products failed
 */
function analyzeDttsXml(xml: string): { success: boolean; faultCode: string | null } {
  // Strip PRODUCT blocks to get top-level only
  const xmlNoProducts = xml.replace(/<PRODUCT\b[^>]*>[\s\S]*?<\/PRODUCT>/gi, "");

  // Top-level RC (RESPONSECODE or RC tag, outside PRODUCT blocks)
  const topRcMatch = xmlNoProducts.match(
    /<(?:RESPONSECODE|ResponseCode|responseCode|RC)>([^<]+)<\/(?:RESPONSECODE|ResponseCode|responseCode|RC)>/i
  );
  const topRc = topRcMatch ? topRcMatch[1].trim() : null;

  // Per-product RC codes
  const productBlocks = [...xml.matchAll(/<PRODUCT\b[^>]*>([\s\S]*?)<\/PRODUCT>/gi)];
  const failedRcs: string[] = [];
  for (const block of productBlocks) {
    const inner = block[1];
    const rcm = inner.match(/<RC>([^<]+)<\/RC>/i);
    const rc = rcm ? rcm[1].trim() : "00000";
    if (rc !== "00000") failedRcs.push(rc);
  }

  const totalProducts = productBlocks.length;
  const failedCount = failedRcs.length;

  // Determine success
  let success: boolean;
  let faultCode: string | null = null;

  if (topRc && topRc !== "00000") {
    // Top-level error
    success = false;
    faultCode = topRc;
  } else if (totalProducts > 0 && failedCount > 0) {
    // Some or all products failed (partial or full failure → save as failed)
    success = false;
    faultCode = failedRcs[0] ?? null;
  } else if (topRc === "00000" && failedCount === 0) {
    success = true;
  } else {
    // No RC info found — fall back to FC/SOAP fault checks
    success = true; // will be overridden by caller if needed
  }

  return { success, faultCode };
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

    // Use DTTS-aware XML analysis (mirrors frontend parseDttsResponse logic)
    // Handles: top-level <RC>/<RESPONSECODE>, per-product <RC>, and <FC> codes
    const dtts = analyzeDttsXml(rawXml);
    const effectiveFaultCode = dtts.faultCode ?? faultCode;

    if (!dtts.success) {
      const fcMsg = effectiveFaultCode
        ? (FC_MESSAGES[effectiveFaultCode] ?? `كود الخطأ: ${effectiveFaultCode}`)
        : "فشل تنفيذ العملية";
      logger.warn({ endpoint: opts.endpoint, faultCode: effectiveFaultCode }, "DTTS operation failed");
      return { success: false, rawXml, error: fcMsg, faultCode: effectiveFaultCode };
    }

    // Legacy FC check for responses without RC structure
    if (faultCode && faultCode !== "00000") {
      const fcMsg = FC_MESSAGES[faultCode] ?? `كود الخطأ: ${faultCode}`;
      logger.warn({ endpoint: opts.endpoint, faultCode }, "SFDA returned FC error code in 200 response");
      return { success: false, rawXml, error: fcMsg, faultCode };
    }

    return { success: true, rawXml, error: null, faultCode: effectiveFaultCode };
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
