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
import { Loader2, Truck, Check, Ban, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";

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
    toast({ title: "تمت العملية", description: msg });
  };
  const onError = () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">الإرسال والاستلام</h1>
        <p className="text-muted-foreground mt-1">عمليات الإرسال والاستلام بين الجهات في سلسلة التوريد</p>
      </div>

      <Tabs defaultValue="dispatch" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dispatch">إرسال (SN)</TabsTrigger>
          <TabsTrigger value="dispatch-batch">إرسال بالتشغيلة</TabsTrigger>
          <TabsTrigger value="dispatch-cancel">إلغاء إرسال (SN)</TabsTrigger>
          <TabsTrigger value="dispatch-cancel-batch">إلغاء إرسال بالتشغيلة</TabsTrigger>
          <TabsTrigger value="accept">استلام (SN)</TabsTrigger>
          <TabsTrigger value="accept-batch">استلام بالتشغيلة</TabsTrigger>
          <TabsTrigger value="accept-dispatch">استلام عبر الإشعار</TabsTrigger>
        </TabsList>

        {/* ── Dispatch SN ── */}
        <TabsContent value="dispatch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <CardTitle>إرسال بالرقم التسلسلي (SN)</CardTitle>
              </div>
              <CardDescription>إرسال منتجات محددة بأرقامها التسلسلية إلى جهة أخرى — DispatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchForm}>
                <form onSubmit={dispatchForm.handleSubmit((v) => dispatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إرسال المنتجات بنجاح"), onError }))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={dispatchMutation.isPending}>
                    {dispatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية الإرسال (SN)
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dispatch Batch ── */}
        <TabsContent value="dispatch-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>إرسال بالتشغيلة (Batch)</CardTitle>
              </div>
              <CardDescription>إرسال منتجات بالكمية باستخدام رقم التشغيلة (BN) بدلاً من الرقم التسلسلي — DispatchBatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchBatchForm}>
                <form onSubmit={dispatchBatchForm.handleSubmit((v) => dispatchBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إرسال المنتجات بالتشغيلة بنجاح"), onError }))} className="space-y-6">
                  <FormField control={dispatchBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={dispatchBatchMutation.isPending}>
                    {dispatchBatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الإرسال بالتشغيلة
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dispatch Cancel SN ── */}
        <TabsContent value="dispatch-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء إرسال بالرقم التسلسلي (SN)</CardTitle>
              </div>
              <CardDescription>إلغاء عملية إرسال سابقة لم يتم استلامها — DispatchCancelService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchForm}>
                <form onSubmit={dispatchForm.handleSubmit((v) => dispatchCancelMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إلغاء الإرسال بنجاح"), onError }))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" variant="destructive" disabled={dispatchCancelMutation.isPending}>
                    {dispatchCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء الإرسال (SN)
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Dispatch Cancel Batch ── */}
        <TabsContent value="dispatch-cancel-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء إرسال بالتشغيلة (Batch)</CardTitle>
              </div>
              <CardDescription>إلغاء عملية إرسال بالتشغيلة لم يتم استلامها — DispatchCancelBatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchBatchForm}>
                <form onSubmit={dispatchBatchForm.handleSubmit((v) => dispatchCancelBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم إلغاء الإرسال بالتشغيلة بنجاح"), onError }))} className="space-y-6">
                  <FormField control={dispatchBatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" variant="destructive" disabled={dispatchCancelBatchMutation.isPending}>
                    {dispatchCancelBatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء الإرسال بالتشغيلة
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Accept SN ── */}
        <TabsContent value="accept">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle>استلام بالرقم التسلسلي (SN)</CardTitle>
              </div>
              <CardDescription>تسجيل استلام منتجات محددة بأرقامها التسلسلية — AcceptService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptForm}>
                <form onSubmit={acceptForm.handleSubmit((v) => acceptMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم استلام المنتجات بنجاح"), onError }))} className="space-y-6">
                  <FormField control={acceptForm.control} name="fromGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المرسل (fromGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput mode="sn" />
                  <Button type="submit" disabled={acceptMutation.isPending}>
                    {acceptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الاستلام (SN)
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Accept Batch ── */}
        <TabsContent value="accept-batch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle>استلام بالتشغيلة (Batch)</CardTitle>
              </div>
              <CardDescription>تسجيل استلام منتجات بالكمية باستخدام رقم التشغيلة — AcceptBatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptBatchForm}>
                <form onSubmit={acceptBatchForm.handleSubmit((v) => acceptBatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم استلام المنتجات بالتشغيلة بنجاح"), onError }))} className="space-y-6">
                  <FormField control={acceptBatchForm.control} name="fromGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المرسل (fromGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput name="products" mode="batch" />
                  <Button type="submit" disabled={acceptBatchMutation.isPending}>
                    {acceptBatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ الاستلام بالتشغيلة
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Accept Dispatch ── */}
        <TabsContent value="accept-dispatch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle>استلام عبر إشعار الإرسال</CardTitle>
              </div>
              <CardDescription>قبول كافة المنتجات الموجودة في إشعار إرسال مسبق — AcceptDispatchService</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptDispatchForm}>
                <form onSubmit={acceptDispatchForm.handleSubmit((v) => acceptDispatchMutation.mutate({ data: v }, { onSuccess: (r) => onSuccess(r, "تم قبول الإشعار بنجاح"), onError }))} className="space-y-6">
                  <FormField control={acceptDispatchForm.control} name="dispatchNotificationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم إشعار الإرسال (Dispatch Notification ID)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="ID..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={acceptDispatchMutation.isPending}>
                    {acceptDispatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    استلام الإشعار
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
