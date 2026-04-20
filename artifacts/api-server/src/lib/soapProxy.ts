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

    if (!response.ok) {
      logger.warn({ status: response.status, endpoint: opts.endpoint }, "SOAP call failed");
      return { success: false, rawXml, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    return { success: true, rawXml, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, endpoint: opts.endpoint }, "SOAP call error");
    return { success: false, rawXml: null, error: msg };
  }
}

export function buildProductListXml(products: Array<{ GTIN: string; SN?: string | null; BN?: string | null; XD?: string | null; QUANTITY?: number | null }>): string {
  return `<PRODUCTLIST>${products.map(p => `<PRODUCT>
  <GTIN>${p.GTIN}</GTIN>
  ${p.SN != null ? `<SN>${p.SN}</SN>` : ""}
  ${p.BN != null ? `<BN>${p.BN}</BN>` : ""}
  ${p.XD != null ? `<XD>${p.XD}</XD>` : ""}
  ${p.QUANTITY != null ? `<QUANTITY>${p.QUANTITY}</QUANTITY>` : ""}
</PRODUCT>`).join("")}</PRODUCTLIST>`;
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
