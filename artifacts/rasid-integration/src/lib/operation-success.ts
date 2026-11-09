import type { SoapResponse } from "@workspace/api-client-react";
import { getDttsStatus, parseDttsResponse } from "./dtts-error-codes";

/** Cancellation must never be offered for failed or partially successful requests. */
export function isCompleteOperationSuccess(response: SoapResponse): boolean {
  if (!response.success || response.notificationId === "-1") return false;
  const parsed = parseDttsResponse(response.rawXml);
  if (parsed.failedProducts.length > 0 || (parsed.unsuccessfulUnitCount ?? 0) > 0) return false;
  return parsed.responseCode === null ||
    getDttsStatus(parsed.responseCode, parsed.unsuccessfulUnitCount, parsed.totalProductCount) === "success";
}
