import { useRef, useState } from "react";
import type { SoapResponse } from "@workspace/api-client-react";
import { prepareCancellation, type CancellationReceipt } from "@/lib/operation-cancellation";
import { isCompleteOperationSuccess } from "@/lib/operation-success";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/use-language";

type Callbacks = {
  onSuccess: (result: SoapResponse) => void;
  onError: () => void;
  onSettled?: () => void;
};

export function useOperationCancellation() {
  const [receipt, setReceipt] = useState<CancellationReceipt | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const setCancelPending = (value: boolean) => {
    busy.current = value;
    setPending(value);
  };

  const run = <T extends object>(
    operation: string,
    request: T,
    mutate: (variables: { data: T }, callbacks: Callbacks) => void,
    callbacks: Omit<Callbacks, "onSettled">,
  ) => {
    if (busy.current) return;
    const snapshot = structuredClone(request);
    busy.current = true;
    setPending(true);
    setReceipt(null);
    mutate({ data: snapshot }, {
      onSuccess: (result) => {
        callbacks.onSuccess(result);
        if (isCompleteOperationSuccess(result)) {
          try {
            setReceipt(prepareCancellation(operation, snapshot, result.notificationId));
          } catch {
            toast({
              title: t("common.error"),
              description: t("operation.cancelUnavailable"),
              variant: "destructive",
            });
          }
        }
      },
      onError: callbacks.onError,
      onSettled: () => setCancelPending(false),
    });
  };

  return { receipt, pending, run, setCancelPending };
}
