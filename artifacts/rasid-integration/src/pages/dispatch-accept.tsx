import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useDispatchProducts, 
  useDispatchCancelProducts, 
  useAcceptProducts, 
  useAcceptDispatch,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Truck, Check, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";

// Schemas
const dispatchSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

const acceptSchema = z.object({
  fromGLN: z.string().min(1, "رقم GLN المرسل مطلوب"),
  products: z.array(z.object({
    GTIN: z.string().min(1, "GTIN مطلوب"),
    SN: z.string().optional(),
    BN: z.string().optional(),
    XD: z.string().optional(),
    QUANTITY: z.number().optional()
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
  const acceptMutation = useAcceptProducts();
  const acceptDispatchMutation = useAcceptDispatch();

  const dispatchForm = useForm<z.infer<typeof dispatchSchema>>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: { toGLN: "", products: [] }
  });

  const acceptForm = useForm<z.infer<typeof acceptSchema>>({
    resolver: zodResolver(acceptSchema),
    defaultValues: { fromGLN: "", products: [] }
  });

  const acceptDispatchForm = useForm<z.infer<typeof acceptDispatchSchema>>({
    resolver: zodResolver(acceptDispatchSchema),
    defaultValues: { dispatchNotificationId: "" }
  });

  const handleDispatch = (values: z.infer<typeof dispatchSchema>, isCancel: boolean) => {
    const mutation = isCancel ? dispatchCancelMutation : dispatchMutation;
    mutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: isCancel ? "تم إرسال طلب إلغاء الإرسال بنجاح" : "تم إرسال المنتجات بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleAccept = (values: z.infer<typeof acceptSchema>) => {
    acceptMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم استلام المنتجات بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleAcceptDispatch = (values: z.infer<typeof acceptDispatchSchema>) => {
    acceptDispatchMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم قبول الإشعار بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">الإرسال والاستلام</h1>
        <p className="text-muted-foreground mt-1">عمليات الإرسال والاستلام بين الجهات في سلسلة التوريد</p>
      </div>

      <Tabs defaultValue="dispatch" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-grid">
          <TabsTrigger value="dispatch">إرسال (Dispatch)</TabsTrigger>
          <TabsTrigger value="dispatch-cancel">إلغاء إرسال</TabsTrigger>
          <TabsTrigger value="accept">استلام (Accept)</TabsTrigger>
          <TabsTrigger value="accept-dispatch">استلام عبر الإشعار</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <CardTitle>عملية إرسال</CardTitle>
              </div>
              <CardDescription>إرسال منتجات إلى جهة أخرى (منشأة أو مستودع أو صيدلية)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchForm}>
                <form onSubmit={dispatchForm.handleSubmit((v) => handleDispatch(v, false))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={dispatchMutation.isPending}>
                    {dispatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية الإرسال
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatch-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>إلغاء عملية إرسال</CardTitle>
              </div>
              <CardDescription>إلغاء عملية إرسال سابقة لم يتم استلامها بعد</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...dispatchForm}>
                <form onSubmit={dispatchForm.handleSubmit((v) => handleDispatch(v, true))} className="space-y-6">
                  <FormField control={dispatchForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={dispatchCancelMutation.isPending}>
                    {dispatchCancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    إلغاء الإرسال
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accept">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle>عملية استلام</CardTitle>
              </div>
              <CardDescription>تسجيل استلام منتجات من جهة أخرى</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptForm}>
                <form onSubmit={acceptForm.handleSubmit(handleAccept)} className="space-y-6">
                  <FormField control={acceptForm.control} name="fromGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المرسل (fromGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProductListInput />
                  <Button type="submit" disabled={acceptMutation.isPending}>
                    {acceptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    تنفيذ عملية الاستلام
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accept-dispatch">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <CardTitle>استلام عبر إشعار الإرسال</CardTitle>
              </div>
              <CardDescription>قبول كافة المنتجات الموجودة في إشعار إرسال مسبق</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...acceptDispatchForm}>
                <form onSubmit={acceptDispatchForm.handleSubmit(handleAcceptDispatch)} className="space-y-6">
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