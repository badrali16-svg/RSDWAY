# Rasid Integration Portal — Full Project Prompt

## ما هو المشروع؟

ابنِ **بوابة ويب متكاملة** باللغتين العربية والإنجليزية للتكامل مع نظام رصد SFDA (هيئة الغذاء والدواء السعودية) لتتبع الأدوية DTTS. البوابة تعمل كـ REST-to-SOAP proxy تحوّل طلبات JSON إلى SOAP XML وترسلها لخوادم الهيئة.

---

## Stack المطلوب

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express (أو أي framework آخر مناسب)
- **Database**: PostgreSQL + Drizzle ORM
- **Session**: express-session + connect-pg-simple
- **SOAP**: axios + xml2js لبناء وتحليل XML
- **Excel**: xlsx (SheetJS)
- **RTL**: اتجاه النص العربي من اليمين لليسار (dir="rtl")
- **i18n**: دعم كامل ثنائي اللغة عربي/إنجليزي

---

## قاعدة البيانات — الجداول المطلوبة

```sql
-- المستخدمون
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,        -- bcrypt
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  permissions JSONB NOT NULL DEFAULT '[]',  -- قائمة صلاحيات مثل ["import:execute","dispatch:execute"]
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- الجلسات
CREATE TABLE session (
  sid VARCHAR PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX "IDX_session_expire" ON session(expire);

-- بيانات اعتماد DTTS لكل مستخدم
CREATE TABLE auth_config (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  username TEXT NOT NULL,             -- اسم مستخدم رصد
  password_encrypted TEXT NOT NULL,   -- مشفّر بـ AES
  base_url TEXT NOT NULL DEFAULT 'https://tandttest.sfda.gov.sa',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- سجلات العمليات
CREATE TABLE operation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  operation TEXT NOT NULL,
  request_payload TEXT NOT NULL,
  response_payload TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  notification_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- مفاتيح API
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  key_value TEXT NOT NULL UNIQUE,     -- prefix: rasid_
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- العملاء (GLN المحفوظة)
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  gln TEXT NOT NULL,
  gln_owner_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, gln)
);

-- seed المستخدم الافتراضي
INSERT INTO users (username, password_hash, role, permissions, is_active)
VALUES ('Admin', '<bcrypt_hash_of_Ash@123456>', 'admin', '[]', TRUE)
ON CONFLICT DO NOTHING;
```

---

## نظام المصادقة والصلاحيات

### تسجيل الدخول
- صفحة `/login` بها حقلا اسم المستخدم وكلمة المرور
- المستخدم الافتراضي: `Admin` / `Ash@123456`
- جلسة server-side محفوظة في PostgreSQL
- بعد الدخول توجيه للـ dashboard
- الجلسة تنتهي تلقائياً

### الأدوار
| الدور | الصلاحيات |
|-------|-----------|
| `admin` | كل الصفحات + إدارة المستخدمين |
| `client` | الصفحات المحددة له فقط |

### الصلاحيات المتاحة (slugs)
```
import:execute          supply:execute
import-cancel:execute   supply-cancel:execute
dispatch:execute        dispatch-cancel:execute
dispatch-batch:execute  dispatch-cancel-batch:execute
accept:execute          accept-batch:execute
accept-dispatch:execute
return:execute          return-batch:execute
consume:execute         consume-cancel:execute
transfer:execute        transfer-cancel:execute
transfer-batch:execute  transfer-cancel-batch:execute
pharmacy-sale:execute   pharmacy-sale-cancel:execute
deactivation:execute    deactivation-cancel:execute
export:execute          export-cancel:execute
package-upload:execute  package-download:execute  package-query:execute
query:check-status      query:dispatch-detail
query:country-list      query:city-list
query:drug-list         query:error-code-list
query:stakeholder-list
history:view
clients:view            clients:manage
settings:view
```

---

## الصفحات والشاشات

### الشريط الجانبي (Sidebar)
كل عنصر له slug صلاحية. المدير يتحكم في من يرى ماذا. الصفحات:

| العنصر | المسار | أيقونة |
|--------|--------|--------|
| لوحة التحكم | `/` | BarChart2 |
| استيراد وتوريد | `/import` | PackagePlus |
| إرسال وقبول | `/dispatch` | Truck |
| إرجاع واستهلاك | `/return` | RotateCcw |
| نقل وصرف صيدلية | `/transfer` | ArrowLeftRight |
| تعطيل وتصدير | `/deactivation` | PackageX |
| نقل الحزم | `/packages` | Package |
| خدمات الاستعلام | `/queries` | Search |
| سجل العمليات | `/history` | History |
| إدارة العملاء | `/clients` | Building2 |
| إدارة المستخدمين | `/users` | Users (admin فقط) |
| الإعدادات | `/settings` | Settings |

---

### لوحة التحكم (Dashboard)
- إجمالي العمليات اليوم (بطاقات إحصائية)
- نسبة نجاح/فشل العمليات
- آخر 10 عمليات في جدول
- مؤشر الاتصال بخادم رصد (ping)

---

### صفحة الإعدادات (`/settings`)
**محمية بكلمة مرور إضافية: `Ash@123456`**

تحتوي على 3 تبويبات:

#### تبويب بيانات DTTS
- حقل: اسم المستخدم في رصد
- حقل: كلمة المرور في رصد (مخفية)
- حقل: URL الخادم (Test/Prod toggle)
  - Test: `https://tandttest.sfda.gov.sa`
  - Prod: `https://rsd.sfda.gov.sa`
- زر حفظ + زر اختبار الاتصال

#### تبويب مفاتيح API
- جدول بالمفاتيح (الاسم، prefix المفتاح، التاريخ، آخر استخدام، حالة)
- زر إنشاء مفتاح جديد (يولّد `rasid_` + 32 حرفاً عشوائياً)
- عرض المفتاح الكامل مرة واحدة فقط عند الإنشاء
- زر تعطيل/تفعيل وحذف لكل مفتاح

#### تبويب البيئة/التكامل
- رابط API للتكامل الخارجي
- مثال cURL للاستخدام

---

### صفحة الاستيراد والتوريد (`/import`)

تبويبات: Import | Import Cancel | Supply | Supply Cancel

**Import (استيراد):**
حقول النموذج:
- GTIN (رقم التعريف العالمي للتجارة)
- Serial Number (SN)
- Batch Number (BN)
- Expiry Date (XD) — تنسيق YYMMDD
- Manufacturing Date (MD) — اختياري
- Quantity (الكمية)
- Invoice Number (رقم الفاتورة) — اختياري، مع تحذير إذا فارغ
- زر مسح الباركود DataMatrix
- زر رفع ملف Excel لقائمة serial numbers
- زر تنفيذ العملية
- عرض نتيجة SOAP (notification ID + رسالة نجاح/فشل)

**Supply (توريد داخلي):**
نفس الحقول مع إضافة:
- toGLN (GLN الجهة المستلمة) — قائمة منسدلة من العملاء المحفوظين

---

### صفحة الإرسال والقبول (`/dispatch`)

تبويبات: Dispatch | Dispatch Batch | Dispatch Cancel | Accept | Accept Batch | Accept Dispatch

**Dispatch (إرسال):**
حقول:
- GTIN، SN، BN، XD، MD
- toGLN (الجهة المستلمة) — من قائمة العملاء
- Invoice Number

**Accept (قبول):**
- Notification ID (من عملية الإرسال)

**Accept Dispatch:**
- Notification ID

---

### صفحة الإرجاع والاستهلاك (`/return`)

تبويبات: Return | Return Batch | Consume | Consume Cancel

**Return:**
- GTIN، SN، BN، XD
- toGLN (الجهة المُرجَع إليها)

**Consume (استهلاك - للمستشفيات):**
- GTIN، SN، BN، XD

---

### صفحة النقل وصرف الصيدلية (`/transfer`)

تبويبات: Transfer | Transfer Batch | Transfer Cancel | Pharmacy Sale | Pharmacy Sale Cancel

**Pharmacy Sale (صرف صيدلية):**
حقول إضافية خاصة:
- Prescription ID (رقم الوصفة)
- Prescription Date (تاريخ الوصفة)
- Doctor ID (رقم الطبيب) — اختياري
- Patient National ID (الهوية الوطنية للمريض)

---

### صفحة التعطيل والتصدير (`/deactivation`)

تبويبات: Deactivation | Deactivation Cancel | Export | Export Cancel

**Deactivation:**
حقول:
- GTIN، SN، BN، XD
- Deactivation Reason (DR):
  - `D` = تالف (Damaged)
  - `S` = مسروق (Stolen)
  - `R` = مسحوب (Recalled)
  - `E` = منتهي الصلاحية (Expired)
- Explanation (شرح)

**Export (تصدير):**
- GTIN، SN، BN، XD
- Country Code (رمز الدولة) — قائمة منسدلة من API

---

### صفحة نقل الحزم (`/packages`)

تبويبات: Package Upload | Package Download | Package Query

**Package Upload:**
- حقل Base64 (textarea كبير) أو رفع ملف مباشر
- الملف يُحوّل تلقائياً لـ Base64

**Package Download:**
- Notification ID → يُنزّل الملف

**Package Query:**
- Notification ID → عرض حالة الحزمة

---

### صفحة الاستعلامات (`/queries`)

تبويبات: Check Status | Dispatch Detail | Country List | City List | Drug List | Error Codes | Stakeholder List

**Check Status:**
- Notification ID → عرض الحالة

**Dispatch Detail:**
- Notification ID → تفاصيل عملية الإرسال

**Country/City/Drug/Error/Stakeholder:**
- زر "جلب القائمة" → عرض في جدول
- زر تصدير Excel

---

### صفحة سجل العمليات (`/history`)

جدول بالأعمدة:
- التاريخ والوقت
- نوع العملية
- نتيجة (نجح/فشل badge ملوّن)
- Notification ID
- زر عرض تفاصيل XML (SOAP viewer)
- زر تصدير Excel
- فلترة: حسب النوع، حسب التاريخ، حسب النتيجة
- Pagination

---

### صفحة إدارة العملاء (`/clients`)

- جدول: الاسم، GLN، اسم المالك، تاريخ الإنشاء
- إضافة عميل يدوياً (نموذج)
- رفع ملف Excel لاستيراد جماعي
- تصدير Excel
- بحث وفلترة
- حذف وتعديل

---

### صفحة إدارة المستخدمين (`/users`)
**للمدير فقط**

جدول: اسم المستخدم، الدور، الحالة (نشط/معطّل)، تاريخ الإنشاء

**إضافة مستخدم:**
- اسم المستخدم
- كلمة المرور
- الدور (admin/client)
- قائمة الصلاحيات (checkboxes لكل slug)
- **تحكم في رؤية الشريط الجانبي**: checkbox لكل عنصر sidebar

**تعديل مستخدم:**
- نفس الحقول + تغيير كلمة المرور (اختياري)

---

## SOAP Proxy — كيف يعمل

الخادم يستقبل طلب JSON ويحوّله لـ SOAP XML ويرسله لـ SFDA.

### مثال على SOAP request لعملية Import:

```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://service.ws.sdaia.gov.sa/">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:ExecuteImportService>
      <ser:RequestMessage>
        <Username>YOUR_USERNAME</Username>
        <Password>YOUR_PASSWORD</Password>
        <Data>
          <Product>
            <GTIN>12345678901234</GTIN>
            <SN>SN12345</SN>
            <BN>BN001</BN>
            <XD>261231</XD>
          </Product>
        </Data>
      </ser:RequestMessage>
    </ser:ExecuteImportService>
  </soapenv:Body>
</soapenv:Envelope>
```

### نقاط DTTS SOAP (Test):
```
Base: https://tandttest.sfda.gov.sa

Import:         /ws/ImportWS?wsdl
ImportCancel:   /ws/ImportCancelWS?wsdl
Supply:         /ws/SupplyWS?wsdl
SupplyCancel:   /ws/SupplyCancelWS?wsdl
Dispatch:       /ws/DispatchWS?wsdl
DispatchBatch:  /ws/DispatchBatchWS?wsdl
DispatchCancel: /ws/DispatchCancelWS?wsdl
DispatchCancelBatch: /ws/DispatchCancelBatchWS?wsdl
Accept:         /ws/AcceptWS?wsdl
AcceptBatch:    /ws/AcceptBatchWS?wsdl
AcceptDispatch: /ws/AcceptDispatchWS?wsdl
Return:         /ws/ReturnWS?wsdl
ReturnBatch:    /ws/ReturnBatchWS?wsdl
Consume:        /ws/ConsumeWS?wsdl
ConsumeCancel:  /ws/ConsumeCancelWS?wsdl
Transfer:       /ws/TransferWS?wsdl
TransferBatch:  /ws/TransferBatchWS?wsdl
TransferCancel: /ws/TransferCancelWS?wsdl
TransferCancelBatch: /ws/TransferCancelBatchWS?wsdl
PharmacySale:   /ws/PharmacySaleWS?wsdl
PharmacySaleCancel: /ws/PharmacySaleCancelWS?wsdl
Deactivation:   /ws/DeactivationWS?wsdl
DeactivationCancel: /ws/DeactivationCancelWS?wsdl
Export:         /ws/ExportWS?wsdl
ExportCancel:   /ws/ExportCancelWS?wsdl
PackageUpload:  /ws/PackageUploadWS?wsdl
PackageDownload:/ws/PackageDownloadWS?wsdl
PackageQuery:   /ws/PackageQueryWS?wsdl
CheckStatus:    /ws/CheckStatusWS?wsdl
DispatchDetail: /ws/DispatchDetailWS?wsdl
CountryList:    /ws/CountryListWS?wsdl
CityList:       /ws/CityListWS?wsdl
DrugList:       /ws/DrugListWS?wsdl
ErrorCodeList:  /ws/ErrorCodeListWS?wsdl
StakeholderList:/ws/StakeholderListWS?wsdl
```

---

## REST API Endpoints (Backend)

```
POST   /api/auth/login           — تسجيل الدخول
POST   /api/auth/logout          — تسجيل الخروج
GET    /api/session/me           — بيانات الجلسة الحالية

GET    /api/auth/config          — جلب بيانات DTTS
POST   /api/auth/config          — حفظ بيانات DTTS

GET    /api/users                — قائمة المستخدمين (admin)
POST   /api/users                — إنشاء مستخدم (admin)
PUT    /api/users/:id            — تعديل مستخدم (admin)
DELETE /api/users/:id            — حذف مستخدم (admin)
POST   /api/users/:id/reset-password — تغيير كلمة المرور

GET    /api/clients              — قائمة العملاء
POST   /api/clients              — إضافة عميل
PUT    /api/clients/:id          — تعديل عميل
DELETE /api/clients/:id          — حذف عميل

GET    /api/api-keys             — قائمة مفاتيح API
POST   /api/api-keys             — إنشاء مفتاح جديد
PATCH  /api/api-keys/:id/toggle  — تفعيل/تعطيل
DELETE /api/api-keys/:id         — حذف

GET    /api/rasid/history        — سجل العمليات
POST   /api/rasid/import         — تنفيذ Import
POST   /api/rasid/import-cancel  — تنفيذ Import Cancel
POST   /api/rasid/supply         — تنفيذ Supply
POST   /api/rasid/supply-cancel
POST   /api/rasid/dispatch
POST   /api/rasid/dispatch-batch
POST   /api/rasid/dispatch-cancel
POST   /api/rasid/dispatch-cancel-batch
POST   /api/rasid/accept
POST   /api/rasid/accept-batch
POST   /api/rasid/accept-dispatch
POST   /api/rasid/return
POST   /api/rasid/return-batch
POST   /api/rasid/consume
POST   /api/rasid/consume-cancel
POST   /api/rasid/transfer
POST   /api/rasid/transfer-batch
POST   /api/rasid/transfer-cancel
POST   /api/rasid/transfer-cancel-batch
POST   /api/rasid/pharmacy-sale
POST   /api/rasid/pharmacy-sale-cancel
POST   /api/rasid/deactivation
POST   /api/rasid/deactivation-cancel
POST   /api/rasid/export
POST   /api/rasid/export-cancel
POST   /api/rasid/package-upload
POST   /api/rasid/package-download
POST   /api/rasid/package-query
POST   /api/rasid/check-status
POST   /api/rasid/dispatch-detail
GET    /api/rasid/country-list
GET    /api/rasid/city-list
GET    /api/rasid/drug-list
GET    /api/rasid/error-code-list
GET    /api/rasid/stakeholder-list

-- External API (مصادقة بـ X-API-Key header)
POST   /api/external/v1/import
... (نفس العمليات)
```

---

## مكونات UI مهمة

### مسح الباركود DataMatrix
- مكوّن يقرأ GS1 DataMatrix
- يستخرج تلقائياً: GTIN (01)، SN (21)، BN (10)، XD (17)، MD (11)، QUANTITY (37)
- يملأ الحقول في النموذج مباشرة

### عارض SOAP XML
- modal يعرض raw XML request وresponse
- تلوين syntax highlighting
- قابل للنسخ

### تحذير الفاتورة (Invoice Guard)
- إذا أرسل المستخدم النموذج بدون رقم فاتورة يظهر تحذير تأكيد

### تحميل وتصدير Excel
- قراءة ملف Excel → استخراج serial numbers
- تصدير نتائج أي عملية إلى ملف Excel
- استيراد قائمة عملاء من Excel

---

## تفاصيل تصميم الواجهة

### الألوان والنمط
- **النمط**: احترافي، داكن جزئياً أو فاتح، يناسب القطاع الصحي
- **اللون الرئيسي**: أزرق داكن `#1e40af` أو `#0f766e` (teal)
- **النجاح**: أخضر `#16a34a`
- **الخطأ**: أحمر `#dc2626`
- **التحذير**: برتقالي `#d97706`

### RTL / LTR
- اللغة العربية: `dir="rtl"` على الـ body
- `font-family`: `Tajawal` أو `Cairo` من Google Fonts للعربية
- كل العناصر تدعم RTL: الأيقونات، الجداول، النماذج، الـ sidebar
- زر تبديل اللغة في الـ header

### Sidebar
- يظهر على اليمين في العربية، اليسار في الإنجليزية
- قابل للطي (collapsible)
- يعرض اسم المستخدم والدور في الأسفل
- بادج "Live" أو "Test" حسب بيئة الخادم

### الحالات
- Loading spinner أثناء تنفيذ العمليات
- Toast notifications للنجاح والفشل
- حالة empty state في الجداول الفارغة
- Skeleton loading في الجداول

---

## متغيرات البيئة المطلوبة

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=random_secret_32_chars_minimum
COOKIE_SECURE=true
PORT=3000
ENCRYPTION_KEY=32_char_hex_key_for_aes_encryption
```

---

## ملاحظات مهمة للتطوير

1. **تشفير كلمة مرور DTTS**: استخدم AES-256 لتشفير كلمة مرور رصد عند التخزين في DB (ليس bcrypt لأن bcrypt غير قابل للفك)
2. **SSL قاعدة البيانات**: عند الاتصال بـ PostgreSQL على Render أضف `ssl: { rejectUnauthorized: false }`
3. **السيرفر يخدم الفرونت**: بعد البناء يجب أن يخدم Express ملفات dist/ الثابتة
4. **CORS**: مطلوب للـ External API
5. **Rate limiting**: أضف rate limiter على `/api/rasid/*`
6. **جميع routes محمية** بـ session middleware عدا `/login` و`/api/auth/login` و`/api/external/v1/*`
7. **External API** تستخدم `X-API-Key: rasid_...` في الـ header بدل الجلسة
8. **SOAP timeout**: 30 ثانية للطلبات لخادم رصد
9. **الـ Notification ID**: كل عملية ناجحة تُرجع `NotificationId` يجب حفظه في سجل العمليات

---

## ملفات جاهزة ستُوفّر معها

ستجد في المشروع ملفات تكامل SOAP جاهزة تشمل:
- منطق بناء XML لكل عملية
- منطق تحليل XML للردود
- SOAP action headers لكل endpoint

استخدمها مباشرة دون إعادة كتابتها.
