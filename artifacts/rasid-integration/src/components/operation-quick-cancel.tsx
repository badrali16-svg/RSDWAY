import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2 } from "lucide-react";
import { getGetOperationHistoryQueryKey, type SoapResponse } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/use-language";
import { isCompleteOperationSuccess } from "@/lib/operation-success";
import type { CancellationReceipt } from "@/lib/operation-cancellation";

export function OperationQuickCancel({
  receipt, disabled, onPendingChange,
}: {
  receipt: CancellationReceipt | null;
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  if (!receipt) return null;
  return <CancellationAction key={receipt.id} receipt={receipt} disabled={disabled} onPendingChange={onPendingChange} />;
}

function CancellationAction({
  receipt, disabled, onPendingChange,
}: {
  receipt: CancellationReceipt;
  disabled: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: receipt.cancel, retry: false });
  const [open, setOpen] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [response, setResponse] = useState<SoapResponse | null>(null);
  const submitting = useRef(false);
  const allowed = user?.role === "admin" || user?.permissions.includes(receipt.permission);

  const cancel = () => {
    if (!allowed || disabled || cancelled || submitting.current) return;
    submitting.current = true;
    onPendingChange(true);
    setResponse(null);
    mutation.mutate(undefined, {
      onSuccess: (result) => {
        setResponse(result);
        const succeeded = isCompleteOperationSuccess(result);
        setCancelled(succeeded);
        toast({
          title: succeeded ? t("operation.cancelSuccess") : t("common.error"),
          description: succeeded ? undefined : (result.error || t("operation.cancelFailed")),
          variant: succeeded ? "default" : "destructive",
        });
        void queryClient.invalidateQueries({ queryKey: getGetOperationHistoryQueryKey() });
      },
      onError: () => toast({
        title: t("common.error"),
        description: t("operation.cancelConnectionError"),
        variant: "destructive",
      }),
      onSettled: () => {
        submitting.current = false;
        onPendingChange(false);
        setOpen(false);
      },
    });
  };

  if (!allowed) return null;
  return (
    <div className="space-y-3">
      {cancelled ? (
        <p role="status" className="text-sm font-medium text-green-700 dark:text-green-400">
          {t("operation.cancelSuccess")}
        </p>
      ) : (
        <Button type="button" variant="destructive" disabled={disabled || mutation.isPending} onClick={() => setOpen(true)}>
          {mutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Ban className="me-2 h-4 w-4" />}
          {t("return.quickCancel")}
        </Button>
      )}
      <AlertDialog open={open} onOpenChange={(next) => { if (!submitting.current) setOpen(next); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("operation.cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("operation.cancelDescription")}
              {receipt.notificationId && <span className="mt-2 block font-mono" dir="ltr">Notification ID: {receipt.notificationId}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>{t("return.keepOperation")}</AlertDialogCancel>
            <Button type="button" variant="destructive" disabled={disabled || mutation.isPending} onClick={cancel}>
              {mutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("return.confirmQuickCancel")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SoapResponseViewer response={response} />
    </div>
  );
}
