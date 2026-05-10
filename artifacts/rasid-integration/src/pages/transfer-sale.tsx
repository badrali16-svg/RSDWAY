import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useTransferProducts, 
  useTransferCancelProducts, 
  useTransferBatchProducts,
  useTransferCancelBatchProducts,
  usePharmacySale, 
  usePharmacySaleCancel,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Repeat, ShoppingCart, Ban, Layers, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { GlnInput } from "@/components/gln-input";
import { useLanguage } from "@/lib/language-context";

const transferSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const transferBatchSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().min(1, "الكمية مطلوبة")
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const pharmacySaleSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN للفرع مطلوب"),
  doctorId: z.string().optional(),
  patientNationalId: z.string().optional(),
  prescriptionId: z.string().min(1, "رقم الوصفة مطلوب"),
  prescriptionDate: z.string().min(1, "تاريخ الوصفة مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const pharmacySaleCancelSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN للفرع مطلوب"),
  prescriptionId: z.string().min(1, "رقم الوصفة مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

export default function TransferSalePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const transferMutation = useTransferProducts();
  const transferCancelMutation = useTransferCancelProducts();
  const transferBatchMutation = useTransferBatchProducts();
  const transferCancelBatchMutation = useTransferCancelBatchProducts();
  const pharmacySaleMutation = usePharmacySale();
  const pharmacySaleCancelMutation = usePharmacySaleCancel();

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: { toGLN: "", products: [] }
  });

  const transferBatchForm = useForm<z.infer<typeof transferBatchSchema>>({
    resolver: zodResolver(transferBatchSchema),
    defaultValues: { toGLN: "", products: [] }
  });

  const pharmacySaleForm = useForm<z.infer<typeof pharmacySaleSchema>>({
    resolver: zodResolver(pharmacySaleSchema),
    defaultValues: { toGLN: "", doctorId: "", patientNationalId: "", prescriptionId: "", prescriptionDate: "", products: [] }
  });

  const pharmacySaleCancelForm = useForm<z.infer<typeof pharmacySaleCancelSchema>>({
    resolver: zodResolver(pharmacySaleCancelSchema),
    defaultValues: { toGLN: "", prescriptionId: "", products: [] }
  });

  const onSuccess = (res: SoapResponse, msg: string) => {
    setResponse(res);
    toast({ title: t("common.saved"), description: msg });
  };
  const onError = () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("transfer.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("transfer.subtitle")}</p>
      </div>

      <Tabs defaultValue={["transfer","transfer-batch","transfer-cancel","transfer-cancel-batch","pharmacy-sale","pharmacy-sale-cancel"].find(tab => canDo(`op:${tab}`))?.replace("pharmacy-sale-cancel","sale-cancel").replace("pharmacy-sale","sale") ?? "transfer"} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:transfer") && <TabsTrigger value="transfer">{t("transfer.tabTransfer")}</TabsTrigger>}
          {canDo("op:transfer-batch") && <TabsTrigger value="transfer-batch">{t("transfer.tabTransferBatch")}</TabsTrigger>}
          {canDo("op:transfer-cancel") && <TabsTrigger value="transfer-cancel">{t("transfer.tabTransferCancel")}</TabsTrigger>}
          {canDo("op:transfer-cancel-batch") && <TabsTrigger value="transfer-cancel-batch">{t("transfer.tabTransferCancelBatch")}</TabsTrigger>}
          {canDo("op:pharmacy-sale") && <TabsTrigger value="sale">{t("transfer.tabSale")}</TabsTrigger>}
          {canDo("op:pharmacy-sale-cancel") && <TabsTrigger value="sale-cancel">{t("transfer.tabSaleCancel")}</TabsTrigger>}
        </TabsList>

        {/* ── Transfer SN ── */}
        {canDo("op:transfer") && (
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <CardTitle>{t("transfer.tabTransfer")}</CardTitle>
              </div>
              <CardDescription>{t("transfer.descTransfer")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((v) => transferMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("transfer.successTransfer")), onError }))} className="space-y-6">
                  <FormField control={transferForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("transfer.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={transferMutation.isPending || !canDo("op:transfer")} title={!canDo("op:transfer") ? t("common.noPermission") : undefined}>
                    {transferMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("transfer.executeTransfer")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Transfer Batch ── */}
        {canDo("op:transfer-batch") && (
        <TabsContent value="transfer-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>{t("transfer.tabTransferBatch")}</CardTitle>
              </div>
              <CardDescription>{t("transfer.descTransferBatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferBatchForm}>
                <form onSubmit={transferBatchForm.handleSubmit((v) => transferBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("transfer.successTransferBatch")), onError }))} className="space-y-6">
                  <FormField control={transferBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("transfer.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={transferBatchMutation.isPending || !canDo("op:transfer-batch")} title={!canDo("op:transfer-batch") ? t("common.noPermission") : undefined}>
                    {transferBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("transfer.executeTransferBatch")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Transfer Cancel SN ── */}
        {canDo("op:transfer-cancel") && (
        <TabsContent value="transfer-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("transfer.tabTransferCancel")}</CardTitle>
              </div>
              <CardDescription>{t("transfer.descTransferCancel")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((v) => transferCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("transfer.successTransferCancel")), onError }))} className="space-y-6">
                  <FormField control={transferForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("transfer.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={transferCancelMutation.isPending || !canDo("op:transfer-cancel")} title={!canDo("op:transfer-cancel") ? t("common.noPermission") : undefined}>
                    {transferCancelMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer-cancel") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("transfer.executeTransferCancel")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Transfer Cancel Batch ── */}
        {canDo("op:transfer-cancel-batch") && (
        <TabsContent value="transfer-cancel-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("transfer.tabTransferCancelBatch")}</CardTitle>
              </div>
              <CardDescription>{t("transfer.descTransferCancelBatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferBatchForm}>
                <form onSubmit={transferBatchForm.handleSubmit((v) => transferCancelBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("transfer.successTransferCancelBatch")), onError }))} className="space-y-6">
                  <FormField control={transferBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("transfer.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" variant="destructive" disabled={transferCancelBatchMutation.isPending || !canDo("op:transfer-cancel-batch")} title={!canDo("op:transfer-cancel-batch") ? t("common.noPermission") : undefined}>
                    {transferCancelBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer-cancel-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("transfer.executeTransferCancelBatch")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Pharmacy Sale ── */}
        {canDo("op:pharmacy-sale") && (
        <TabsContent value="sale">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <CardTitle>{t("transfer.cardSale")}</CardTitle>
              </div>
              <CardDescription>{t("transfer.descSale")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pharmacySaleForm}>
                <form onSubmit={pharmacySaleForm.handleSubmit((v) => pharmacySaleMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("transfer.successSale")), onError }))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={pharmacySaleForm.control} name="toGLN" render={({ field }) => (
                      <FormItem>
                        <GlnInput value={field.value} onChange={field.onChange} label={t("transfer.branchGLN")} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="prescriptionId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("transfer.prescriptionId")}</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder={t("transfer.prescriptionIdPlaceholder")} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="prescriptionDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("transfer.prescriptionDate")}</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="doctorId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("transfer.doctorId")}</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Doctor ID" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="patientNationalId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("transfer.patientNationalId")}</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="National ID" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={pharmacySaleMutation.isPending || !canDo("op:pharmacy-sale")} title={!canDo("op:pharmacy-sale") ? t("common.noPermission") : undefined}>
                    {pharmacySaleMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:pharmacy-sale") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("transfer.executeSale")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* ── Pharmacy Sale Cancel ── */}
        {canDo("op:pharmacy-sale-cancel") && (
        <TabsContent value="sale-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("transfer.cardSaleCancel")}</CardTitle>
              </div>
              <CardDescription>{t("transfer.descSaleCancel")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pharmacySaleCancelForm}>
                <form onSubmit={pharmacySaleCancelForm.handleSubmit((v) => pharmacySaleCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("transfer.successSaleCancel")), onError }))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={pharmacySaleCancelForm.control} name="toGLN" render={({ field }) => (
                      <FormItem>
                        <GlnInput value={field.value} onChange={field.onChange} label={t("transfer.branchGLN")} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleCancelForm.control} name="prescriptionId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("transfer.prescriptionId")}</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder={t("transfer.prescriptionIdPlaceholder")} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={pharmacySaleCancelMutation.isPending || !canDo("op:pharmacy-sale-cancel")} title={!canDo("op:pharmacy-sale-cancel") ? t("common.noPermission") : undefined}>
                    {pharmacySaleCancelMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:pharmacy-sale-cancel") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("transfer.executeSaleCancel")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      <SoapResponseViewer response={response} />
    </div>
  );
}
