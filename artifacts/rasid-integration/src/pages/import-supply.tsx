import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useImportProducts, 
  useImportCancelProducts, 
  useSupplyProducts, 
  useSupplyCancelProducts,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PackagePlus, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";

// Schema for Import/Supply
const importSchema = z.object({
  GTIN: z.string().min(1, "GTIN مطلوب"),
  MD: z.string().min(1, "تاريخ التصنيع (MD) مطلوب"),
  XD: z.string().min(1, "تاريخ الانتهاء (XD) مطلوب"),
  BN: z.string().min(1, "رقم التشغيلة (BN) مطلوب"),
  serialNumbersStr: z.string().min(1, "الأرقام التسلسلية مطلوبة"),
});

// Schema for Cancel operations
const cancelSchema = z.object({
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

export default function ImportSupplyPage() {
  const { toast } = useToast();
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const importMutation = useImportProducts();
  const importCancelMutation = useImportCancelProducts();
  const supplyMutation = useSupplyProducts();
  const supplyCancelMutation = useSupplyCancelProducts();

  const importForm = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: { GTIN: "", MD: "", XD: "", BN: "", serialNumbersStr: "" }
  });

  const cancelForm = useForm<z.infer<typeof cancelSchema>>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { products: [] }
  });

  const handleImportSubmit = (values: z.infer<typeof importSchema>, isSupply: boolean) => {
    const serialNumbers = values.serialNumbersStr.split('\n').map(s => s.trim()).filter(Boolean);
    const payload = {
      GTIN: values.GTIN,
      MD: values.MD,
      XD: values.XD,
      BN: values.BN,
      serialNumbers
    };
    
    const mutation = isSupply ? supplyMutation : importMutation;
    
    mutation.mutate({ data: payload }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم إرسال الطلب بنجاح" });
      },
      onError: (err) => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });
      }
    });
  };

  const handleCancelSubmit = (values: z.infer<typeof cancelSchema>, isSupply: boolean) => {
    const mutation = isSupply ? supplyCancelMutation : importCancelMutation;
    
    mutation.mutate({ data: { products: values.products } }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم إرسال طلب الإلغاء بنجاح" });
      },
      onError: () => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">الاستيراد والتصنيع</h1>
        <p className="text-muted-foreground mt-1">عمليات تسجيل الأدوية المستوردة أو المصنعة محلياً في نظام رصد</p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="import">استيراد (Import)</TabsTrigger>
          <TabsTrigger value="import-cancel">إلغاء استيراد (Cancel Import)</TabsTrigger>
          <TabsTrigger value="supply">تصنيع (Supply)</TabsTrigger>
          <TabsTrigger value="supply-cancel">إلغاء تصنيع (Cancel Supply)</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-primary" />
                <CardTitle>عملية استيراد جديدة</CardTitle>
              </div>
              <CardDescription>تسجيل منتجات تم استيرادها مؤخراً مع تحديد الأرقام التسلسلية</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...importForm}>
                <form onSubmit={importForm.handleSubmit((v) => handleImportSubmit(v, false))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={importForm.control} name="GTIN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GTIN</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="00000000000000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={importForm.control} name="BN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم التشغيلة (BN)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Batch Number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={importForm.control} name="MD" render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ التصنيع (MD)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={importForm.control} name="XD" render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الانتهاء (XD)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <FormField control={importForm.control} name="serialNumbersStr" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الأرقام التسلسلية (SNs) - رقم في كل سطر</FormLabel>
                      <FormControl>
                        <Textarea dir="ltr" className="text-left font-mono min-h-[150px]" placeholder="123456789&#10;987654321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" disabled={importMutation.isPending} className="w-full sm:w-auto">
                    {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية الاستيراد
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Cancel Tab */}
        <TabsContent value="import-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء عملية استيراد</CardTitle>
              </div>
              <CardDescription>إلغاء تسجيل منتجات تم استيرادها بالخطأ</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form onSubmit={cancelForm.handleSubmit((v) => handleCancelSubmit(v, false))} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={importCancelMutation.isPending} className="w-full sm:w-auto">
                    {importCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الإلغاء
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supply Tab */}
        <TabsContent value="supply">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-primary" />
                <CardTitle>عملية تصنيع جديدة</CardTitle>
              </div>
              <CardDescription>تسجيل منتجات تم تصنيعها محلياً</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...importForm}>
                <form onSubmit={importForm.handleSubmit((v) => handleImportSubmit(v, true))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={importForm.control} name="GTIN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GTIN</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="00000000000000" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={importForm.control} name="BN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم التشغيلة (BN)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Batch Number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={importForm.control} name="MD" render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ التصنيع (MD)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={importForm.control} name="XD" render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الانتهاء (XD)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  
                  <FormField control={importForm.control} name="serialNumbersStr" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الأرقام التسلسلية (SNs) - رقم في كل سطر</FormLabel>
                      <FormControl>
                        <Textarea dir="ltr" className="text-left font-mono min-h-[150px]" placeholder="123456789&#10;987654321" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="submit" disabled={supplyMutation.isPending} className="w-full sm:w-auto">
                    {supplyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية التصنيع
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supply Cancel Tab */}
        <TabsContent value="supply-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء عملية تصنيع</CardTitle>
              </div>
              <CardDescription>إلغاء تسجيل منتجات تم تصنيعها بالخطأ</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form onSubmit={cancelForm.handleSubmit((v) => handleCancelSubmit(v, true))} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={supplyCancelMutation.isPending} className="w-full sm:w-auto">
                    {supplyCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الإلغاء
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