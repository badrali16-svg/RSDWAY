import { SoapResponse } from "@workspace/api-client-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/use-language";

export function SoapResponseViewer({ response }: { response: SoapResponse | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "admin";

  if (!response) return null;

  const isSuccess = response.success;

  return (
    <div className="mt-6 space-y-4">
      <Alert variant={isSuccess ? "default" : "destructive"} className={isSuccess ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-400" : ""}>
        {isSuccess ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" /> : <XCircle className="h-4 w-4" />}
        <AlertTitle className="mr-2">{isSuccess ? t("soap.successTitle") : t("soap.failTitle")}</AlertTitle>
        <AlertDescription className="mr-2 mt-2 space-y-2">
          {response.notificationId && (
            <div className="font-mono text-sm bg-background/50 p-2 rounded border">
              <span className="font-bold font-sans">Notification ID: </span>
              {response.notificationId}
            </div>
          )}
          {response.error && (
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