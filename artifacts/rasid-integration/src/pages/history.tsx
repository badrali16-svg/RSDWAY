import { useState } from "react";
import {
  useGetOperationHistory,
  useDispatchCancelBatchProducts,
  getGetOperationHistoryQueryKey,
  type OperationLog,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  Loader2, History as HistoryIcon, CheckCircle2, XCircle,
  Download, FileSpreadsheet, X, ChevronRight, Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/use-language";
import * as XLSX from "xlsx";

type LocalBatchProduct = { GTIN: string; BN?: string; XD?: string; QUANTITY?: number };
type BatchPayload  = { toGLN?: string; fromGLN?: string; products?: LocalBatchProduct[] };

function parseBatchPayload(raw: string): BatchPayload | null {
  try { return JSON.parse(raw) as BatchPayload; } catch { return null; }
}

const DISPATCH_BATCH_OPS = new Set(["DispatchBatch", "DispatchCancelBatch"]);
const CANCELABLE_OP = "DispatchBatch";

function exportHistoryToExcel(
  history: Array<{
    id: number; operation: string; requestPayload: string;
    success: boolean; notificationId?: string | null; createdAt: string;
  }>
) {
  const rows = history.map((op) => {
    let toGLN = ""; let products = "";
    try {
      const p = JSON.parse(op.requestPayload) as BatchPayload;
      toGLN = p.toGLN ?? p.fromGLN ?? "";
      products = (p.products ?? []).map((pr) =>
        `${pr.GTIN}${pr.BN ? " BN:" + pr.BN : ""}${pr.XD ? " XD:" + pr.XD : ""}${pr.QUANTITY != null ? " QTY:" + pr.QUANTITY : ""}`
      ).join(" | ");
    } catch { /* ignore */ }
    return {
      "ID": op.id,
      "التاريخ": new Date(op.createdAt).toLocaleString("en-SA"),
      "نوع العملية": op.operation,
      "الحالة": op.success ? "ناجحة" : "فاشلة",
      "رقم الإشعار": op.notificationId ?? "",
      "GLN": toGLN,
      "المنتجات": products,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "سجل العمليات");
  XLSX.writeFile(wb, `سجل-العمليات_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export default function HistoryPage() {
  const { data: history, isLoading } = useGetOperationHistory({
    query: { queryKey: getGetOperationHistoryQueryKey() }
  });
  const { t } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const cancelBatch = useDispatchCancelBatchProducts();

  const [search, setSearch] = useState("");
  const [detailOp, setDetailOp] = useState<OperationLog | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ toGLN: string; products: { GTIN: string; BN?: string; XD?: string; QUANTITY: number }[] } | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const filtered = (history ?? []).filter((op) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const status = op.success ? t("history.success").toLowerCase() : t("history.failed").toLowerCase();
    return (
      op.operation.toLowerCase().includes(q) ||
      (op.notificationId ?? "").toLowerCase().includes(q) ||
      status.includes(q)
    );
  });

  const handleRowClick = (op: NonNullable<typeof history>[number]) => {
    if (DISPATCH_BATCH_OPS.has(op.operation)) {
      setDetailOp(op);
    }
  };

  const handleCancelClick = (e: React.MouseEvent, op: NonNullable<typeof history>[number]) => {
    e.stopPropagation();
    const payload = parseBatchPayload(op.requestPayload);
    if (!payload?.toGLN || !payload?.products?.length) return;
    const products = payload.products
      .filter((p) => p.GTIN)
      .map((p) => ({ GTIN: p.GTIN, BN: p.BN, XD: p.XD, QUANTITY: p.QUANTITY ?? 1 }));
    setCancelTarget({ toGLN: payload.toGLN, products });
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    setCancelling(true);
    cancelBatch.mutate(
      { data: cancelTarget },
      {
        onSuccess: () => {
          toast({ title: t("history.cancelSuccess") });
          qc.invalidateQueries({ queryKey: getGetOperationHistoryQueryKey() });
          setCancelTarget(null);
        },
        onError: () => {
          toast({ title: t("common.error"), description: t("history.cancelError"), variant: "destructive" });
        },
        onSettled: () => setCancelling(false),
      }
    );
  };

  const detailPayload = detailOp ? parseBatchPayload(detailOp.requestPayload) : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("history.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("history.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <HistoryIcon className="h-5 w-5 text-primary" />
            <CardTitle className="flex-1">{t("history.allOps")}</CardTitle>
            {history && history.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportHistoryToExcel(history)}
              >
                <FileSpreadsheet className="me-2 h-4 w-4 text-green-600" />
                {t("history.exportExcel")}
              </Button>
            )}
          </div>
          {history && history.length > 0 && (
            <div className="relative mt-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("history.search")}
                className="ps-9"
              />
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
              {t("history.noOps")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-md">
              {t("history.noResults")}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("history.colDate")}</TableHead>
                    <TableHead className="text-start">{t("history.colType")}</TableHead>
                    <TableHead className="text-start">{t("history.colStatus")}</TableHead>
                    <TableHead className="text-start">{t("history.colNotifId")}</TableHead>
                    <TableHead className="text-start">{t("history.colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((op) => {
                    const isDispatchBatch = DISPATCH_BATCH_OPS.has(op.operation);
                    const isCancelable = op.operation === CANCELABLE_OP && op.success;
                    return (
                      <TableRow
                        key={op.id}
                        className={isDispatchBatch ? "cursor-pointer hover:bg-muted/60" : ""}
                        onClick={() => handleRowClick(op)}
                      >
                        <TableCell className="font-mono text-xs" dir="ltr">
                          {new Date(op.createdAt).toLocaleString("en-SA")}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            {op.operation}
                            {isDispatchBatch && (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {op.success ? (
                            <div className="flex items-center text-green-600 dark:text-green-500">
                              <CheckCircle2 className="me-1 h-4 w-4" />
                              <span>{t("history.success")}</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-destructive">
                              <XCircle className="me-1 h-4 w-4" />
                              <span>{t("history.failed")}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">
                          {op.notificationId || "-"}
                        </TableCell>
                        <TableCell>
                          {isCancelable && (
                            <button
                              type="button"
                              title={t("history.cancelDispatch")}
                              onClick={(e) => handleCancelClick(e, op)}
                              className="flex items-center justify-center h-6 w-6 rounded-full border border-destructive/40 text-destructive hover:bg-destructive hover:text-white transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Operation detail dialog ── */}
      <Dialog open={!!detailOp} onOpenChange={(open) => { if (!open) setDetailOp(null); }}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailOp?.operation}
              {detailOp?.success ? (
                <Badge variant="default" className="bg-green-600 text-white text-xs">{t("history.success")}</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">{t("history.failed")}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailPayload ? (
            <div className="space-y-4 text-sm">
              {/* GLN */}
              {(detailPayload.toGLN || detailPayload.fromGLN) && (
                <div className="flex items-center gap-3 rounded-md border px-3 py-2 bg-muted/30">
                  <span className="text-muted-foreground shrink-0">
                    {detailPayload.toGLN ? t("history.detailToGLN") : t("history.detailFromGLN")}:
                  </span>
                  <span className="font-mono font-semibold" dir="ltr">
                    {detailPayload.toGLN ?? detailPayload.fromGLN}
                  </span>
                </div>
              )}

              {/* Notification ID */}
              {detailOp?.notificationId && (
                <div className="flex items-center gap-3 rounded-md border px-3 py-2 bg-muted/30">
                  <span className="text-muted-foreground shrink-0">{t("history.colNotifId")}:</span>
                  <span className="font-mono font-semibold" dir="ltr">{detailOp.notificationId}</span>
                </div>
              )}

              {/* Products table */}
              {detailPayload.products && detailPayload.products.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-semibold text-muted-foreground">{t("history.detailProducts")}</p>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-start text-xs">GTIN</TableHead>
                          <TableHead className="text-start text-xs">BN</TableHead>
                          <TableHead className="text-start text-xs">XD</TableHead>
                          <TableHead className="text-start text-xs">QUANTITY</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailPayload.products.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs" dir="ltr">{p.GTIN}</TableCell>
                            <TableCell className="font-mono text-xs" dir="ltr">{p.BN ?? "-"}</TableCell>
                            <TableCell className="font-mono text-xs" dir="ltr">{p.XD ?? "-"}</TableCell>
                            <TableCell className="font-mono text-xs" dir="ltr">{p.QUANTITY ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Export this op to Excel */}
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const rows = (detailPayload.products ?? []).map((p) => ({
                      [detailPayload.toGLN ? "GLN المستلم" : "GLN المرسل"]: detailPayload.toGLN ?? detailPayload.fromGLN ?? "",
                      GTIN: p.GTIN, BN: p.BN ?? "", XD: p.XD ?? "", QUANTITY: p.QUANTITY ?? "",
                    }));
                    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, detailOp!.operation.slice(0, 31));
                    XLSX.writeFile(wb, `${detailOp!.operation}_${new Date(detailOp!.createdAt).toISOString().slice(0, 10)}.xlsx`);
                  }}
                >
                  <Download className="me-2 h-4 w-4" />
                  {t("history.exportExcel")}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("history.noPayload")}</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Cancel confirmation dialog ── */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("history.cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("history.cancelConfirmDesc")}
              {cancelTarget && (
                <span className="block mt-2 font-mono text-xs">
                  GLN: {cancelTarget.toGLN} — {cancelTarget.products.length} منتج
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>{t("users.deleteDialogCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("history.cancelDispatch")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
