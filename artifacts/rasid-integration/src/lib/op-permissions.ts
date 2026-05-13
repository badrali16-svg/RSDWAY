export interface OpPermissionEntry {
  slug: string;
  label: string;
}

export interface OpPermissionGroup {
  group: string;
  navSlug: string;
  ops: OpPermissionEntry[];
}

export const OP_PERMISSION_GROUPS: OpPermissionGroup[] = [
  {
    group: "الاستيراد والتصنيع",
    navSlug: "import",
    ops: [
      { slug: "op:import", label: "استيراد (Import)" },
      { slug: "op:import-cancel", label: "إلغاء استيراد" },
      { slug: "op:supply", label: "تصنيع محلي (Supply)" },
      { slug: "op:supply-cancel", label: "إلغاء تصنيع" },
    ],
  },
  {
    group: "الإرسال والاستلام",
    navSlug: "dispatch",
    ops: [
      { slug: "op:dispatch", label: "إرسال (Dispatch)" },
      { slug: "op:dispatch-cancel", label: "إلغاء إرسال" },
      { slug: "op:dispatch-batch", label: "إرسال تشغيلة (Dispatch Batch)" },
      { slug: "op:dispatch-cancel-batch", label: "إلغاء إرسال تشغيلة" },
      { slug: "op:accept", label: "استلام (Accept)" },
      { slug: "op:accept-dispatch", label: "استلام بـ Notification ID" },
      { slug: "op:accept-batch", label: "استلام تشغيلة (Accept Batch)" },
    ],
  },
  {
    group: "الإرجاع والاستهلاك",
    navSlug: "return",
    ops: [
      { slug: "op:return", label: "إرجاع (Return)" },
      { slug: "op:return-batch", label: "إرجاع تشغيلة (Return Batch)" },
      { slug: "op:consume", label: "استهلاك (Consume)" },
      { slug: "op:consume-cancel", label: "إلغاء استهلاك" },
    ],
  },
  {
    group: "النقل وصرف الصيدليات",
    navSlug: "transfer",
    ops: [
      { slug: "op:transfer", label: "نقل داخلي (Transfer)" },
      { slug: "op:transfer-cancel", label: "إلغاء نقل" },
      { slug: "op:transfer-batch", label: "نقل تشغيلة (Transfer Batch)" },
      { slug: "op:transfer-cancel-batch", label: "إلغاء نقل تشغيلة" },
      { slug: "op:pharmacy-sale", label: "صرف صيدلية (Pharmacy Sale)" },
      { slug: "op:pharmacy-sale-cancel", label: "إلغاء صرف صيدلية" },
    ],
  },
  {
    group: "التعطيل والتصدير",
    navSlug: "deactivation",
    ops: [
      { slug: "op:deactivation", label: "تعطيل (Deactivation)" },
      { slug: "op:deactivation-cancel", label: "إلغاء تعطيل" },
      { slug: "op:export", label: "تصدير (Export)" },
      { slug: "op:export-cancel", label: "إلغاء تصدير" },
    ],
  },
  {
    group: "نقل الحزم",
    navSlug: "packages",
    ops: [
      { slug: "op:package-upload", label: "رفع حزمة (Upload)" },
      { slug: "op:package-download", label: "تحميل حزمة (Download)" },
      { slug: "op:package-query", label: "استعلام حزمة (Query)" },
    ],
  },
];

export const ALL_OP_SLUGS: string[] = OP_PERMISSION_GROUPS.flatMap(g => g.ops.map(o => o.slug));

// ── Settings section permissions ───────────────────────────────────────────
export interface SettingsPermSection {
  key: "env" | "api" | "dtts";
  label: string;
}

export const SETTINGS_PERM_SECTIONS: SettingsPermSection[] = [
  { key: "env",  label: "اختيار البيئة (Production / Test)" },
  { key: "api",  label: "التكامل الخارجي (API Integration)" },
  { key: "dtts", label: "بيانات اعتماد نظام رصد (DTTS)" },
];

/** Returns the view slug for a section key */
export const settingsViewSlug = (key: string) => `settings:${key}:view`;
/** Returns the edit slug for a section key */
export const settingsEditSlug = (key: string) => `settings:${key}:edit`;
