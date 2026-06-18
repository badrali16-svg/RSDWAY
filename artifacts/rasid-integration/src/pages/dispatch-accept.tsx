import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useDispatchProducts, 
  useDispatchCancelProducts, 
  useDispatchBatchProducts,
  useDispatchCancelBatchProducts,
  useAcceptProducts, 
  useAcceptBatchProducts,
  useAcceptDispatch,
  useDispatchDetail,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Truck, Check, Ban, Layers, Lock, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { GlnInput } from "@/components/gln-input";
import { InvoiceBar } from "@/components/invoice-bar";
import { useInvoiceGuard } from "@/lib/use-invoice-guard";
import { useLanguage } from "@/lib/use-language";

const dispatchSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const dispatchBatchSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().min(1, "الكمية مطلوبة")
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const acceptSchema = z.object({
  fromGLN: z.string().min(1, "رقم GLN المرسل مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const acceptBatchSchema = z.object({
  fromGLN: z.string().min(1, "رقم GLN المرسل مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().min(1, "الكمية مطلوبة")
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const acceptDispatchSchema = z.object({
  dispatchNotificationId: z.string().min(1, "رقم إشعار الإرسال مطلوب")
});

type SnProduct = { GTIN: string; SN?: string; BN?: string; XD?: string; QUANTITY?: number };
type BatchProduct = { GTIN: string; BN?: string; XD?: string; QUANTITY?: number };

function withInvoice<T extends object>(data: T, inv: string): T {
  if (!inv.trim()) return data;
  return { ...data, invoiceNumber: inv.trim() } as T;
}

function exportSnFormToExcel(opName: string, glnHeader: string, glnValue: string, products: SnProduct[]) {
  const rows = products.map((p) => ({
    [glnHeader]: glnValue,
    "GTIN": p.GTIN ?? "",
    "SN": p.SN ?? "",
    "BN": p.BN ?? "",
    "XD": p.XD ?? "",
    "QUANTITY": p.QUANTITY ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ [glnHeader]: glnValue, GTIN: "", SN: "", BN: "", XD: "", QUANTITY: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opName.slice(0, 31));
  XLSX.writeFile(wb, `${opName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportBatchFormToExcel(opName: string, glnHeader: string, glnValue: string, products: BatchProduct[]) {
  const rows = products.map((p) => ({
    [glnHeader]: glnValue,
    "GTIN": p.GTIN ?? "",
    "BN": p.BN ?? "",
    "XD": p.XD ?? "",
    "QUANTITY": p.QUANTITY ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ [glnHeader]: glnValue, GTIN: "", BN: "", XD: "", QUANTITY: "" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opName.slice(0, 31));
  XLSX.writeFile(wb, `${opName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

type NotifProduct = {
  expiryDate: string;
  gtin: string;
  sn: string;
  quantity: string;
  bn: string;
  refNotifId: string;
  operationType: string;
};

type NotifDetails = {
  notificationId: string;
  notificationDate: string;
  fromStakeholder: string;
  toStakeholder: string;
  products: NotifProduct[];
};

function parseDispatchDetailXml(rawXml: string): NotifDetails | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawXml, "text/xml");
    const getText = (el: Element | Document, tag: string) =>
      el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";

    const notificationId   = getText(doc, "NOTIFICATIONID");
    const notificationDate = getText(doc, "NOTIFICATIONDATE");
    const fromStakeholder  = getText(doc, "FROMSTAKEHOLDER");
    const toStakeholder    = getText(doc, "TOSTAKEHOLDER");

    const productEls = Array.from(doc.getElementsByTagName("PRODUCT"));
    const products: NotifProduct[] = productEls.map(p => ({
      expiryDate:    getText(p, "XD"),
      gtin:          getText(p, "GTIN"),
      sn:            getText(p, "SN"),
      quantity:      getText(p, "QUANTITY"),
      bn:            getText(p, "BN"),
      refNotifId:    getText(p, "REFNOTIFICATIONID"),
      operationType: getText(p, "OPERATIONTYPE"),
    }));

    if (!notificationId && products.length === 0) return null;
    return { notificationId, notificationDate, fromStakeholder, toStakeholder, products };
  } catch {
    return null;
  }
}

function exportNotifToExcel(notifId: string, details: NotifDetails | null) {
  const rows = details && details.products.length > 0
    ? details.products.map(p => ({
        "Notification ID":  details.notificationId || notifId,
        "Notification Date": details.notificationDate,
        "From Stakeholder": details.fromStakeholder,
        "To Stakeholder":   details.toStakeholder,
        "Expiry Date":      p.expiryDate,
        "GTIN":             p.gtin,
        "SN":               p.sn,
        "Quantity":         p.quantity,
        "BN":               p.bn,
        "Ref Notf ID":      p.refNotifId,
        "Operation Type":   p.operationType,
      }))
    : [{ "Notification ID": notifId }];

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Notification Details");
  XLSX.writeFile(wb, `notification_${notifId || "details"}.xlsx`);
}

export default function DispatchAcceptPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);
  const [invoiceNum, setInvoiceNum] = useState("");
  const [invoiceAlert, setInvoiceAlert] = useState(true);
  const [notifDetails, setNotifDetails] = useState<NotifDetails | null>(null);
  const [notifDetailLoading, setNotifDetailLoading] = useState(false);
  const { guard, dialogOpen, confirmSubmit, cancelSubmit } = useInvoiceGuard(invoiceNum, invoiceAlert);

  const dispatchMutation = useDispatchProducts();
  const dispatchCancelMutation = useDispatchCancelProducts();
  const dispatchBatchMutation = useDispatchBatchProducts();
  const dispatchCancelBatchMutation = useDispatchCancelBatchProducts();
  const acceptMutation = useAcceptProducts();
  const acceptBatchMutation = useAcceptBatchProducts();
  const acceptDispatchMutation = useAcceptDispatch();
  const dispatchDetailMutation = useDispatchDetail();

  const dispatchForm = useForm<z.infer<typeof dispatchSchema>>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: { toGLN: "", products: [] }
  });

  const dispatchBatchForm = useForm<z.infer<typeof dispatchBatchSchema>>({
    resolver: zodResolver(dispatchBatchSchema),
    defaultValues: { toGLN: "", products: [] }
  });

  const acceptForm = useForm<z.infer<typeof acceptSchema>>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { fromGLN: "", products: [] }
  });

  const acceptBatchForm = useForm<z.infer<typeof acceptBatchSchema>>({
    resolver: zodResolver(acceptBatchSchema),
    defaultValues: { fromGLN: "", products: [] }
  });

  const acceptDispatchForm = useForm<z.infer<typeof acceptDispatchSchema>>({
    resolver: zodResolver(acceptDispatchSchema),
    defaultValues: { dispatchNotificationId: "" }
  });

  const onSuccess = (res: SoapResponse, msg: string) => {
    setResponse(res);
    toast({ title: t("common.saved"), description: msg });
  };
  const onError = () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("dispatch.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("dispatch.subtitle")}</p>
      </div>

      <InvoiceBar
        value={invoiceNum}
        onChange={setInvoiceNum}
        alertEnabled={invoiceAlert}
        onAlertChange={setInvoiceAlert}
        dialogOpen={dialogOpen}
        onDialogConfirm={confirmSubmit}
        onDialogCancel={cancelSubmit}
      />

      <Tabs defaultValue={["dispatch","dispatch-batch","dispatch-cancel","dispatch-cancel-batch","accept","accept-batch","accept-dispatch"].find(tab => canDo(`op:${tab}`)) ?? "dispatch"} onValueChange={() => setInvoiceNum("")} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:dispatch") && <TabsTrigger value="dispatch">{t("dispatch.tabDispatch")}</TabsTrigger>}
          {canDo("op:dispatch-batch") && <TabsTrigger value="dispatch-batch">{t("dispatch.tabDispatchBatch")}</TabsTrigger>}
          {canDo("op:dispatch-cancel") && <TabsTrigger value="dispatch-cancel">{t("dispatch.tabDispatchCancel")}</TabsTrigger>}
          {canDo("op:dispatch-cancel-batch") && <TabsTrigger value="dispatch-cancel-batch">{t("dispatch.tabDispatchCancelBatch")}</TabsTrigger>}
          {canDo("op:accept") && <TabsTrigger value="accept">{t("dispatch.tabAccept")}</TabsTrigger>}
          {canDo("op:accept-batch") && <TabsTrigger value="accept-batch">{t("dispatch.tabAcceptBatch")}</TabsTrigger>}
          {canDo("op:accept-dispatch") && <TabsTrigger value="accept-dispatch">{t("dispatch.tabAcceptDispatch")}</TabsTrigger>}
        </TabsList>

        {/* ── Dispatch SN ── */}
        {canDo("op:dispatch") && (
        <TabsContent value="dispatch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <CardTitle>{t("dispatch.tabDispatch")}</CardTitle>
              </div>
              <CardDescription>{t("dispatch.descDispatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchForm}>
                <form onSubmit={dispatchForm.handleSubmit((v) => guard(() => dispatchMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatch")), onError })))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={dispatchMutation.isPending || !canDo("op:dispatch")} title={!canDo("op:dispatch") ? t("common.noPermission") : undefined}>
                      {dispatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch") ? <Lock className="me-2 h-4 w-4" /> : null}
                      {t("dispatch.executeDispatch")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportSnFormToExcel("إرسال-SN", "GLN المستلم", dispatchForm.getValues("toGLN"), dispatchForm.getValues("products") as SnProduct[])}>
                      <Download className="me-2 h-4 w-4" />
                      {t("dispatch.downloadData")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Dispatch Batch ── */}
        {canDo("op:dispatch-batch") && (
        <TabsContent value="dispatch-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>{t("dispatch.tabDispatchBatch")}</CardTitle>
              </div>
              <CardDescription>{t("dispatch.descDispatchBatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchBatchForm}>
                <form onSubmit={dispatchBatchForm.handleSubmit((v) => guard(() => dispatchBatchMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatchBatch")), onError })))} className="space-y-6">
                  <FormField control={dispatchBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={dispatchBatchMutation.isPending || !canDo("op:dispatch-batch")} title={!canDo("op:dispatch-batch") ? t("common.noPermission") : undefined}>
                      {dispatchBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                      {t("dispatch.executeDispatchBatch")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportBatchFormToExcel("إرسال-Batch", "GLN المستلم", dispatchBatchForm.getValues("toGLN"), dispatchBatchForm.getValues("products") as BatchProduct[])}>
                      <Download className="me-2 h-4 w-4" />
                      {t("dispatch.downloadData")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Dispatch Cancel SN ── */}
        {canDo("op:dispatch-cancel") && (
        <TabsContent value="dispatch-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("dispatch.tabDispatchCancel")}</CardTitle>
              </div>
              <CardDescription>{t("dispatch.descDispatchCancel")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchForm}>
                <form onSubmit={dispatchForm.handleSubmit((v) => guard(() => dispatchCancelMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatchCancel")), onError })))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="destructive" disabled={dispatchCancelMutation.isPending || !canDo("op:dispatch-cancel")} title={!canDo("op:dispatch-cancel") ? t("common.noPermission") : undefined}>
                      {dispatchCancelMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch-cancel") ? <Lock className="me-2 h-4 w-4" /> : null}
                      {t("dispatch.executeDispatchCancel")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportSnFormToExcel("إلغاء-إرسال-SN", "GLN المستلم", dispatchForm.getValues("toGLN"), dispatchForm.getValues("products") as SnProduct[])}>
                      <Download className="me-2 h-4 w-4" />
                      {t("dispatch.downloadData")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Dispatch Cancel Batch ── */}
        {canDo("op:dispatch-cancel-batch") && (
        <TabsContent value="dispatch-cancel-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("dispatch.tabDispatchCancelBatch")}</CardTitle>
              </div>
              <CardDescription>{t("dispatch.descDispatchCancelBatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchBatchForm}>
                <form onSubmit={dispatchBatchForm.handleSubmit((v) => guard(() => dispatchCancelBatchMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatchCancelBatch")), onError })))} className="space-y-6">
                  <FormField control={dispatchBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="destructive" disabled={dispatchCancelBatchMutation.isPending || !canDo("op:dispatch-cancel-batch")} title={!canDo("op:dispatch-cancel-batch") ? t("common.noPermission") : undefined}>
                      {dispatchCancelBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch-cancel-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                      {t("dispatch.executeDispatchCancelBatch")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportBatchFormToExcel("إلغاء-إرسال-Batch", "GLN المستلم", dispatchBatchForm.getValues("toGLN"), dispatchBatchForm.getValues("products") as BatchProduct[])}>
                      <Download className="me-2 h-4 w-4" />
                      {t("dispatch.downloadData")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Accept SN ── */}
        {canDo("op:accept") && (
        <TabsContent value="accept">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle>{t("dispatch.cardAccept")}</CardTitle>
              </div>
              <CardDescription>{t("dispatch.descAccept")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptForm}>
                <form onSubmit={acceptForm.handleSubmit((v) => guard(() => acceptMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("dispatch.successAccept")), onError })))} className="space-y-6">
                  <FormField control={acceptForm.control} name="fromGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.fromGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={acceptMutation.isPending || !canDo("op:accept")} title={!canDo("op:accept") ? t("common.noPermission") : undefined}>
                      {acceptMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:accept") ? <Lock className="me-2 h-4 w-4" /> : null}
                      {t("dispatch.executeAccept")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportSnFormToExcel("استلام-SN", "GLN المرسل", acceptForm.getValues("fromGLN"), acceptForm.getValues("products") as SnProduct[])}>
                      <Download className="me-2 h-4 w-4" />
                      {t("dispatch.downloadData")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Accept Batch ── */}
        {canDo("op:accept-batch") && (
        <TabsContent value="accept-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>{t("dispatch.cardAcceptBatch")}</CardTitle>
              </div>
              <CardDescription>{t("dispatch.descAcceptBatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptBatchForm}>
                <form onSubmit={acceptBatchForm.handleSubmit((v) => guard(() => acceptBatchMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("dispatch.successAcceptBatch")), onError })))} className="space-y-6">
                  <FormField control={acceptBatchForm.control} name="fromGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.fromGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={acceptBatchMutation.isPending || !canDo("op:accept-batch")} title={!canDo("op:accept-batch") ? t("common.noPermission") : undefined}>
                      {acceptBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:accept-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                      {t("dispatch.executeAcceptBatch")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportBatchFormToExcel("استلام-Batch", "GLN المرسل", acceptBatchForm.getValues("fromGLN"), acceptBatchForm.getValues("products") as BatchProduct[])}>
                      <Download className="me-2 h-4 w-4" />
                      {t("dispatch.downloadData")}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Accept Dispatch ── */}
        {canDo("op:accept-dispatch") && (
        <TabsContent value="accept-dispatch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle>{t("dispatch.cardAcceptDispatch")}</CardTitle>
              </div>
              <CardDescription>{t("dispatch.descAcceptDispatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptDispatchForm}>
                <form onSubmit={acceptDispatchForm.handleSubmit((v) => guard(async () => {
                  const notifId = v.dispatchNotificationId;
                  setNotifDetails(null);
                  setNotifDetailLoading(true);
                  try {
                    const detailRes = await dispatchDetailMutation.mutateAsync({ data: { dispatchNotificationId: notifId } });
                    if (detailRes?.rawXml) {
                      const parsed = parseDispatchDetailXml(detailRes.rawXml);
                      setNotifDetails(parsed);
                    }
                  } catch {
                    // detail fetch failed — proceed silently
                  } finally {
                    setNotifDetailLoading(false);
                  }
                  acceptDispatchMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("dispatch.successAcceptDispatch")), onError });
                }))} className="space-y-6">
                  <FormField control={acceptDispatchForm.control} name="dispatchNotificationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("dispatch.notifId")}</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="ID..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={acceptDispatchMutation.isPending || notifDetailLoading || !canDo("op:accept-dispatch")} title={!canDo("op:accept-dispatch") ? t("common.noPermission") : undefined}>
                      {(acceptDispatchMutation.isPending || notifDetailLoading) ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:accept-dispatch") ? <Lock className="me-2 h-4 w-4" /> : null}
                      {t("dispatch.executeAcceptDispatch")}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => exportNotifToExcel(acceptDispatchForm.getValues("dispatchNotificationId"), notifDetails)}>
                      <Download className="me-2 h-4 w-4" />
                      {t("dispatch.downloadData")}
                    </Button>
                  </div>
                </form>
              </Form>

              {/* ── Notification Details Table ── */}
              {notifDetailLoading && (
                <div className="mt-6 flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري جلب تفاصيل الإشعار...</span>
                </div>
              )}

              {notifDetails && !notifDetailLoading && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-base font-semibold text-primary border-b pb-2">تفاصيل الإشعار (Notification Details)</h3>

                  {/* Header info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {notifDetails.notificationId && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Notification ID</p>
                        <p className="font-mono bg-muted px-2 py-1 rounded text-sm">{notifDetails.notificationId}</p>
                      </div>
                    )}
                    {notifDetails.notificationDate && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Notification Date</p>
                        <p className="bg-muted px-2 py-1 rounded text-sm">{notifDetails.notificationDate}</p>
                      </div>
                    )}
                    {notifDetails.fromStakeholder && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-muted-foreground font-medium">From Stakeholder</p>
                        <p className="bg-muted px-2 py-1 rounded text-sm">{notifDetails.fromStakeholder}</p>
                      </div>
                    )}
                    {notifDetails.toStakeholder && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-muted-foreground font-medium">To Stakeholder</p>
                        <p className="bg-muted px-2 py-1 rounded text-sm">{notifDetails.toStakeholder}</p>
                      </div>
                    )}
                  </div>

                  {/* Products table */}
                  {notifDetails.products.length > 0 && (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Expiry Date</th>
                            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap font-mono">GTIN</th>
                            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap font-mono">SN</th>
                            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Quantity</th>
                            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">BN</th>
                            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Ref Notf ID</th>
                            <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Operation Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifDetails.products.map((p, i) => (
                            <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                              <td className="px-3 py-2 whitespace-nowrap">{p.expiryDate || "—"}</td>
                              <td className="px-3 py-2 font-mono whitespace-nowrap">{p.gtin || "—"}</td>
                              <td className="px-3 py-2 font-mono whitespace-nowrap">{p.sn || "—"}</td>
                              <td className="px-3 py-2 text-center">{p.quantity || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{p.bn || "—"}</td>
                              <td className="px-3 py-2 font-mono whitespace-nowrap">{p.refNotifId || "—"}</td>
                              <td className="px-3 py-2 whitespace-nowrap">{p.operationType || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      <SoapResponseViewer response={response} />
    </div>
  );
}
