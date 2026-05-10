import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useTransferProducts, 
  useTransferCancelProducts, 
  usePharmacySale, 
  usePharmacySaleCancel,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Repeat, ShoppingCart, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const transferMutation = useTransferProducts();
  const transferCancelMutation = useTransferCancelProducts();
  const pharmacySaleMutation = usePharmacySale();
  const pharmacySaleCancelMutation = usePharmacySaleCancel();

  const transferForm = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
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

  const handleTransfer = (values: z.infer<typeof transferSchema>, isCancel: boolean) => {
    const mutation = isCancel ? transferCancelMutation : transferMutation;
    mutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: isCancel ? "تم إلغاء النقل بنجاح" : "تم نقل المنتجات بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handlePharmacySale = (values: z.infer<typeof pharmacySaleSchema>) => {
    pharmacySaleMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم صرف الأدوية بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handlePharmacySaleCancel = (values: z.infer<typeof pharmacySaleCancelSchema>) => {
    pharmacySaleCancelMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم إلغاء صرف الأدوية بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">النقل وصرف الصيدليات</h1>
        <p className="text-muted-foreground mt-1">عمليات النقل بين الفروع وصرف الأدوية للمرضى عبر الصيدليات</p>
      </div>

      <Tabs defaultValue="transfer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="transfer">نقل داخلي (Transfer)</TabsTrigger>
          <TabsTrigger value="transfer-cancel">إلغاء النقل</TabsTrigger>
          <TabsTrigger value="sale">صرف دواء (Pharmacy Sale)</TabsTrigger>
          <TabsTrigger value="sale-cancel">إلغاء الصرف</TabsTrigger>
        </TabsList>

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <CardTitle>عملية نقل بين الفروع</CardTitle>
              </div>
              <CardDescription>نقل المنتجات بين فروع نفس المنشأة (مستودع إلى صيدلية، الخ)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((v) => handleTransfer(v, false))} className="space-y-6">
                  <FormField control={transferForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={transferMutation.isPending}>
                    {transferMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية النقل
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء عملية نقل</CardTitle>
              </div>
              <CardDescription>إلغاء النقل الداخلي وإعادة المنتجات لعهدة الفرع المرسل</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((v) => handleTransfer(v, true))} className="space-y-6">
                  <FormField control={transferForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={transferCancelMutation.isPending}>
                    {transferCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء عملية النقل
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sale">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <CardTitle>صرف أدوية (بيع)</CardTitle>
              </div>
              <CardDescription>صرف الأدوية للمريض من قبل الصيدلي</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pharmacySaleForm}>
                <form onSubmit={pharmacySaleForm.handleSubmit(handlePharmacySale)} className="space-y-6">
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
                  <ProductListInput />
                  <Button type="submit" disabled={pharmacySaleMutation.isPending}>
                    {pharmacySaleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية الصرف
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sale-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء عملية صرف</CardTitle>
              </div>
              <CardDescription>إلغاء عملية صرف أدوية سابقة وإعادة المنتجات لعهدة الصيدلية</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pharmacySaleCancelForm}>
                <form onSubmit={pharmacySaleCancelForm.handleSubmit(handlePharmacySaleCancel)} className="space-y-6">
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
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={pharmacySaleCancelMutation.isPending}>
                    {pharmacySaleCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء عملية الصرف
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