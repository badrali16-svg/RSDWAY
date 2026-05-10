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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RotateCcw, Activity, Ban, Layers, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { GlnInput } from "@/components/gln-input";

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
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);

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
    toast({ title: "تمت العملية", description: msg });
  };
  const onError = () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">الإرجاع والاستهلاك</h1>
        <p className="text-muted-foreground mt-1">عمليات إرجاع الأدوية للمورد أو تسجيل استهلاكها (للمستشفيات)</p>
      </div>

      <Tabs defaultValue={["return","return-batch","consume","consume-cancel"].find(t => canDo(`op:${t}`)) ?? "return"} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:return") && <TabsTrigger value="return">إرجاع (SN)</TabsTrigger>}
          {canDo("op:return-batch") && <TabsTrigger value="return-batch">إرجاع بالتشغيلة</TabsTrigger>}
          {canDo("op:consume") && <TabsTrigger value="consume">استهلاك (Consume)</TabsTrigger>}
          {canDo("op:consume-cancel") && <TabsTrigger value="consume-cancel">إلغاء استهلاك</TabsTrigger>}
        </TabsList>

        {canDo("op:return") && (
        <TabsContent value="return">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary" />
                <CardTitle>إرجاع بالرقم التسلسلي (SN)</CardTitle>
              </div>
              <CardDescription>إرجاع المنتجات بأرقامها التسلسلية إلى المورد أو المصنع — ReturnService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...returnForm}>
                <form onSubmit={returnForm.handleSubmit((v) => returnMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إرسال طلب الإرجاع بنجاح"), onError }))} className="space-y-6">
                  <FormField control={returnForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label="GLN المستلم (toGLN)" />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={returnMutation.isPending}>
                    {returnMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الإرجاع (SN)
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
                <CardTitle>إرجاع بالتشغيلة (Batch)</CardTitle>
              </div>
              <CardDescription>إرجاع المنتجات بالكمية باستخدام رقم التشغيلة — ReturnBatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...returnBatchForm}>
                <form onSubmit={returnBatchForm.handleSubmit((v) => returnBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم الإرجاع بالتشغيلة بنجاح"), onError }))} className="space-y-6">
                  <FormField control={returnBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label="GLN المستلم (toGLN)" />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={returnBatchMutation.isPending}>
                    {returnBatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الإرجاع بالتشغيلة
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
                <CardTitle>تسجيل استهلاك</CardTitle>
              </div>
              <CardDescription>تسجيل استهلاك الأدوية (للمستشفيات والعيادات) — ConsumeService (SN فقط)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...consumeForm}>
                <form onSubmit={consumeForm.handleSubmit((v) => consumeMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم تسجيل الاستهلاك بنجاح"), onError }))} className="space-y-6">
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={consumeMutation.isPending}>
                    {consumeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تسجيل الاستهلاك
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
                <CardTitle>إلغاء الاستهلاك</CardTitle>
              </div>
              <CardDescription>إلغاء عملية استهلاك سابقة — ConsumeCancelService (SN فقط)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form onSubmit={cancelForm.handleSubmit((v) => consumeCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إلغاء الاستهلاك بنجاح"), onError }))} className="space-y-6">
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={consumeCancelMutation.isPending}>
                    {consumeCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء الاستهلاك
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
