import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useDeactivateProducts, 
  useDeactivationCancel, 
  useExportProducts, 
  useExportCancelProducts,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Ban, PlaneTakeoff, ShieldAlert, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/language-context";

const deactivationSchema = z.object({
  DR: z.string().min(1, "سبب التعطيل مطلوب"),
  explanation: z.string().min(1, "شرح التعطيل مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const deactivationCancelSchema = z.object({
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const exportSchema = z.object({
  countryCode: z.string().min(1, "كود الدولة مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

export default function DeactivationExportPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const deactivationMutation = useDeactivateProducts();
  const deactivationCancelMutation = useDeactivationCancel();
  const exportMutation = useExportProducts();
  const exportCancelMutation = useExportCancelProducts();

  const deactivationForm = useForm<z.infer<typeof deactivationSchema>>({
    resolver: zodResolver(deactivationSchema),
    defaultValues: { DR: "", explanation: "", products: [] }
  });

  const deactivationCancelForm = useForm<z.infer<typeof deactivationCancelSchema>>({
    resolver: zodResolver(deactivationCancelSchema),
    defaultValues: { products: [] }
  });

  const exportForm = useForm<z.infer<typeof exportSchema>>({
    resolver: zodResolver(exportSchema),
    defaultValues: { countryCode: "", products: [] }
  });

  const exportCancelForm = useForm<z.infer<typeof deactivationCancelSchema>>({
    resolver: zodResolver(deactivationCancelSchema),
    defaultValues: { products: [] }
  });

  const handleDeactivation = (values: z.infer<typeof deactivationSchema>) => {
    deactivationMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: t("common.saved"), description: t("deactivation.successDeactivation") });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleDeactivationCancel = (values: z.infer<typeof deactivationCancelSchema>) => {
    deactivationCancelMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: t("common.saved"), description: t("deactivation.successDeactivationCancel") });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleExport = (values: z.infer<typeof exportSchema>) => {
    exportMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: t("common.saved"), description: t("deactivation.successExport") });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleExportCancel = (values: z.infer<typeof deactivationCancelSchema>) => {
    exportCancelMutation.mutate({ data: { products: values.products } }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: t("common.saved"), description: t("deactivation.successExportCancel") });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("deactivation.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("deactivation.subtitle")}</p>
      </div>

      <Tabs defaultValue={["deactivation","deactivation-cancel","export","export-cancel"].find(tab => canDo(`op:${tab}`)) ?? "deactivation"} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:deactivation") && <TabsTrigger value="deactivation">{t("deactivation.tabDeactivation")}</TabsTrigger>}
          {canDo("op:deactivation-cancel") && <TabsTrigger value="deactivation-cancel">{t("deactivation.tabDeactivationCancel")}</TabsTrigger>}
          {canDo("op:export") && <TabsTrigger value="export">{t("deactivation.tabExport")}</TabsTrigger>}
          {canDo("op:export-cancel") && <TabsTrigger value="export-cancel">{t("deactivation.tabExportCancel")}</TabsTrigger>}
        </TabsList>

        {canDo("op:deactivation") && (
        <TabsContent value="deactivation">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle>{t("deactivation.cardDeactivation")}</CardTitle>
              </div>
              <CardDescription>{t("deactivation.cardDeactivationDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...deactivationForm}>
                <form onSubmit={deactivationForm.handleSubmit(handleDeactivation)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={deactivationForm.control} name="DR" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("deactivation.drLabel")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger dir="ltr" className="text-left">
                              <SelectValue placeholder="Select Reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir="ltr">
                            <SelectItem value="DAMAGED">{t("deactivation.drDamaged")}</SelectItem>
                            <SelectItem value="STOLEN">{t("deactivation.drStolen")}</SelectItem>
                            <SelectItem value="RECALLED">{t("deactivation.drRecalled")}</SelectItem>
                            <SelectItem value="EXPIRED">{t("deactivation.drExpired")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={deactivationForm.control} name="explanation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("deactivation.explanationLabel")}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={t("deactivation.explanationPlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={deactivationMutation.isPending || !canDo("op:deactivation")} title={!canDo("op:deactivation") ? t("common.noPermission") : undefined}>
                    {deactivationMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:deactivation") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("deactivation.executeDeactivation")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:deactivation-cancel") && (
        <TabsContent value="deactivation-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("deactivation.cardDeactivationCancel")}</CardTitle>
              </div>
              <CardDescription>{t("deactivation.cardDeactivationCancelDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...deactivationCancelForm}>
                <form onSubmit={deactivationCancelForm.handleSubmit(handleDeactivationCancel)} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={deactivationCancelMutation.isPending || !canDo("op:deactivation-cancel")} title={!canDo("op:deactivation-cancel") ? t("common.noPermission") : undefined}>
                    {deactivationCancelMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:deactivation-cancel") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("deactivation.executeDeactivationCancel")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:export") && (
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="h-5 w-5 text-primary" />
                <CardTitle>{t("deactivation.cardExport")}</CardTitle>
              </div>
              <CardDescription>{t("deactivation.cardExportDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...exportForm}>
                <form onSubmit={exportForm.handleSubmit(handleExport)} className="space-y-6">
                  <FormField control={exportForm.control} name="countryCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("deactivation.countryCodeLabel")}</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder={t("deactivation.countryCodePlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={exportMutation.isPending || !canDo("op:export")} title={!canDo("op:export") ? t("common.noPermission") : undefined}>
                    {exportMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:export") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("deactivation.executeExport")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:export-cancel") && (
        <TabsContent value="export-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("deactivation.cardExportCancel")}</CardTitle>
              </div>
              <CardDescription>{t("deactivation.cardExportCancelDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...exportCancelForm}>
                <form onSubmit={exportCancelForm.handleSubmit(handleExportCancel)} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={exportCancelMutation.isPending || !canDo("op:export-cancel")} title={!canDo("op:export-cancel") ? t("common.noPermission") : undefined}>
                    {exportCancelMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:export-cancel") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("deactivation.executeExportCancel")}
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