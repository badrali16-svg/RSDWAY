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
    toast({ title: "تمت العملية", description: msg });
  };
  const onError = () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">النقل وصرف الصيدليات</h1>
        <p className="text-muted-foreground mt-1">عمليات النقل بين الفروع وصرف الأدوية للمرضى عبر الصيدليات</p>
      </div>

      <Tabs defaultValue={["transfer","transfer-batch","transfer-cancel","transfer-cancel-batch","pharmacy-sale","pharmacy-sale-cancel"].find(t => canDo(`op:${t}`))?.replace("pharmacy-sale-cancel","sale-cancel").replace("pharmacy-sale","sale") ?? "transfer"} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:transfer") && <TabsTrigger value="transfer">نقل (SN)</TabsTrigger>}
          {canDo("op:transfer-batch") && <TabsTrigger value="transfer-batch">نقل بالتشغيلة</TabsTrigger>}
          {canDo("op:transfer-cancel") && <TabsTrigger value="transfer-cancel">إلغاء نقل (SN)</TabsTrigger>}
          {canDo("op:transfer-cancel-batch") && <TabsTrigger value="transfer-cancel-batch">إلغاء نقل بالتشغيلة</TabsTrigger>}
          {canDo("op:pharmacy-sale") && <TabsTrigger value="sale">صرف دواء (Pharmacy Sale)</TabsTrigger>}
          {canDo("op:pharmacy-sale-cancel") && <TabsTrigger value="sale-cancel">إلغاء الصرف</TabsTrigger>}
        </TabsList>

        {/* ── Transfer SN ── */}
        {canDo("op:transfer") && (
        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <CardTitle>نقل بالرقم التسلسلي (SN)</CardTitle>
              </div>
              <CardDescription>نقل المنتجات بأرقامها التسلسلية بين الفروع — TransferService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((v) => transferMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم نقل المنتجات بنجاح"), onError }))} className="space-y-6">
                  <FormField control={transferForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={transferMutation.isPending || !canDo("op:transfer")} title={!canDo("op:transfer") ? "غير مصرّح بهذه العملية" : undefined}>
                    {transferMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    تنفيذ النقل (SN)
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
                <CardTitle>نقل بالتشغيلة (Batch)</CardTitle>
              </div>
              <CardDescription>نقل المنتجات بالكمية باستخدام رقم التشغيلة — TransferBatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferBatchForm}>
                <form onSubmit={transferBatchForm.handleSubmit((v) => transferBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم نقل المنتجات بالتشغيلة بنجاح"), onError }))} className="space-y-6">
                  <FormField control={transferBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={transferBatchMutation.isPending || !canDo("op:transfer-batch")} title={!canDo("op:transfer-batch") ? "غير مصرّح بهذه العملية" : undefined}>
                    {transferBatchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer-batch") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    تنفيذ النقل بالتشغيلة
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
                <CardTitle>إلغاء نقل بالرقم التسلسلي (SN)</CardTitle>
              </div>
              <CardDescription>إلغاء النقل الداخلي قبل قبوله — TransferCancelService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((v) => transferCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إلغاء النقل بنجاح"), onError }))} className="space-y-6">
                  <FormField control={transferForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={transferCancelMutation.isPending || !canDo("op:transfer-cancel")} title={!canDo("op:transfer-cancel") ? "غير مصرّح بهذه العملية" : undefined}>
                    {transferCancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer-cancel") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    إلغاء النقل (SN)
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
                <CardTitle>إلغاء نقل بالتشغيلة (Batch)</CardTitle>
              </div>
              <CardDescription>إلغاء نقل بالتشغيلة قبل قبوله — TransferCancelBatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferBatchForm}>
                <form onSubmit={transferBatchForm.handleSubmit((v) => transferCancelBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إلغاء النقل بالتشغيلة بنجاح"), onError }))} className="space-y-6">
                  <FormField control={transferBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" variant="destructive" disabled={transferCancelBatchMutation.isPending || !canDo("op:transfer-cancel-batch")} title={!canDo("op:transfer-cancel-batch") ? "غير مصرّح بهذه العملية" : undefined}>
                    {transferCancelBatchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:transfer-cancel-batch") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    إلغاء النقل بالتشغيلة
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
                <CardTitle>صرف أدوية (بيع)</CardTitle>
              </div>
              <CardDescription>صرف الأدوية للمريض من قبل الصيدلي — PharmacySaleService (SN فقط)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pharmacySaleForm}>
                <form onSubmit={pharmacySaleForm.handleSubmit((v) => pharmacySaleMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم صرف الأدوية بنجاح"), onError }))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={pharmacySaleForm.control} name="toGLN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GLN للفرع (toGLN)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Global Location Number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="prescriptionId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الوصفة (Prescription ID)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="رقم الوصفة الطبية" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="prescriptionDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الوصفة (Prescription Date)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="doctorId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الطبيب (اختياري)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Doctor ID" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleForm.control} name="patientNationalId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم هوية المريض (اختياري)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="National ID" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={pharmacySaleMutation.isPending || !canDo("op:pharmacy-sale")} title={!canDo("op:pharmacy-sale") ? "غير مصرّح بهذه العملية" : undefined}>
                    {pharmacySaleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:pharmacy-sale") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    تنفيذ عملية الصرف
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
                <CardTitle>إلغاء عملية صرف</CardTitle>
              </div>
              <CardDescription>إلغاء عملية صرف أدوية سابقة — PharmacySaleCancelService (SN فقط)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pharmacySaleCancelForm}>
                <form onSubmit={pharmacySaleCancelForm.handleSubmit((v) => pharmacySaleCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إلغاء صرف الأدوية بنجاح"), onError }))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={pharmacySaleCancelForm.control} name="toGLN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GLN للفرع (toGLN)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Global Location Number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={pharmacySaleCancelForm.control} name="prescriptionId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الوصفة (Prescription ID)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="رقم الوصفة الطبية" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={pharmacySaleCancelMutation.isPending || !canDo("op:pharmacy-sale-cancel")} title={!canDo("op:pharmacy-sale-cancel") ? "غير مصرّح بهذه العملية" : undefined}>
                    {pharmacySaleCancelMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:pharmacy-sale-cancel") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    إلغاء عملية الصرف
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
