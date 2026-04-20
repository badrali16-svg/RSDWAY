import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useReturnProducts, 
  useConsumeProducts, 
  useConsumeCancelProducts,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RotateCcw, Activity, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";

const returnSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const consumeSchema = z.object({
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

export default function ReturnConsumePage() {
  const { toast } = useToast();
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const returnMutation = useReturnProducts();
  const consumeMutation = useConsumeProducts();
  const consumeCancelMutation = useConsumeCancelProducts();

  const returnForm = useForm<z.infer<typeof returnSchema>>({
    resolver: zodResolver(returnSchema),
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

  const handleReturn = (values: z.infer<typeof returnSchema>) => {
    returnMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم إرسال طلب الإرجاع بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleConsume = (values: z.infer<typeof consumeSchema>, isCancel: boolean) => {
    const mutation = isCancel ? consumeCancelMutation : consumeMutation;
    mutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: isCancel ? "تم إلغاء الاستهلاك بنجاح" : "تم تسجيل الاستهلاك بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">الإرجاع والاستهلاك</h1>
        <p className="text-muted-foreground mt-1">عمليات إرجاع الأدوية للمورد أو تسجيل استهلاكها (للمستشفيات)</p>
      </div>

      <Tabs defaultValue="return" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="return">إرجاع (Return)</TabsTrigger>
          <TabsTrigger value="consume">استهلاك (Consume)</TabsTrigger>
          <TabsTrigger value="consume-cancel">إلغاء استهلاك</TabsTrigger>
        </TabsList>

        <TabsContent value="return">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                <CardTitle>عملية إرجاع</CardTitle>
              </div>
              <CardDescription>إرجاع المنتجات إلى المورد أو المصنع</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...returnForm}>
                <form onSubmit={returnForm.handleSubmit(handleReturn)} className="space-y-6">
                  <FormField control={returnForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={returnMutation.isPending}>
                    {returnMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الإرجاع
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consume">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>تسجيل استهلاك</CardTitle>
              </div>
              <CardDescription>تسجيل استهلاك الأدوية (للمستشفيات والعيادات)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...consumeForm}>
                <form onSubmit={consumeForm.handleSubmit((v) => handleConsume(v, false))} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" disabled={consumeMutation.isPending}>
                    {consumeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تسجيل الاستهلاك
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consume-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء الاستهلاك</CardTitle>
              </div>
              <CardDescription>إلغاء عملية استهلاك سابقة</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form onSubmit={cancelForm.handleSubmit((v) => handleConsume(v, true))} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={consumeCancelMutation.isPending}>
                    {consumeCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء الاستهلاك
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