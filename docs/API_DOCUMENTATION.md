# RSDWAY API Documentation

## Arabic/English Bilingual Documentation for SFDA DTTS (Rasid) Integration

> **Purpose:** Any developer — whether building an Odoo module, ERP integration, custom website, or mobile application — can connect to the RSDWAY API and send Drug Track & Trace (DTTS) operations to Saudi Arabia's SFDA Rasid system.

---

# Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Getting Started](#3-getting-started)
4. [Operation Endpoints](#4-operation-endpoints)
5. [Query Endpoints](#5-query-endpoints)
6. [Admin Endpoints](#6-admin-endpoints)
7. [Response Format](#7-response-format)
8. [Error Handling](#8-error-handling)
9. [Integration Examples](#9-integration-examples)
10. [DTTS Error Codes Reference](#10-dtts-error-codes-reference)

---

## 1. Overview

### What is RSDWAY?

RSDWAY is a bilingual (Arabic/English) REST API gateway that proxies JSON requests to the Saudi Food & Drug Authority (SFDA) **DTTS (Drug Track & Trace System)** — also known as **Rasid (رصد)**. Instead of dealing with complex SOAP XML directly, any developer can send simple JSON HTTP requests.

### Two Ways to Use the API

| Method | Use Case | Authentication |
|--------|----------|----------------|
| **Portal Session** | Your internal team uses the web portal | Cookie session (login via `/api/session/login`) |
| **API Key** | External systems (Odoo, ERP, custom apps) send operations automatically | Header `X-API-Key: rsdway_...` |

### Base URL

```
https://app.rsdway.com/api
```

---

## 2. Authentication

### 2.1 Portal Session (for Web UI users)

1. **Login**
```http
POST /api/session/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

2. **Check session**
```http
GET /api/session/me
```

3. **Logout**
```http
POST /api/session/logout
```

### 2.2 API Key (for External Systems / Odoo / ERP)

This is the recommended method for any automated system integration.

#### Step 1: Create an API Key (via Portal)

1. Log in to the RSDWAY portal as an admin
2. Go to **Settings** → **API Keys** (or use the admin panel)
3. Click **Create New Key**
4. Give it a name (e.g., "Odoo Production")
5. The portal will show the full key **once only** — save it immediately:

```
rsdway_7f3a9b2c4e5d6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a
```

#### Step 2: Use the API Key

Every request must include:

```http
X-API-Key: rsdway_your_full_key_here
```

#### Step 3: Configure DTTS Credentials

The API Key is tied to a user. That user must have DTTS credentials configured in the portal. Operations sent via the API will use **that user's** DTTS credentials to communicate with the SFDA system.

---

## 3. Getting Started

### 3.1 Quick Check: Test Your Connection

```bash
curl -X POST \
  https://app.rsdway.com/api/auth/test-connection \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rsdway_your_key_here"
```

### 3.2 Quick Check: Get Your Auth Config

```bash
curl -X GET \
  https://app.rsdway.com/api/auth/config \
  -H "X-API-Key: rsdway_your_key_here"
```

### 3.3 Save Your DTTS Credentials

```bash
curl -X POST \
  https://app.rsdway.com/api/auth/config \
  -H "Content-Type: application/json" \
  -H "X-API-Key: rsdway_your_key_here" \
  -d '{
    "username": "your_dtts_username",
    "password": "your_dtts_password",
    "baseUrl": "https://tandttest.sfda.gov.sa/ws"
  }'
```

> **Production vs Test:**
> - **Test:** `https://tandttest.sfda.gov.sa/ws`
> - **Production:** `https://rsd.sfda.gov.sa/ws`

---

## 4. Operation Endpoints

### 4.1 Product Formats

#### Serial Number (SN) Product

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `GTIN` | string | Yes | 14-digit Global Trade Item Number |
| `SN` | string | No | Serial Number (for individual unit tracking) |
| `BN` | string | No | Batch Number |
| `XD` | string | No | Expiry Date (YYYY-MM-DD) |
| `QUANTITY` | integer | No | Required for batch operations |

#### Batch Product (for Batch Operations)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `GTIN` | string | Yes | 14-digit GTIN |
| `BN` | string | Yes | Batch Number |
| `XD` | string | Yes | Expiry Date |
| `QUANTITY` | integer | Yes | Quantity (min 1) |

### 4.2 Import Operations

#### Import (إستيراد)

```http
POST /api/external/v1/import
Authorization: Bearer <session> OR X-API-Key: rsdway_...
Content-Type: application/json

{
  "GTIN": "12345678901234",
  "MD": "2023-01-01",
  "XD": "2025-12-31",
  "BN": "LOT123",
  "serialNumbers": ["SN001", "SN002", "SN003"]
}
```

#### Import Cancel

```http
POST /api/rasid/import-cancel  ⚠️ Portal Session Only

{
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

### 4.3 Supply Operations

#### Supply (تزويد)

Same body as Import.

```http
POST /api/external/v1/supply

{
  "GTIN": "12345678901234",
  "MD": "2023-01-01",
  "XD": "2025-12-31",
  "BN": "LOT123",
  "serialNumbers": ["SN001", "SN002"]
}
```

#### Supply Cancel

```http
POST /api/rasid/supply-cancel  ⚠️ Portal Session Only

{
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

### 4.4 Dispatch Operations (إرسال)

#### Dispatch (Serial Number)

```http
POST /api/external/v1/dispatch

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Dispatch Cancel

```http
POST /api/external/v1/dispatch-cancel

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Dispatch Batch (by Batch Number)

```http
POST /api/external/v1/dispatch-batch

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50 }
  ]
}
```

#### Dispatch Cancel Batch

```http
POST /api/external/v1/dispatch-cancel-batch

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50 }
  ]
}
```

### 4.5 Accept Operations (قبول)

#### Accept (Serial Number)

```http
POST /api/external/v1/accept

{
  "fromGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Accept Batch

```http
POST /api/external/v1/accept-batch

{
  "fromGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50 }
  ]
}
```

#### Accept Dispatch (قبول إرسال)

```http
POST /api/external/v1/accept-dispatch

{
  "dispatchNotificationId": "2668909225"
}
```

### 4.6 Return Operations (إرجاع)

#### Return (Serial Number)

```http
POST /api/external/v1/return

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Return Batch

```http
POST /api/external/v1/return-batch

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50 }
  ]
}
```

### 4.7 Consume Operations (استهلاك)

#### Consume

```http
POST /api/rasid/consume  ⚠️ Portal Session Only

{
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Consume Cancel

```http
POST /api/rasid/consume-cancel  ⚠️ Portal Session Only

{
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

### 4.8 Transfer Operations (نقل)

#### Transfer (Serial Number)

```http
POST /api/external/v1/transfer

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Transfer Cancel

```http
POST /api/external/v1/transfer-cancel

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Transfer Batch

```http
POST /api/external/v1/transfer-batch

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50 }
  ]
}
```

#### Transfer Cancel Batch

```http
POST /api/external/v1/transfer-cancel-batch

{
  "toGLN": "1234567890123",
  "products": [
    { "GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50 }
  ]
}
```

### 4.9 Pharmacy Sale Operations (بيع صيدلية)

#### Pharmacy Sale

```http
POST /api/rasid/pharmacy-sale  ⚠️ Portal Session Only

{
  "toGLN": "1234567890123",
  "doctorId": "123456",
  "patientNationalId": "1234567890",
  "prescriptionId": "RX12345",
  "prescriptionDate": "2024-01-15",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Pharmacy Sale Cancel

```http
POST /api/rasid/pharmacy-sale-cancel  ⚠️ Portal Session Only

{
  "toGLN": "1234567890123",
  "prescriptionId": "RX12345",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

### 4.10 Deactivation Operations (إلغاء تنشيط)

#### Deactivation

```http
POST /api/rasid/deactivation  ⚠️ Portal Session Only

{
  "DR": "123",
  "explanation": "Product expired",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Deactivation Cancel

```http
POST /api/rasid/deactivation-cancel  ⚠️ Portal Session Only

{
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

### 4.11 Export Operations (تصدير)

#### Export

```http
POST /api/rasid/export  ⚠️ Portal Session Only

{
  "countryCode": "USA",
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

#### Export Cancel

```http
POST /api/rasid/export-cancel  ⚠️ Portal Session Only

{
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

### 4.12 Package Transfer Operations

#### Package Upload

```http
POST /api/rasid/package-upload  ⚠️ Portal Session Only

{
  "toGLN": "1234567890123",
  "fileBase64": "...base64-encoded-file-content..."
}
```

#### Package Download

```http
POST /api/rasid/package-download  ⚠️ Portal Session Only

{
  "transferId": "123456"
}
```

#### Package Query

```http
POST /api/rasid/package-query  ⚠️ Portal Session Only

{
  "fromGLN": "1234567890123",
  "toGLN": "1234567890123",
  "getAll": true,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

---

## 5. Query Endpoints

These endpoints do **not** change the state — they are read-only lookups.

### 5.1 Check Product Status

```http
POST /api/rasid/check-status  ⚠️ Portal Session Only

{
  "products": [
    { "GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31" }
  ]
}
```

### 5.2 Get Dispatch Details

```http
POST /api/rasid/dispatch-detail  ⚠️ Portal Session Only

{
  "dispatchNotificationId": "2668909225"
}
```

**Response — Notification Details:**

The portal automatically parses and displays the response in a table. The raw XML contains:

| Field | XML Tag | Description |
|-------|---------|-------------|
| Notification ID | `<NOTIFICATIONID>` | Unique ID of the dispatch notification |
| Notification Date | `<NOTIFICATIONDATE>` | Date the dispatch was created |
| From Stakeholder | `<FROMSTAKEHOLDER>` | Name of the sending entity |
| To Stakeholder | `<TOSTAKEHOLDER>` | Name of the receiving entity |
| Expiry Date | `<XD>` (per product) | Product expiry date |
| GTIN | `<GTIN>` (per product) | 14-digit product identifier |
| SN | `<SN>` (per product) | Serial Number (if available) |
| Quantity | `<QUANTITY>` (per product) | Number of units |
| BN | `<BN>` (per product) | Batch/Lot Number |
| Ref Notf ID | `<REFNOTIFICATIONID>` (per product) | Reference notification ID (if any) |
| Operation Type | `<OPERATIONTYPE>` (per product) | Type of the original operation |

> **Portal Feature:** When using **Accept Dispatch** (`استلام بالإشعار`), the portal automatically fetches and displays these details in a table after submission. The **"تحميل البيانات"** button exports the full table to an Excel file named `notification_<ID>.xlsx`.

### 5.3 Get Country List

```http
POST /api/rasid/country-list  ⚠️ Portal Session Only
```

### 5.4 Get City List

```http
POST /api/rasid/city-list  ⚠️ Portal Session Only
```

### 5.5 Get Drug List

```http
POST /api/rasid/drug-list  ⚠️ Portal Session Only

{
  "drugStatus": 1
}
```

### 5.6 Get Error Code List

```http
POST /api/rasid/error-code-list  ⚠️ Portal Session Only
```

### 5.7 Get Stakeholder List

```http
POST /api/rasid/stakeholder-list  ⚠️ Portal Session Only

{
  "stakeholderType": 1,
  "getAll": true,
  "cityId": 2
}
```

---

## 6. Admin Endpoints

### 6.1 User Management

#### List All Users

```http
GET /api/users
```

#### Create User (Admin)

```http
POST /api/users

{
  "username": "client_user",
  "password": "secure_password",
  "permissions": ["op:dispatch", "op:accept", "op:return"],
  "dttsConfig": {
    "username": "client_dtts_username",
    "password": "client_dtts_password",
    "baseUrl": "https://tandttest.sfda.gov.sa/ws"
  }
}
```

#### Update User Permissions

```http
PATCH /api/users/123

{
  "permissions": ["op:dispatch", "op:accept", "op:return", "op:transfer"]
}
```

#### Set User Status

```http
PATCH /api/users/123/status

{
  "isActive": true
}
```

#### Delete User

```http
DELETE /api/users/123
```

### 6.2 Client (GLN) Management

#### List Clients

```http
GET /api/clients
```

#### Create Client

```http
POST /api/clients

{
  "name": "Pharmacy ABC",
  "gln": "1234567890123",
  "glnOwnerName": "ABC Medical"
}
```

#### Update Client

```http
PUT /api/clients/456

{
  "name": "Pharmacy ABC Updated",
  "gln": "1234567890123",
  "glnOwnerName": "ABC Medical"
}
```

#### Delete Client

```http
DELETE /api/clients/456
```

### 6.3 Operation History

#### Get History

```http
GET /api/rasid/history

# Admin can filter by user:
GET /api/rasid/history?userId=123
```

#### Clear History

```http
DELETE /api/rasid/history

# Admin can clear by user:
DELETE /api/rasid/history?userId=123
```

---

## 7. Response Format

### 7.1 Success Response

```json
{
  "success": true,
  "rawXml": "<soap:Envelope>...</soap:Envelope>",
  "error": null,
  "notificationId": "2668909225"
}
```

### 7.2 Failure Response

```json
{
  "success": false,
  "rawXml": "<soap:Envelope>...</soap:Envelope>",
  "error": "الرقم التسلسلي (SN) غير موجود في النظام أو لم يُسجَّل مسبقاً",
  "notificationId": "-1"
}
```

### 7.3 Partial Failure (Batch Operations)

For Batch operations, some products may succeed and others may fail. The response `success` will be `false` if **any** product failed, and the raw XML contains per-product `<RC>` error codes.

```json
{
  "success": false,
  "rawXml": "<soap:Envelope>...<PRODUCT><RC>10201</RC>...</PRODUCT>...</soap:Envelope>",
  "error": "فشل تنفيذ العملية",
  "notificationId": "2668909225"
}
```

> **Important:** `notificationId` may be a valid number (not `-1`) even when the operation failed. Always check `success` field.

---

## 8. Error Handling

### 8.1 HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Bad Request (missing parameters) |
| 401 | Unauthorized (not logged in or invalid API key) |
| 403 | Forbidden (operation not allowed for this user) |
| 500 | Internal Server Error |

### 8.2 Common Error Messages

| Error Code (DTTS) | Arabic Message | English Meaning |
|-------------------|---------------|----------------|
| 00000 | تم تنفيذ العملية بنجاح | Success |
| 10001 | GTIN غير مسجّل | GTIN not registered |
| 10101 | المنتج غير موجود في المخزون | Product not in stock |
| 10201 | الرقم التسلسلي غير موجود | SN not found |
| 11042 | لديك كمية فعالة أقل من الكمية المرسلة | Active quantity less than dispatched |
| 80000 | اسم المستخدم أو كلمة المرور غير صحيحة | Invalid credentials |
| 80100 | خطأ في قاعدة البيانات | Database error |

---

## 9. Integration Examples

### 9.1 Python Example

```python
import requests

BASE_URL = "https://app.rsdway.com/api"
API_KEY = "rsdway_your_key_here"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# 1. Test connection
response = requests.post(f"{BASE_URL}/auth/test-connection"  # Portal Session Only - requires cookie login, headers=headers)
print(response.json())

# 2. Dispatch a product
payload = {
    "toGLN": "1234567890123",
    "products": [
        {
            "GTIN": "12345678901234",
            "SN": "SN001",
            "BN": "LOT123",
            "XD": "2025-12-31"
        }
    ]
}

response = requests.post(f"{BASE_URL}/external/v1/dispatch", headers=headers, json=payload)
result = response.json()

if result["success"]:
    print(f"✅ Dispatch successful! Notification ID: {result['notificationId']}")
else:
    print(f"❌ Failed: {result['error']}")
    print(f"Raw XML: {result['rawXml']}")

# 3. Dispatch by batch number
batch_payload = {
    "toGLN": "1234567890123",
    "products": [
        {
            "GTIN": "12345678901234",
            "BN": "LOT123",
            "XD": "2025-12-31",
            "QUANTITY": 100
        }
    ]
}

response = requests.post(f"{BASE_URL}/external/v1/dispatch-batch", headers=headers, json=batch_payload)
result = response.json()
print(result)

# 4. Check product status
status_payload = {
    "products": [
        {"GTIN": "12345678901234", "SN": "SN001"}
    ]
}

response = requests.post(f"{BASE_URL}/rasid/check-status"  # Portal Session Only, headers=headers, json=status_payload)
print(response.json())

# 5. Get operation history
response = requests.get(f"{BASE_URL}/rasid/history"  # Portal Session Only, headers=headers)
history = response.json()
for entry in history:
    print(f"{entry['createdAt']}: {entry['operation']} - {'✅' if entry['success'] else '❌'}")
```

### 9.2 Odoo (Python) Integration Example

```python
# In your Odoo custom module
import requests
import logging

_logger = logging.getLogger(__name__)

class RsdwayIntegration:
    def __init__(self, api_key, base_url="https://app.rsdway.com/api"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }
    
    def dispatch_batch(self, to_gln, products):
        """products: list of dicts with GTIN, BN, XD, QUANTITY"""
        payload = {
            "toGLN": to_gln,
            "products": products
        }
        response = requests.post(
            f"{self.base_url}/external/v1/dispatch-batch",
            headers=self.headers,
            json=payload
        )
        return response.json()
    
    def accept_batch(self, from_gln, products):
        payload = {
            "fromGLN": from_gln,
            "products": products
        }
        response = requests.post(
            f"{self.base_url}/external/v1/accept-batch",
            headers=self.headers,
            json=payload
        )
        return response.json()

# Usage in Odoo
# class StockMove(models.Model):
#     def _send_to_rasid(self):
#         rsd = RsdwayIntegration(api_key=self.env['ir.config_parameter'].get_param('rsd.api_key'))
#         result = rsd.dispatch_batch(
#             to_gln="1234567890123",
#             products=[{"GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50}]
#         )
#         if not result['success']:
#             raise UserError(result['error'])
```

### 9.3 cURL Examples

```bash
# Test connection
curl -X POST \
  https://app.rsdway.com/api/auth/test-connection \
  -H "X-API-Key: rsdway_your_key" \
  -H "Content-Type: application/json"

# Dispatch batch
curl -X POST \
  https://app.rsdway.com/api/external/v1/dispatch-batch \
  -H "X-API-Key: rsdway_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "toGLN": "1234567890123",
    "products": [
      {"GTIN": "12345678901234", "BN": "LOT123", "XD": "2025-12-31", "QUANTITY": 50}
    ]
  }'

# Check status
curl -X POST \
  https://app.rsdway.com/api/rasid/check-status  # Portal Session Only \
  -H "X-API-Key: rsdway_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"GTIN": "12345678901234", "SN": "SN001", "BN": "LOT123", "XD": "2025-12-31"}
    ]
  }'

# Get history
curl -X GET \
  https://app.rsdway.com/api/rasid/history  # Portal Session Only \
  -H "X-API-Key: rsdway_your_key"
```

### 9.4 PHP Example

```php
<?php
class RsdwayClient {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($apiKey, $baseUrl = "https://app.rsdway.com/api") {
        $this->apiKey = $apiKey;
        $this->baseUrl = $baseUrl;
    }
    
    public function dispatchBatch($toGLN, $products) {
        $payload = [
            "toGLN" => $toGLN,
            "products" => $products
        ];
        
        $ch = curl_init("$this->baseUrl/external/v1/dispatch-batch");
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "X-API-Key: $this->apiKey",
            "Content-Type: application/json"
        ]);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}

// Usage
$rsd = new RsdwayClient("rsdway_your_key_here");
$result = $rsd->dispatchBatch("1234567890123", [
    ["GTIN" => "12345678901234", "BN" => "LOT123", "XD" => "2025-12-31", "QUANTITY" => 100]
]);

if ($result["success"]) {
    echo "Success! Notification: " . $result["notificationId"];
} else {
    echo "Error: " . $result["error"];
}
?>
```

### 9.5 JavaScript / Node.js Example

```javascript
const axios = require('axios');

const BASE_URL = 'https://app.rsdway.com/api';
const API_KEY = 'rsdway_your_key_here';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

async function dispatchBatch(toGLN, products) {
  try {
    const response = await client.post('/rasid/dispatch-batch', {
      toGLN,
      products
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
}

async function getHistory() {
  const response = await client.get('/rasid/history');
  return response.data;
}

// Usage
(async () => {
  const result = await dispatchBatch('1234567890123', [
    { GTIN: '12345678901234', BN: 'LOT123', XD: '2025-12-31', QUANTITY: 50 }
  ]);
  console.log(result);
  
  const history = await getHistory();
  console.log('History:', history);
})();
```

---

## 10. DTTS Error Codes Reference

### 10.1 Product-Level Errors

| Code | Arabic | English |
|------|--------|---------|
| 00000 | تم تنفيذ العملية بنجاح | Operation successful |
| 10001 | GTIN غير مسجّل | GTIN not registered |
| 10002 | الرقم التسلسلي مكرر | Duplicate SN |
| 10003 | تاريخ الإنتاج أكبر من اليوم | Production date > today |
| 10004 | تاريخ الانتهاء أقل من اليوم | Expiry date < today |
| 10100 | المنتج موجود في المخزون | Product in stock |
| 10101 | المنتج غير موجود في المخزون | Product not in stock |
| 10200 | المنتج غير صالح للعملية | Product not valid for operation |
| 10201 | الرقم التسلسلي غير موجود | SN not found |
| 10202 | تم تفعيله مسبقاً | Already activated |
| 10203 | تم إلغاء تنشيطه مسبقاً | Already deactivated |
| 10204 | تم بيعه سابقاً | Already sold |
| 10205 | تم إرجاعه مسبقاً | Already returned |
| 10206 | تم تصديره مسبقاً | Already exported |
| 10207 | تم نقله مسبقاً | Already transferred |
| 10208 | حالة المنتج لا تتوافق | Product status mismatch |
| 10209 | تم إرساله مسبقاً | Already dispatched |
| 10210 | تم قبوله مسبقاً | Already accepted |
| 10211 | غير موجود في مخزونك | Not in your stock |
| 10212 | لم يُرسَل إليك | Not dispatched to you |
| 10213 | تم تدميره مسبقاً | Already destroyed |
| 10214 | تم استهلاكه مسبقاً | Already consumed |
| 10215 | معلومات المنتج غير صحيحة | Invalid product info |
| 10216 | لا يمكن قبول من نفس المنشأة | Cannot accept from same facility |
| 10217 | موجود في طرد مغلق | In closed package |
| 10300 | المنتج محظور | Product blocked |
| 10301 | تم سحب المنتج | Product recalled |
| 11042 | لديك كمية فعالة أقل من الكمية المرسلة | Active quantity less than dispatched |

### 10.2 Validation Errors

| Code | Arabic | English |
|------|--------|---------|
| 11001 | معلومات المنتج مفقودة | Missing product info |
| 11002 | GTIN مطلوب | GTIN required |
| 11003 | الرقم التسلسلي مطلوب | SN required |
| 11004 | رقم الدفعة مطلوب | BN required |
| 11005 | تاريخ الانتهاء مطلوب | XD required |
| 11006 | تاريخ الإنتاج مطلوب | MD required |
| 11007 | الكمية مطلوبة | Quantity required |
| 11008 | GLN المستلم مطلوب | To GLN required |
| 11009 | GLN المرسل مطلوب | From GLN required |
| 11023 | GTIN يجب أن يتكون من 14 رقماً | GTIN must be 14 digits |
| 11042 | لديك كمية فعالة أقل من الكمية المرسلة | Active quantity less than dispatched |
| 11045 | تم سحب رقم الدفعة المحدد | Batch number recalled |

### 10.3 Authentication & System Errors

| Code | Arabic | English |
|------|--------|---------|
| 80000 | اسم المستخدم أو كلمة المرور غير صحيحة | Invalid credentials |
| 80001 | اسم المستخدم فارغ | Username empty |
| 80002 | كلمة المرور فارغة | Password empty |
| 80004 | تم حظرك مؤقتاً | Temporarily blocked |
| 80005 | تم إلغاء تنشيط المستخدم | User deactivated |
| 80100 | خطأ في قاعدة البيانات | Database error |
| 80199 | لم يتم العثور على اسم المستخدم | Username not found |
| 80200 | لم يتم العثور على صاحب المصلحة | Stakeholder not found |
| 80201 | نوع صاحب المصلحة غير صالح | Invalid stakeholder type |
| 80202 | صيغة GLN غير صالحة | Invalid GLN format |
| 80209 | خطأ غير محدد | Unspecified error |
| 80210 | الحالة غير صحيحة | Invalid state |
| 11901 | المستخدم غير مصرح له | User not authorized |
| 11902 | المستلم غير مسجّل | Recipient not registered |
| 11904 | المستلم غير نشط | Recipient inactive |

### 10.4 Pharmacy & Export Errors

| Code | Arabic | English |
|------|--------|---------|
| 21000 | تاريخ الوصفة غير صالح | Invalid prescription date |
| 21001 | معرّف النقل غير صحيح | Invalid transfer ID |
| 21002 | GLN المستلم غير مناسب | Invalid recipient GLN |
| 21017 | صاحب المصلحة غير مصرح | Stakeholder not authorized |
| 21018 | حالة الباركود غير معرّفة | Barcode status undefined |
| 21020 | سبب إلغاء التنشيط غير صالح | Invalid deactivation reason |
| 21021 | GLN المستهدف غير صالح | Invalid target GLN |
| 21030 | يرجى التحقق من حالة اشتراك نقاط صحة والتأكد من أنه فعّال | Please verify the Seha Points subscription status and ensure that it is active |
| 11208 | معلومات المكان المقصود غير صالحة | Invalid destination |
| 11213 | تم تسجيل رقم الوصفة الطبية سابقاً | Prescription already registered |
| 11215 | معلومات البائع غير صالحة | Invalid seller info |
| 11216 | رقم الوصفة غير مسجّل | Prescription not registered |
| 11810 | غير مصرح للأدوية البشرية | Not authorized for human medicine |
| 11811 | غير مصرح للأدوية البيطرية | Not authorized for veterinary medicine |
| 11813 | يمنع التصدير للبلد المختار | Export prohibited for selected country |
| 11814 | المستخدم المرسل غير نشط | Sender inactive |
| 11815 | يجب أن يكون المستلم مختلفاً | Recipient must be different |
| 11816 | المستلم غير نشط | Recipient inactive |

### 10.5 Batch & Quantity Errors

| Code | Arabic | English |
|------|--------|---------|
| 11016 | الكمية غير صالحة | Invalid quantity |
| 11022 | الكمية يجب أن تكون أكبر من صفر | Quantity must be > 0 |
| 11042 | لديك كمية فعالة أقل من الكمية المرسلة | Active quantity less than dispatched |
| 15010 | رقم الدفعة تم استخدامه بتاريخ مختلف | Batch used with different date |
| 15021 | تم بيعه من قبل المستشفى | Sold by hospital |
| 15022 | متوفر في مخزون مستشفى آخر | Available in another hospital |
| 15024 | لم يتم إلغاء تنشيط المنتج | Product not deactivated |
| 15026 | بسبب عفو المخزون، لم يتم إلغاء التنشيط | Grace period not expired |
| 20001 | GLN المصدر مفقود | Missing source GLN |
| 20002 | GLN المستهدف مفقود | Missing target GLN |
| 20003 | لا يمكنك إرسال لهذه الشركة | Cannot send to this company |
| 20004 | لا يمكنك استلام لهذه الشركة | Cannot receive from this company |
| 20008 | معرّف النقل غير موجود | Transfer ID not found |
| 20100 | لا يمكنك استلام معلومات الطرد | Cannot receive package info |
| 20201 | نوع صاحب المصلحة غير صالح | Invalid stakeholder type |

---

## 11. API Key Management

### 11.1 List API Keys

```http
GET /api/external/keys
Authorization: Session cookie (login required)
```

### 11.2 Create API Key

```http
POST /api/external/keys
Authorization: Session cookie
Content-Type: application/json

{
  "name": "Odoo Production"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Odoo Production",
  "key": "rsdway_7f3a9b2c4e5d6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
  "createdAt": "2024-06-15T10:00:00Z"
}
```

> ⚠️ The full key is shown **only once**. Store it securely.

### 11.3 Revoke API Key

```http
DELETE /api/external/keys/:id
Authorization: Session cookie
```

---

## 12. OpenAPI Specification

The complete OpenAPI 3.1 specification is available at:

```
/lib/api-spec/openapi.yaml
```

This file can be imported into Swagger UI, Postman, or any OpenAPI client generator to auto-generate client code in any language.

---

## 13. Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "401 Unauthorized" | Check your X-API-Key header or login session |
| "403 Forbidden" | This operation is not enabled for your user. Contact admin |
| "DTTS credentials not configured" | Go to Settings and save your DTTS username/password |
| "Invalid GLN format" | GLN must be exactly 13 digits |
| "GTIN must be 14 digits" | GTIN must be exactly 14 digits |
| "Product not in stock" | The product is not in your inventory in the DTTS system |
| "SN not found" | The serial number was never imported or supplied |
| "Active quantity less than dispatched" | Code 11042 — You have fewer active units than you're trying to dispatch |
| "Invalid credentials" | Code 80000 — Check your DTTS username/password in Settings |
| Operation shows success but actually failed | Check `notificationId` — if it's `-1`, the operation failed |
| Batch operation with partial success | Always check `success` field, not just `notificationId` |

### Need Help?

- Check the operation history: `GET /api/rasid/history` *(Portal Session Only — requires cookie login)*
- Test your connection via API key: use `POST /api/external/v1/dispatch` with a test product
- Portal-only: `POST /api/auth/test-connection` *(requires cookie login, not API key)*
- Review the raw XML response in `rawXml` field for DTTS details
- Enable per-operation permissions in the admin panel

---

## 14. Glossary (English/Arabic)

| English | Arabic | Description |
|---------|--------|-------------|
| GTIN | رقم بند التجارة العالمي | 14-digit product identifier |
| SN | الرقم التسلسلي | Serial Number (unique unit ID) |
| BN | رقم الدفعة | Batch/Lot Number |
| XD | تاريخ الانتهاء | Expiry Date |
| MD | تاريخ الإنتاج | Manufacturing Date |
| GLN | رقم الموقع العالمي | 13-digit Global Location Number |
| DTTS | رصد | Drug Track & Trace System |
| SFDA | هيئة الغذاء والدواء | Saudi Food & Drug Authority |
| Notification ID | معرّف الإشعار | Reference ID for the operation |
| Dispatch | إرسال | Send products to another stakeholder |
| Accept | قبول | Receive products from another stakeholder |
| Return | إرجاع | Return products to sender |
| Consume | استهلاك | Use products (hospital/clinic) |
| Transfer | نقل | Transfer between pharmacies |
| Deactivation | إلغاء تنشيط | Remove from active inventory |
| Export | تصدير | Export out of country |
| Supply | تزويد | Manufacture/produce new products |
| Import | استيراد | Import products from abroad |
| Package | طرد | Package/file transfer system |

---

> **RSDWAY** — Simplifying SFDA DTTS integration for developers, pharmacists, and healthcare systems.
