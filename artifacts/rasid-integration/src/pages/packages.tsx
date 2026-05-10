import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  usePackageUpload, 
  usePackageDownload, 
  usePackageQuery,
  SoapResponse
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Download, Search, Box, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { Checkbox } from "@/components/ui/checkbox";

const uploadSchema = z.object({
  toGLN: z.string().min(1, "رقم GLN المستلم مطلوب"),
  fileBase64: z.string().min(1, "محتوى الملف مطلوب")
});

const downloadSchema = z.object({
  transferId: z.string().min(1, "رقم النقل مطلوب")
});

const querySchema = z.object({
  fromGLN: z.string().optional(),
  toGLN: z.string().optional(),
  getAll: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export default function PackagesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);

  const uploadMutation = usePackageUpload();
  const downloadMutation = usePackageDownload();
  const queryMutation = usePackageQuery();

  const uploadForm = useForm<z.infer<typeof uploadSchema>>({
    resolver: zodResolver(uploadSchema),
    defaultValues: { toGLN: "", fileBase64: "" }
  });

  const downloadForm = useForm<z.infer<typeof downloadSchema>>({
    resolver: zodResolver(downloadSchema),
    defaultValues: { transferId: "" }
  });

  const queryForm = useForm<z.infer<typeof querySchema>>({
    resolver: zodResolver(querySchema),
    defaultValues: { fromGLN: "", toGLN: "", getAll: false, startDate: "", endDate: "" }
  });

  const handleUpload = (values: z.infer<typeof uploadSchema>) => {
    uploadMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم رفع الحزمة بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleDownload = (values: z.infer<typeof downloadSchema>) => {
    downloadMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم طلب تنزيل الحزمة بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleQuery = (values: z.infer<typeof querySchema>) => {
    queryMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: "تمت العملية", description: "تم الاستعلام بنجاح" });
      },
      onError: () => toast({ title: "خطأ", description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">نقل الحزم (Packages)</h1>
        <p className="text-muted-foreground mt-1">رفع وتنزيل حزم البيانات الكبيرة والاستعلام عنها</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="upload">رفع حزمة (Upload)</TabsTrigger>
          <TabsTrigger value="download">تنزيل حزمة (Download)</TabsTrigger>
          <TabsTrigger value="query">استعلام الحزم (Query)</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle>رفع حزمة بيانات</CardTitle>
              </div>
              <CardDescription>رفع ملف مشفر بصيغة Base64 يحتوي على حزمة بيانات</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-6">
                  <FormField control={uploadForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <FormLabel>GLN المستلم (toGLN)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Global Location Number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={uploadForm.control} name="fileBase64" render={({ field }) => (
                    <FormItem>
                      <FormLabel>محتوى الملف (Base64 Encoded)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left font-mono text-xs" placeholder="JVBERi0xLjQKJcOkw7zDtsO..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={uploadMutation.isPending || !canDo("op:package-upload")} title={!canDo("op:package-upload") ? "غير مصرّح بهذه العملية" : undefined}>
                    {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:package-upload") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    رفع الحزمة
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle>تنزيل حزمة بيانات</CardTitle>
              </div>
              <CardDescription>تنزيل حزمة عن طريق رقم النقل (Transfer ID)</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...downloadForm}>
                <form onSubmit={downloadForm.handleSubmit(handleDownload)} className="space-y-6">
                  <FormField control={downloadForm.control} name="transferId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم النقل (Transfer ID)</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Transfer ID" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={downloadMutation.isPending || !canDo("op:package-download")} title={!canDo("op:package-download") ? "غير مصرّح بهذه العملية" : undefined}>
                    {downloadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:package-download") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    تنزيل الحزمة
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <CardTitle>استعلام عن الحزم</CardTitle>
              </div>
              <CardDescription>البحث عن حزم البيانات الصادرة أو الواردة</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...queryForm}>
                <form onSubmit={queryForm.handleSubmit(handleQuery)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={queryForm.control} name="fromGLN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GLN المرسل (اختياري)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Global Location Number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={queryForm.control} name="toGLN" render={({ field }) => (
                      <FormItem>
                        <FormLabel>GLN المستلم (اختياري)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" placeholder="Global Location Number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={queryForm.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>من تاريخ (اختياري)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={queryForm.control} name="endDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>إلى تاريخ (اختياري)</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={queryForm.control} name="getAll" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mr-2" />
                      </FormControl>
                      <div className="space-y-1 leading-none mr-2">
                        <FormLabel>جلب كافة الحزم (getAll)</FormLabel>
                        <FormDescription>سيتم جلب كافة الحزم دون تحديد</FormDescription>
                      </div>
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={queryMutation.isPending || !canDo("op:package-query")} title={!canDo("op:package-query") ? "غير مصرّح بهذه العملية" : undefined}>
                    {queryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !canDo("op:package-query") ? <Lock className="mr-2 h-4 w-4" /> : null}
                    استعلام
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