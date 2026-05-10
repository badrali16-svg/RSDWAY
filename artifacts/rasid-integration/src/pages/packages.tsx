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
import { Loader2, Upload, Download, Search, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { GlnInput } from "@/components/gln-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/lib/language-context";

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
  const { t } = useLanguage();
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
        toast({ title: t("common.saved"), description: t("packages.uploadBtn") });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleDownload = (values: z.infer<typeof downloadSchema>) => {
    downloadMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: t("common.saved"), description: t("packages.downloadBtn") });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  const handleQuery = (values: z.infer<typeof querySchema>) => {
    queryMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        setResponse(res);
        toast({ title: t("common.saved"), description: t("packages.queryBtn") });
      },
      onError: () => toast({ title: t("common.error"), description: "حدث خطأ أثناء الاتصال بالنظام", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("packages.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("packages.subtitle")}</p>
      </div>

      <Tabs defaultValue={canDo("op:package-upload") ? "upload" : canDo("op:package-download") ? "download" : "query"} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:package-upload") && <TabsTrigger value="upload">{t("packages.tabUpload")}</TabsTrigger>}
          {canDo("op:package-download") && <TabsTrigger value="download">{t("packages.tabDownload")}</TabsTrigger>}
          {canDo("op:package-query") && <TabsTrigger value="query">{t("packages.tabQuery")}</TabsTrigger>}
        </TabsList>

        {canDo("op:package-upload") && (
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle>{t("packages.cardUploadTitle")}</CardTitle>
              </div>
              <CardDescription>{t("packages.cardUploadDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-6">
                  <FormField control={uploadForm.control} name="toGLN" render={({ field }) => (
                    <FormItem>
                      <GlnInput value={field.value} onChange={field.onChange} label={t("packages.toGLN")} />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={uploadForm.control} name="fileBase64" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packages.fileBase64Label")}</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left font-mono text-xs" placeholder="JVBERi0xLjQKJcOkw7zDtsO..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={uploadMutation.isPending || !canDo("op:package-upload")} title={!canDo("op:package-upload") ? t("common.noPermission") : undefined}>
                    {uploadMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:package-upload") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("packages.uploadBtn")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:package-download") && (
        <TabsContent value="download">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                <CardTitle>{t("packages.cardDownloadTitle")}</CardTitle>
              </div>
              <CardDescription>{t("packages.cardDownloadDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...downloadForm}>
                <form onSubmit={downloadForm.handleSubmit(handleDownload)} className="space-y-6">
                  <FormField control={downloadForm.control} name="transferId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("packages.transferIdLabel")}</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left max-w-sm" placeholder="Transfer ID" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={downloadMutation.isPending || !canDo("op:package-download")} title={!canDo("op:package-download") ? t("common.noPermission") : undefined}>
                    {downloadMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:package-download") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("packages.downloadBtn")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:package-query") && (
        <TabsContent value="query">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <CardTitle>{t("packages.cardQueryTitle")}</CardTitle>
              </div>
              <CardDescription>{t("packages.cardQueryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...queryForm}>
                <form onSubmit={queryForm.handleSubmit(handleQuery)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={queryForm.control} name="fromGLN" render={({ field }) => (
                      <FormItem>
                        <GlnInput value={field.value ?? ""} onChange={field.onChange} label={t("packages.fromGLN")} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={queryForm.control} name="toGLN" render={({ field }) => (
                      <FormItem>
                        <GlnInput value={field.value ?? ""} onChange={field.onChange} label={t("packages.toGLNOpt")} />
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={queryForm.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("packages.startDate")}</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={queryForm.control} name="endDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("packages.endDate")}</FormLabel>
                        <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={queryForm.control} name="getAll" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} className="me-2" />
                      </FormControl>
                      <div className="space-y-1 leading-none me-2">
                        <FormLabel>{t("packages.getAll")}</FormLabel>
                        <FormDescription>{t("packages.getAllDesc")}</FormDescription>
                      </div>
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={queryMutation.isPending || !canDo("op:package-query")} title={!canDo("op:package-query") ? t("common.noPermission") : undefined}>
                    {queryMutation.isPending ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo("op:package-query") ? <Lock className="me-2 h-4 w-4" /> : null}
                    {t("packages.queryBtn")}
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
