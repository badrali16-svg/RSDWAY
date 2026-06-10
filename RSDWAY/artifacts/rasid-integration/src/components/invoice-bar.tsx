import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { useLanguage } from "@/lib/use-language";

interface InvoiceBarProps {
  value: string;
  onChange: (v: string) => void;
  alertEnabled: boolean;
  onAlertChange: (v: boolean) => void;
  dialogOpen: boolean;
  onDialogConfirm: () => void;
  onDialogCancel: () => void;
}

export function InvoiceBar({
  value,
  onChange,
  alertEnabled,
  onAlertChange,
  dialogOpen,
  onDialogConfirm,
  onDialogCancel,
}: InvoiceBarProps) {
  const { t } = useLanguage();

  return (
    <>
      <div className="flex items-end gap-4 rounded-md border bg-muted/30 px-4 py-3 max-w-lg">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">{t("common.invoiceNumber")}</label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t("common.invoiceNumberPlaceholder")}
            dir="ltr"
            className="bg-background"
          />
        </div>
        <div className="flex items-center gap-2 pb-1.5 shrink-0">
          <Checkbox
            id="invoice-alert-cb"
            checked={alertEnabled}
            onCheckedChange={(c) => onAlertChange(!!c)}
          />
          <Label htmlFor="invoice-alert-cb" className="text-sm cursor-pointer select-none whitespace-nowrap">
            {t("common.invoiceAlert")}
          </Label>
        </div>
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={(open) => { if (!open) onDialogCancel(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.invoiceAlertTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {t("common.invoiceAlertDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onDialogCancel}>
              {t("common.invoiceAlertCancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onDialogConfirm}>
              {t("common.invoiceAlertConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
