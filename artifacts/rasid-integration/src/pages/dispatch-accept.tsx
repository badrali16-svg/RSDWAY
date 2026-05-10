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
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Truck, Check, Ban, Layers, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { GlnInput } from "@/components/gln-input";
import { useLanguage } from "@/lib/language-context";

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

export default function DispatchAcceptPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const dispatchMutation = useDispatchProducts();
  const dispatchCancelMutation = useDispatchCancelProducts();
  const dispatchBatchMutation = useDispatchBatchProducts();
  const dispatchCancelBatchMutation = useDispatchCancelBatchProducts();
  const acceptMutation = useAcceptProducts();
  const acceptBatchMutation = useAcceptBatchProducts();
  const acceptDispatchMutation = useAcceptDispatch();

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

      <Tabs defaultValue={["dispatch","dispatch-batch","dispatch-cancel","dispatch-cancel-batch","accept","accept-batch","accept-dispatch"].find(tab => canDo(`op:${tab}`)) ?? "dispatch"} className="space-y-6">
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
                <form onSubmit={dispatchForm.handleSubmit((v) => dispatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatch")), onError }))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={dispatchMutation.isPending || !canDo("op:dispatch")} title={!canDo("op:dispatch") ? t("common.noPermission") : undefined}>
                    {dispatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("dispatch.executeDispatch")}
                  </Button>
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
                <form onSubmit={dispatchBatchForm.handleSubmit((v) => dispatchBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatchBatch")), onError }))} className="space-y-6">
                  <FormField control={dispatchBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={dispatchBatchMutation.isPending || !canDo("op:dispatch-batch")} title={!canDo("op:dispatch-batch") ? t("common.noPermission") : undefined}>
                    {dispatchBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("dispatch.executeDispatchBatch")}
                  </Button>
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
                <form onSubmit={dispatchForm.handleSubmit((v) => dispatchCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatchCancel")), onError }))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={dispatchCancelMutation.isPending || !canDo("op:dispatch-cancel")} title={!canDo("op:dispatch-cancel") ? t("common.noPermission") : undefined}>
                    {dispatchCancelMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch-cancel") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("dispatch.executeDispatchCancel")}
                  </Button>
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
                <form onSubmit={dispatchBatchForm.handleSubmit((v) => dispatchCancelBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("dispatch.successDispatchCancelBatch")), onError }))} className="space-y-6">
                  <FormField control={dispatchBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" variant="destructive" disabled={dispatchCancelBatchMutation.isPending || !canDo("op:dispatch-cancel-batch")} title={!canDo("op:dispatch-cancel-batch") ? t("common.noPermission") : undefined}>
                    {dispatchCancelBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:dispatch-cancel-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("dispatch.executeDispatchCancelBatch")}
                  </Button>
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
                <form onSubmit={acceptForm.handleSubmit((v) => acceptMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("dispatch.successAccept")), onError }))} className="space-y-6">
                  <FormField control={acceptForm.control} name="fromGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.fromGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={acceptMutation.isPending || !canDo("op:accept")} title={!canDo("op:accept") ? t("common.noPermission") : undefined}>
                    {acceptMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:accept") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("dispatch.executeAccept")}
                  </Button>
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
                <form onSubmit={acceptBatchForm.handleSubmit((v) => acceptBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("dispatch.successAcceptBatch")), onError }))} className="space-y-6">
                  <FormField control={acceptBatchForm.control} name="fromGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("dispatch.fromGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={acceptBatchMutation.isPending || !canDo("op:accept-batch")} title={!canDo("op:accept-batch") ? t("common.noPermission") : undefined}>
                    {acceptBatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:accept-batch") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("dispatch.executeAcceptBatch")}
                  </Button>
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
                <form onSubmit={acceptDispatchForm.handleSubmit((v) => acceptDispatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, t("dispatch.successAcceptDispatch")), onError }))} className="space-y-6">
                  <FormField control={acceptDispatchForm.control} name="dispatchNotificationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("dispatch.notifId")}</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="ID..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={acceptDispatchMutation.isPending || !canDo("op:accept-dispatch")} title={!canDo("op:accept-dispatch") ? t("common.noPermission") : undefined}>
                    {acceptDispatchMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:accept-dispatch") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("dispatch.executeAcceptDispatch")}
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
