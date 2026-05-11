import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useReturnProducts, 
  useReturnBatchProducts,
  useConsumeProducts, 
  useConsumeCancelProducts,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RotateCcw, Activity, Ban, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { GlnInput } from "@/components/gln-input";
import { InvoiceBar } from "@/components/invoice-bar";
import { useInvoiceGuard } from "@/lib/use-invoice-guard";
import { useLanguage } from "@/lib/use-language";

function withInvoice<T extends object>(data: T, inv: string): T {
  if (!inv.trim()) return data;
  return { ...data, invoiceNumber: inv.trim() } as T;
}

const returnSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const returnBatchSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().min(1, "الكمية مطلوبة")
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const consumeSchema = z.object({
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

export default function ReturnConsumePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);
  const [invoiceNum, setInvoiceNum] = useState("");
  const [invoiceAlert, setInvoiceAlert] = useState(true);
  const { guard, dialogOpen, confirmSubmit, cancelSubmit } = useInvoiceGuard(invoiceNum, invoiceAlert);

  const returnMutation = useReturnProducts();
  const returnBatchMutation = useReturnBatchProducts();
  const consumeMutation = useConsumeProducts();
  const consumeCancelMutation = useConsumeCancelProducts();

  const returnForm = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
    defaultValues: { toGLN: "", products: [] }
  });

  const returnBatchForm = useForm<z.infer<typeof returnBatchSchema>>({
    resolver: zodResolver(returnBatchSchema),
    defaultValues: { toGLN: "", products: [] }
  });

  const consumeForm = useForm<z.infer<typeof consumeSchema>>({
    resolver: zodResolver(consumeSchema),
    defaultValues: { products: [] }
  });

  const cancelForm = useForm<z.infer<typeof consumeSchema>>({
    resolver: zodResolver(consumeSchema),
    defaultValues: { products: [] }
  });

  const onSuccess = (res: SoapResponse, msg: string) => {
    setResponse(res);
    toast({ title: t("common.saved"), description: msg });
  };
  const onError = () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("return.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("return.subtitle")}</p>
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

      <Tabs defaultValue={["return","return-batch","consume","consume-cancel"].find(tab => canDo(`op:${tab}`)) ?? "return"} onValueChange={() => setInvoiceNum("")} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:return") && <TabsTrigger value="return">{t("return.tabReturn")}</TabsTrigger>}
          {canDo("op:return-batch") && <TabsTrigger value="return-batch">{t("return.tabReturnBatch")}</TabsTrigger>}
          {canDo("op:consume") && <TabsTrigger value="consume">{t("return.tabConsume")}</TabsTrigger>}
          {canDo("op:consume-cancel") && <TabsTrigger value="consume-cancel">{t("return.tabConsumeCancel")}</TabsTrigger>}
        </TabsList>

        {canDo("op:return") && (
        <TabsContent value="return">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                <CardTitle>{t("return.tabReturn")}</CardTitle>
              </div>
              <CardDescription>{t("return.descReturn")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...returnForm}>
                <form onSubmit={returnForm.handleSubmit((v) => guard(() => returnMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("return.successReturn")), onError })))} className="space-y-6">
                  <FormField control={returnForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("return.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={returnMutation.isPending}>
                    {returnMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("return.executeReturn")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:return-batch") && (
        <TabsContent value="return-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>{t("return.tabReturnBatch")}</CardTitle>
              </div>
              <CardDescription>{t("return.descReturnBatch")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...returnBatchForm}>
                <form onSubmit={returnBatchForm.handleSubmit((v) => guard(() => returnBatchMutation.mutate({ data: withInvoice(v, invoiceNum) }, { onSuccess: (r) => onSuccess(r, t("return.successReturnBatch")), onError })))} className="space-y-6">
                  <FormField control={returnBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("return.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={returnBatchMutation.isPending}>
                    {returnBatchMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("return.executeReturnBatch")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:consume") && (
        <TabsContent value="consume">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>{t("return.cardConsume")}</CardTitle>
              </div>
              <CardDescription>{t("return.descConsume")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...consumeForm}>
                <form onSubmit={consumeForm.handleSubmit((v) => guard(() => consumeMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("return.successConsume")), onError })))} className="space-y-6">
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={consumeMutation.isPending}>
                    {consumeMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("return.executeConsume")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:consume-cancel") && (
        <TabsContent value="consume-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("return.cardConsumeCancel")}</CardTitle>
              </div>
              <CardDescription>{t("return.descConsumeCancel")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form onSubmit={cancelForm.handleSubmit((v) => guard(() => consumeCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("return.successConsumeCancel")), onError })))} className="space-y-6">
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={consumeCancelMutation.isPending}>
                    {consumeCancelMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("return.executeConsumeCancel")}
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
