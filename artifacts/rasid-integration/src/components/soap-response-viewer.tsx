import { SoapResponse } from "@workspace/api-client-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/use-language";
import { parseDttsResponse, getDttsStatus, getDttsErrorMessage } from "@/lib/dtts-error-codes";

export function SoapResponseViewer({ response }: { response: SoapResponse | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  if (!response) return null;

  // Parse ResponseCode + UnsuccessfulUnitCount from raw XML
  const { responseCode, unsuccessfulUnitCount } = parseDttsResponse(response.rawXml);
  const dttsStatus = getDttsStatus(responseCode, unsuccessfulUnitCount);

  // Determine display based on DTTS fields (if available) or fall back to legacy success flag
  const hasRc = responseCode !== null;
  const effectiveStatus = hasRc ? dttsStatus : (response.success ? "success" : "failed");

  const isSuccess  = effectiveStatus === "success";
  const isPartial  = effectiveStatus === "partial";
  const isFailed   = effectiveStatus === "failed";

  const statusLabel = isSuccess ? t("soap.successTitle") : isPartial ? t("soap.partialTitle") : t("soap.failTitle");
  const statusMsg   = isSuccess
    ? t("soap.successMsg")
    : isPartial
    ? t("soap.partialMsg")
    : t("soap.failMsg");

  const alertVariant = isFailed ? "destructive" : "default";
  const alertClass = isSuccess
    ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-400"
    : isPartial
    ? "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300"
    : "";

  const errorMsg = responseCode ? getDttsErrorMessage(responseCode) : (response.error ?? null);

  return (
    <div className="mt-6 space-y-4">
      <Alert variant={alertVariant} className={alertClass}>
        {isSuccess  && <CheckCircle2  className="h-4 w-4 text-green-600 dark:text-green-500" />}
        {isPartial  && <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
        {isFailed   && <XCircle       className="h-4 w-4" />}

        <AlertTitle className="mr-2">{statusLabel}</AlertTitle>
        <AlertDescription className="mr-2 mt-2 space-y-2">

          {/* Status message */}
          <p className="text-sm font-medium">{statusMsg}</p>

          {/* ResponseCode */}
          {responseCode && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold opacity-70">Response Code:</span>
              <Badge
                variant={isSuccess ? "secondary" : "destructive"}
                className={`font-mono text-xs ${isPartial ? "bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100" : ""}`}
              >
                {responseCode}
              </Badge>
            </div>
          )}

          {/* Error message from DTTS error codes table */}
          {errorMsg && responseCode !== "00000" && (
            <div className="text-sm rounded-md bg-background/50 px-3 py-2 border">
              {errorMsg}
            </div>
          )}

          {/* UnsuccessfulUnitCount */}
          {unsuccessfulUnitCount !== null && unsuccessfulUnitCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold opacity-70">{t("soap.unsuccessfulUnits")}:</span>
              <Badge variant="destructive" className="text-xs font-mono">{unsuccessfulUnitCount}</Badge>
            </div>
          )}

          {/* Notification ID */}
          {response.notificationId && (
            <div className="font-mono text-sm bg-background/50 p-2 rounded border">
              <span className="font-bold font-sans">Notification ID: </span>
              {response.notificationId}
            </div>
          )}

          {/* Legacy error (non-DTTS, e.g. network / SOAP fault) */}
          {!responseCode && response.error && (
            <div className="text-sm">
              {response.error}
            </div>
          )}
        </AlertDescription>
      </Alert>

      {isAdmin && response.rawXml && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-md border bg-card text-card-foreground">
          <div className="flex items-center justify-between px-4 py-3">
            <h4 className="text-sm font-semibold">{t("soap.rawXml")}</h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="border-t p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-4 text-xs text-left" dir="ltr">
                {response.rawXml}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
