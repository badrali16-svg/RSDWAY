/** DTTS / RSD error code → Arabic description mapping (from official DTTS documentation) */
export const DTTS_ERROR_CODES: Record<string, string> = {
  "00000": "تم تنفيذ العملية بنجاح",
  "10001": "رقم بند التجارة العالمي (GTIN) غير مسجّل في النظام",
  "10002": "الرقم التسلسلي مكرر",
  "10003": "تاريخ الإنتاج أكبر من اليوم",
  "10004": "تاريخ الانتهاء أقل من اليوم",
  "10100": "المنتج موجود في المخزون",
  "10101": "المنتج غير موجود في المخزون",
  "10200": "المنتج غير صالح للعملية",
  "10201": "الرقم التسلسلي (SN) غير موجود في النظام أو لم يُسجَّل مسبقاً",
  "10202": "المنتج تم تفعيله مسبقاً",
  "10203": "المنتج تم إلغاء تنشيطه مسبقاً",
  "10204": "المنتج تم بيعه سابقاً",
  "10205": "المنتج تم إرجاعه مسبقاً",
  "10206": "المنتج تم تصديره مسبقاً",
  "10207": "المنتج تم نقله مسبقاً",
  "10208": "حالة المنتج لا تتوافق مع هذه العملية",
  "10209": "المنتج تم إرساله مسبقاً",
  "10210": "تم قبول المنتج مسبقاً",
  "10211": "المنتج غير موجود في مخزونك",
  "10212": "المنتج لم يُرسَل إليك",
  "10213": "المنتج تم تدميره مسبقاً",
  "10214": "المنتج تم استهلاكه مسبقاً",
  "10215": "معلومات المنتج غير صحيحة",
  "10216": "لا يمكن قبول منتج أُرسل من نفس المنشأة",
  "10217": "المنتج موجود في طرد مغلق",
  "10300": "المنتج محظور",
  "10301": "تم سحب المنتج",
  "11001": "معلومات المنتج مفقودة",
  "11002": "GTIN مطلوب",
  "11003": "الرقم التسلسلي (SN) مطلوب",
  "11004": "رقم الدفعة (BN) مطلوب",
  "11005": "تاريخ الانتهاء (XD) مطلوب",
  "11006": "تاريخ الإنتاج (MD) مطلوب",
  "11007": "الكمية مطلوبة",
  "11008": "GLN المستلم مطلوب",
  "11009": "GLN المرسل مطلوب",
  "11010": "سبب الإلغاء مطلوب",
  "11011": "معلومات المنتج غير صالحة",
  "11012": "تاريخ الإنتاج غير صالح",
  "11013": "تاريخ الانتهاء غير صالح",
  "11014": "رقم الدفعة غير صالح",
  "11015": "GTIN غير صالح",
  "11016": "الكمية غير صالحة",
  "11017": "لم يتم إدخال الرقم التسلسلي (SN)",
  "11018": "GLN غير صالح",
  "11019": "سبب الإلغاء غير صالح",
  "11020": "رمز الخطأ غير صالح",
  "11021": "تاريخ الانتهاء أقل من تاريخ الإنتاج",
  "11022": "الكمية يجب أن تكون أكبر من صفر",
  "11023": "GTIN يجب أن يتكون من 14 رقماً",
  "11024": "الرقم التسلسلي يتجاوز الطول المسموح به",
  "11025": "رقم الدفعة يتجاوز الطول المسموح به",
  "11026": "صيغة تاريخ الإنتاج غير صالحة",
  "11027": "صيغة تاريخ الانتهاء غير صالحة",
  "11028": "صيغة رقم الدفعة غير صالحة",
  "11029": "صيغة GTIN غير صالحة",
  "11030": "GTIN لم يتم إدخاله",
  "11031": "رقم الإشعار غير صالح",
  "11032": "معرّف الإشعار غير موجود في النظام",
  "11033": "معرّف الإشعار مطلوب",
  "11034": "صيغة تاريخ الانتهاء للمنتج غير صالحة",
  "11035": "صيغة تاريخ الانتهاء للمنتج غير صالحة",
  "11036": "صيغة رقم الدفعة للمنتج غير صالحة",
  "11037": "صيغة GTIN لمعلومات المنتج غير صالحة",
  "11038": "لا يمكن أن يتجاوز تاريخ الانتهاء تاريخ الإنتاج بأكثر من 7 سنوات",
  "11039": "يجب أن يكون أول 13 حرفاً من اسم المستخدم هو نفس رقم GLN",
  "11040": "لم يتم إدخال معلومات المنتج في قائمة المنتجات",
  "11042": "لديك كمية فعالة أقل من الكمية المرسلة، يرجى التحقق من كمية الدواء الفعالة",
  "11045": "تم سحب رقم الدفعة المحدد",
  "11208": "معلومات المكان المقصود غير صالحة",
  "11213": "تم تسجيل رقم الوصفة الطبية سابقاً",
  "11215": "معلومات البائع غير صالحة",
  "11216": "رقم الوصفة الطبية غير مسجّل",
  "11217": "هذه الوصفة الطبية تم الاستعلام عنها من قبل شركة التأمين ولا يمكن إلغاؤها",
  "11218": "خطأ في حذف قاعدة البيانات لإلغاء عملية البيع",
  "11801": "مستوى المنتج غير محدد",
  "11802": "الرقم التسلسلي فارغ أو غير صالح",
  "11803": "مستوى عملية الاستدعاء غير صالح",
  "11804": "مستوى عملية الحظر غير صالح",
  "11805": "لم يتم اتخاذ أي إجراء على المنتج",
  "11806": "يجب ألا يكون رقم الوصفة الطبية فارغاً للأدوية التي تتطلب وصفة",
  "11807": "لا يمكن لصاحب المصلحة المقصود استلام هذا الدواء",
  "11808": "لا يمكن تنفيذ عملية إلغاء التزويد للمنتجات المستوردة",
  "11809": "لا يمكن تنفيذ عملية إلغاء الاستيراد للمنتجات التي تم إنتاجها",
  "11810": "صاحب المصلحة غير مصرح له للأدوية البشرية",
  "11811": "صاحب المصلحة غير مصرح له للأدوية البيطرية",
  "11812": "تمت عملية السحب على رقم الدفعة + GTIN، لا يمكنك إنتاج هذه المنتجات",
  "11813": "يمنع التصدير للبلد الذي تم اختياره",
  "11814": "المستخدم المرسل غير نشط، لا يمكن إجراء هذه العملية",
  "11815": "يجب أن يكون صاحب المصلحة المقصود مختلفاً عن صاحب المصلحة المرسل",
  "11816": "صاحب المصلحة المستلم غير نشط",
  "11817": "لا يمكن أن يكون حقل التوضيح فارغاً",
  "11818": "استخدم إشعار إلغاء التنشيط للوحدات منتهية الصلاحية",
  "11819": "لم يتم العثور على إشعار الإرسال لمعرّف الإشعار المحدد",
  "11901": "المستخدم غير مصرح له بهذه الخدمة. يرجى التواصل مع المسؤول",
  "11902": "المستلم المحدد غير مسجّل في النظام",
  "11903": "صاحب المصلحة بائع غير محدد",
  "11904": "المستلم المحدد غير نشط",
  "11905": "البائع المحدد غير نشط",
  "11906": "نوع صاحب المصلحة للمشتري غير مناسب لهذه العملية",
  "11907": "نوع صاحب المصلحة للبائع غير مناسب لهذه العملية",
  "12001": "معرّف التشخيص غير صحيح أو فارغ",
  "12002": "رمز التشخيص المحدد غير مسجّل في النظام",
  "15000": "معلومات المكان المقصود غير صالحة لإشعار الإرجاع",
  "15001": "لا يمكن تبادل المنتجات مع أصحاب المصلحة في مدينة مختلفة",
  "15010": "تم استخدام رقم الدفعة مع تاريخ انتهاء أو تاريخ إنتاج مختلف سابقاً",
  "15021": "المنتج تم بيعه من قبل المستشفى",
  "15022": "المنتج متوفر في مخزون مستشفى آخر",
  "15023": "خطأ في تفاصيل مبيعات المستشفى",
  "15024": "لم يتم إلغاء تنشيط المنتج",
  "15025": "لم يتم إلغاء تنشيط المنتج من قبلك",
  "15026": "بسبب عفو المخزون، لم يتم إلغاء التنشيط",
  "20001": "معلومات GLN المصدر مفقودة",
  "20002": "معلومات GLN المستهدف مفقودة",
  "20003": "لا يمكن للمستخدم إرسال طرد لهذه الشركة",
  "20004": "لا يمكن للمستخدم استلام طرد لهذه الشركة",
  "20005": "الملف غير موجود في مرفق الخدمة",
  "20006": "لا يمكنك إرسال أكثر من ملف واحد",
  "20007": "صيغة الملف غير مدعومة",
  "20008": "لا يمكن العثور على معرّف النقل في النظام",
  "20009": "الحد الأقصى المسموح به للملف 10 ميغابايت",
  "20010": "حجم الصورة المرسلة يتجاوز الحد المسموح",
  "20100": "لا يمكن للمستخدم استلام معلومات الطرد لهذه الشركة",
  "20201": "نوع صاحب المصلحة غير صالح",
  "21000": "تاريخ الوصفة الطبية غير صالح",
  "21001": "صيغة معرّف النقل غير صحيحة — يجب أن يحتوي على أرقام فقط",
  "21002": "صيغة GLN المستلم غير مناسبة — يجب أن يتكون من 13 رقماً",
  "21013": "صيغة GLN المرسل غير مناسبة — يجب أن يتكون من 13 رقماً",
  "21017": "صاحب المصلحة غير مصرح بهذه العملية",
  "21018": "حالة الباركود غير معرّفة، تواصل مع مسؤول النظام",
  "21019": "سبب غير محدد",
  "21020": "سبب إلغاء التنشيط غير صالح",
  "21021": "GLN المستهدف غير صالح",
  "21030": "يرجى التحقق من حالة اشتراك نقاط صحة والتأكد من أنه فعّال",
  "80000": "اسم المستخدم أو كلمة المرور غير صحيحة",
  "80001": "اسم المستخدم فارغ",
  "80002": "كلمة المرور فارغة",
  "80004": "تم حظرك مؤقتاً، يرجى المحاولة في وقت لاحق",
  "80005": "تم إلغاء تنشيط المستخدم",
  "80100": "خطأ في قاعدة البيانات",
  "80199": "لم يتم العثور على اسم المستخدم لصاحب المصلحة",
  "80200": "لم يتم العثور على صاحب المصلحة",
  "80201": "نوع صاحب المصلحة غير صالح",
  "80202": "صيغة GLN غير صالحة",
  "80209": "خطأ غير محدد",
  "80210": "الحالة غير صحيحة",
  "80506": "المنتج غير موجود",
  "99000": "لا توجد عملية إيقاف مرتبطة بمعرّف الإشعار هذا",
  "99001": "عملية إلغاء الحظر غير ناجحة",
  "99002": "تم إلغاء عملية الحظر سابقاً",
  "99003": "تم استدعاء عملية الحظر ولا يمكن إلغاؤها",
  "99101": "استدعاء عملية الحظر غير ناجح",
  "99103": "تم استدعاء عملية الحظر سابقاً",
  "99111": "تمت عملية الإيقاف على GTIN/BN — نفّذ عملية الاستدعاء في شاشة الحظر أولاً",
};

export function getDttsErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return DTTS_ERROR_CODES[code.trim()] ?? null;
}

export interface DttsParseResult {
  /** Top-level or derived overall response code */
  responseCode: string | null;
  /** Number of products that failed (RC != "00000") */
  unsuccessfulUnitCount: number | null;
  /** Total number of products in the response PRODUCTLIST */
  totalProductCount: number;
  /** Per-product { rc, gtin, sn } — only those with RC != "00000" */
  failedProducts: Array<{ rc: string; gtin?: string; sn?: string }>;
}

/** Parse ResponseCode / RC + UnsuccessfulUnitCount from DTTS raw XML.
 *
 *  DTTS responses come in two shapes:
 *  1. Top-level <RESPONSECODE> or <RC> (e.g. query/list services)
 *  2. Per-product <RC> inside each <PRODUCT> block (e.g. Dispatch, Import …)
 *
 *  For shape 2 we derive the overall code from the product-level codes.
 */
export function parseDttsResponse(xml: string | null | undefined): DttsParseResult {
  if (!xml) return { responseCode: null, unsuccessfulUnitCount: null, totalProductCount: 0, failedProducts: [] };

  // ── 1. Explicit top-level <RESPONSECODE> / <RC> (outside any <PRODUCT>) ──
  // Strip everything inside <PRODUCT>…</PRODUCT> to avoid matching product-level tags
  const xmlWithoutProducts = xml.replace(/<PRODUCT\b[^>]*>[\s\S]*?<\/PRODUCT>/gi, "");

  const topRcMatch = xmlWithoutProducts.match(
    /<(?:RESPONSECODE|ResponseCode|responseCode|RC)>([^<]+)<\/(?:RESPONSECODE|ResponseCode|responseCode|RC)>/i
  );
  const topLevelRc = topRcMatch ? topRcMatch[1].trim() : null;

  // ── 2. Explicit <UNSUCCESSFULUNITCOUNT> at top level ──
  const uccMatch = xmlWithoutProducts.match(
    /<(?:UNSUCCESSFULUNITCOUNT|UnsuccessfulUnitCount|unsuccessfulUnitCount)>([^<]+)<\/(?:UNSUCCESSFULUNITCOUNT|UnsuccessfulUnitCount|unsuccessfulUnitCount)>/i
  );
  const explicitUcc = uccMatch ? parseInt(uccMatch[1].trim(), 10) : null;

  // ── 3. Per-product <RC> codes ──
  const productBlocks = [...xml.matchAll(/<PRODUCT\b[^>]*>([\s\S]*?)<\/PRODUCT>/gi)];
  const failedProducts: DttsParseResult["failedProducts"] = [];

  for (const block of productBlocks) {
    const inner = block[1];
    const rcm   = inner.match(/<RC>([^<]+)<\/RC>/i);
    const rc    = rcm ? rcm[1].trim() : "00000";
    if (rc !== "00000") {
      const gtin = inner.match(/<GTIN>([^<]+)<\/GTIN>/i)?.[1]?.trim();
      const sn   = inner.match(/<SN>([^<]+)<\/SN>/i)?.[1]?.trim();
      failedProducts.push({ rc, gtin, sn });
    }
  }

  const totalProductCount = productBlocks.length;
  const unsuccessfulFromProducts = totalProductCount > 0 ? failedProducts.length : null;
  const unsuccessfulUnitCount = explicitUcc !== null ? explicitUcc : unsuccessfulFromProducts;

  // ── 4. Derive overall responseCode ──
  let responseCode: string | null = topLevelRc;

  if (!responseCode) {
    if (totalProductCount > 0) {
      if (failedProducts.length === 0) {
        responseCode = "00000";
      } else {
        // Use the first failing product's RC as the representative code
        responseCode = failedProducts[0].rc;
      }
    }
  }

  return { responseCode, unsuccessfulUnitCount, totalProductCount, failedProducts };
}

export type DttsStatus = "success" | "partial" | "failed";

/**
 * Determines operation status from parsed DTTS response.
 *
 * Rules:
 * - Success  : RC == "00000"  AND  no failed products
 * - Partial  : RC == "00000"  AND  some (but not all) products failed
 *            OR some products succeeded and some failed (mixed result)
 * - Failed   : RC != "00000"  AND  ALL products failed (or no product list)
 */
export function getDttsStatus(
  responseCode: string | null,
  unsuccessfulUnitCount: number | null,
  totalProductCount = 0,
): DttsStatus {
  if (!responseCode) return "failed";

  const failed = unsuccessfulUnitCount ?? 0;
  const total  = totalProductCount;

  if (responseCode === "00000") {
    if (failed === 0) return "success";
    // RC 00000 but some units failed → partial
    return "partial";
  }

  // RC != 00000 — check if some products still succeeded
  if (total > 0 && failed < total) {
    // At least one product got through → partial
    return "partial";
  }

  // All failed (or no product breakdown available)
  return "failed";
}
