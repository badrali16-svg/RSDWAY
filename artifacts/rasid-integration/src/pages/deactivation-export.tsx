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
import { Loader2, Ban, PlaneTakeoff, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const deactivationSchema = z.object({
  DR: z.string().min(1, "سبب التعطيل مطلوب"),
  explanation: z.string().min(1, "شرح التعطيل مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const deactivationCancelSchema = z.object({
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const exportSchema = z.object({
  countryCode: z.string().min(1, "كود الدولة مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

export default function DeactivationExportPage() {
  const { toast } = useToast();
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
        toast({ title: "تمت العملية", description: "تم تعطيل المنتجات بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleDeactivationCancel = (values: z.infer<typeof deactivationCancelSchema>) => {
    deactivationCancelMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم إلغاء تعطيل المنتجات بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleExport = (values: z.infer<typeof exportSchema>) => {
    exportMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم تصدير المنتجات بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleExportCancel = (values: z.infer<typeof deactivationCancelSchema>) => {
    exportCancelMutation.mutate({ data: { products: values.products } }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم إلغاء تصدير المنتجات بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">التعطيل والتصدير</h1>
        <p className="text-muted-foreground mt-1">إتلاف أو تعطيل المنتجات، وعمليات التصدير لخارج المملكة</p>
      </div>

      <Tabs defaultValue="deactivation" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="deactivation">تعطيل (Deactivate)</TabsTrigger>
          <TabsTrigger value="deactivation-cancel">إلغاء التعطيل</TabsTrigger>
          <TabsTrigger value="export">تصدير (Export)</TabsTrigger>
          <TabsTrigger value="export-cancel">إلغاء تصدير</TabsTrigger>
        </TabsList>

        <TabsContent value="deactivation">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" />
                <CardTitle>عملية تعطيل / إتلاف</CardTitle>
              </div>
              <CardDescription>تعطيل المنتجات (تالف، مسروق، مسحوب، الخ)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...deactivationForm}>
                <form onSubmit={deactivationForm.handleSubmit(handleDeactivation)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={deactivationForm.control} name="DR" render={({ field }) => (
                      <FormItem>
                        <FormLabel>سبب التعطيل (Deactivation Reason)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger dir="ltr" className="text-left">
                              <SelectValue placeholder="Select Reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent dir="ltr">
                            <SelectItem value="DAMAGED">DAMAGED (تالف)</SelectItem>
                            <SelectItem value="STOLEN">STOLEN (مسروق)</SelectItem>
                            <SelectItem value="RECALLED">RECALLED (مسحوب)</SelectItem>
                            <SelectItem value="EXPIRED">EXPIRED (منتهي الصلاحية)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={deactivationForm.control} name="explanation" render={({ field }) => (
                    <FormItem>
                      <FormLabel>تفاصيل إضافية (Explanation)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="تفاصيل سبب التعطيل أو الإتلاف..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={deactivationMutation.isPending}>
                    {deactivationMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية التعطيل
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deactivation-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء التعطيل</CardTitle>
              </div>
              <CardDescription>إعادة تفعيل منتجات تم تعطيلها بالخطأ</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...deactivationCancelForm}>
                <form onSubmit={deactivationCancelForm.handleSubmit(handleDeactivationCancel)} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={deactivationCancelMutation.isPending}>
                    {deactivationCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء عملية التعطيل
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="h-5 w-5 text-primary" />
                <CardTitle>عملية تصدير</CardTitle>
              </div>
              <CardDescription>تصدير المنتجات لخارج المملكة العربية السعودية</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...exportForm}>
                <form onSubmit={exportForm.handleSubmit(handleExport)} className="space-y-6">
                  <FormField control={exportForm.control} name="countryCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>كود الدولة (Country Code)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="مثال: AE" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={exportMutation.isPending}>
                    {exportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية التصدير
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء التصدير</CardTitle>
              </div>
              <CardDescription>إلغاء عملية تصدير سابقة وإعادة المنتجات لعهدة المنشأة</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...exportCancelForm}>
                <form onSubmit={exportCancelForm.handleSubmit(handleExportCancel)} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={exportCancelMutation.isPending}>
                    {exportCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء عملية التصدير
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SoapResponseViewer response={response} />
    </div>
  );
}