import { useState, useRef, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, PackagePlus, Ban, Upload, FileSpreadsheet, X, CheckCircle2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import { InvoiceBar } from "@/components/invoice-bar";
import { useInvoiceGuard } from "@/lib/use-invoice-guard";
import * as XLSX from "xlsx";
import { useLanguage } from "@/lib/use-language";

function withInvoice<T extends object>(data: T, inv: string): T {
  if (!inv.trim()) return data;
  return { ...data, invoiceNumber: inv.trim() } as T;
}

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
    QUANTITY: z.coerce.number().optional()
  })).min(1, "يجب إضافة منتج واحد على الأقل")
});

interface SnInputProps {
  value: string;
  onChange: (val: string) => void;
}

function SnSerialInput({ value, onChange }: SnInputProps) {
  const [inputMode, setInputMode] = useState<"manual" | "file">("manual");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        // Try to find the SN column (case-insensitive)
        const snKey = rows.length > 0
          ? Object.keys(rows[0]).find(k => k.trim().toUpperCase() === "SN")
          : undefined;

        if (!snKey && rows.length > 0) {
          // If no SN column found, take the first column
          const firstKey = Object.keys(rows[0])[0];
          const sns = rows
            .map(r => String(r[firstKey] ?? "").trim())
            .filter(Boolean);
          onChange(sns.join("\n"));
          setUploadedFile({ name: file.name, count: sns.length });
          toast({ title: t("import.uploadedTitle"), description: `${t("import.uploadedFromColumn")} ${sns.length} ${firstKey})` });
        } else if (snKey) {
          const sns = rows
            .map(r => String(r[snKey] ?? "").trim())
            .filter(Boolean);
          onChange(sns.join("\n"));
          setUploadedFile({ name: file.name, count: sns.length });
          toast({ title: t("import.uploadedTitle"), description: `${t("import.uploadedSN")} ${sns.length}` });
        } else {
          toast({ title: t("import.emptyFileTitle"), description: t("import.emptyFileDesc"), variant: "destructive" });
        }
      } catch {
        toast({ title: t("products.uploadErrTitle"), description: t("products.uploadErrDesc"), variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [onChange, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const clearFile = () => {
    setUploadedFile(null);
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={inputMode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("manual")}
          className="gap-2"
        >
          {t("import.manualInput")}
        </Button>
        <Button
          type="button"
          variant={inputMode === "file" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("file")}
          className="gap-2"
        >
          <Upload className="h-3.5 w-3.5" />
          {t("import.uploadFileBtn")}
        </Button>
        {value && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            {value.split("\n").filter(Boolean).length} {t("import.serialCount")}
          </Badge>
        )}
      </div>

      {inputMode === "manual" ? (
        <Textarea
          dir="ltr"
          className="text-left font-mono min-h-[150px]"
          placeholder={"SN1001\nSN1002\nSN1003"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="space-y-3">
          {!uploadedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium text-sm">{t("import.dropHint")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("import.dropSupported")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("import.dropSnColumn")} <span dir="ltr" className="font-mono font-bold">SN</span>
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-4 gap-2" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                <Upload className="h-4 w-4" />
                {t("import.dropChoose")}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div>
                  <p className="font-medium text-sm">{uploadedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-bold text-green-700 dark:text-green-400">{uploadedFile.count}</span> {t("import.loadedCount")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1 text-xs">
                  <Upload className="h-3 w-3" />
                  {t("import.changeFile")}
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={clearFile} className="h-8 w-8 text-destructive hover:text-destructive">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {value && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("import.previewLabel")}</p>
              <pre dir="ltr" className="text-xs font-mono text-left max-h-[100px] overflow-y-auto">
                {value.split("\n").filter(Boolean).slice(0, 10).join("\n")}
                {value.split("\n").filter(Boolean).length > 10 && `\n... ${value.split("\n").filter(Boolean).length - 10} ${t("import.moreNumbers")}`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportSupplyPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const canDo = (op: string) => user?.role === "admin" || (user?.permissions ?? []).includes(op);
  const [response, setResponse] = useState<SoapResponse | null>(null);
  const [invoiceNum, setInvoiceNum] = useState("");
  const [invoiceAlert, setInvoiceAlert] = useState(true);
  const { guard, dialogOpen, confirmSubmit, cancelSubmit } = useInvoiceGuard(invoiceNum, invoiceAlert);

  const importMutation = useImportProducts();
  const importCancelMutation = useImportCancelProducts();
  const supplyMutation = useSupplyProducts();
  const supplyCancelMutation = useSupplyCancelProducts();

  const importForm = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: { GTIN: "", MD: "", XD: "", BN: "", serialNumbersStr: "" }
  });

  const supplyForm = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: { GTIN: "", MD: "", XD: "", BN: "", serialNumbersStr: "" }
  });

  const cancelForm = useForm<z.infer<typeof cancelSchema>>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { products: [] }
  });

  const handleImportSubmit = (values: z.infer<typeof importSchema>, isSupply: boolean) => {
    guard(() => {
      const serialNumbers = values.serialNumbersStr.split('\n').map(s => s.trim()).filter(Boolean);
      const payload = withInvoice({
        GTIN: values.GTIN,
        MD: values.MD,
        XD: values.XD,
        BN: values.BN,
        serialNumbers
      }, invoiceNum);

      const mutation = isSupply ? supplyMutation : importMutation;

      mutation.mutate({ data: payload }, {
        onSuccess: (res) => {
          setResponse(res);
          toast({ title: t("common.saved"), description: isSupply ? t("import.successSupply") : t("import.successImport") });
        },
        onError: () => {
          toast({ title: t("common.error"), description: t("import.connError"), variant: "destructive" });
        }
      });
    });
  };

  const handleCancelSubmit = (values: z.infer<typeof cancelSchema>, isSupply: boolean) => {
    guard(() => {
      const mutation = isSupply ? supplyCancelMutation : importCancelMutation;

      mutation.mutate({ data: withInvoice({ products: values.products }, invoiceNum) }, {
        onSuccess: (res) => {
          setResponse(res);
          toast({ title: t("common.saved"), description: isSupply ? t("import.successSupplyCancel") : t("import.successImportCancel") });
        },
        onError: () => {
          toast({ title: t("common.error"), description: t("import.connError"), variant: "destructive" });
        }
      });
    });
  };

  const ImportFormFields = ({ form, isSupply }: { form: typeof importForm; isSupply: boolean }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => handleImportSubmit(v, isSupply))} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="GTIN" render={({ field }) => (
            <FormItem>
              <FormLabel>GTIN</FormLabel>
              <FormControl><Input dir="ltr" className="text-left" placeholder="00000000000000" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="BN" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("import.bnLabel")}</FormLabel>
              <FormControl><Input dir="ltr" className="text-left" placeholder="Batch Number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="MD" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("import.mdLabel")}</FormLabel>
              <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="XD" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("import.xdLabel")}</FormLabel>
              <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="serialNumbersStr" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("import.snLabel")}</FormLabel>
            <FormControl>
              <SnSerialInput value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" disabled={(isSupply ? supplyMutation.isPending : importMutation.isPending) || !canDo(isSupply ? "op:supply" : "op:import")} title={!canDo(isSupply ? "op:supply" : "op:import") ? t("common.noPermission") : undefined} className="w-full sm:w-auto">
          {(isSupply ? supplyMutation.isPending : importMutation.isPending) ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : !canDo(isSupply ? "op:supply" : "op:import") ? <Lock className="me-2 h-4 w-4" /> : null}
          {isSupply ? t("import.executeSupply") : t("import.executeImport")}
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">{t("import.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("import.subtitle")}</p>
      </div>

      <InvoiceBar
        value={invoiceNum}
        onChange={setInvoiceNum}
        alertEnabled={invoiceAlert}
        onAlertChange={setInvoiceAlert}
        dialogOpen={dialogOpen}
        onDialogConfirm={confirmSubmit}
        onDialogCancel={cancelSubmit}
      />

      <Tabs defaultValue={canDo("op:import") ? "import" : canDo("op:import-cancel") ? "import-cancel" : canDo("op:supply") ? "supply" : "supply-cancel"} onValueChange={() => setInvoiceNum("")} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {canDo("op:import") && <TabsTrigger value="import">{t("import.tabImport")}</TabsTrigger>}
          {canDo("op:import-cancel") && <TabsTrigger value="import-cancel">{t("import.tabImportCancel")}</TabsTrigger>}
          {canDo("op:supply") && <TabsTrigger value="supply">{t("import.tabSupply")}</TabsTrigger>}
          {canDo("op:supply-cancel") && <TabsTrigger value="supply-cancel">{t("import.tabSupplyCancel")}</TabsTrigger>}
        </TabsList>

        {canDo("op:import") && (
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-primary" />
                <CardTitle>{t("import.importCardTitle")}</CardTitle>
              </div>
              <CardDescription>{t("import.importCardDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ImportFormFields form={importForm} isSupply={false} />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:import-cancel") && (
        <TabsContent value="import-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("import.importCancelCardTitle")}</CardTitle>
              </div>
              <CardDescription>{t("import.importCancelCardDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form onSubmit={cancelForm.handleSubmit((v) => handleCancelSubmit(v, false))} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={importCancelMutation.isPending} className="w-full sm:w-auto">
                    {importCancelMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("import.executeCancel")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:supply") && (
        <TabsContent value="supply">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-primary" />
                <CardTitle>{t("import.supplyCardTitle")}</CardTitle>
              </div>
              <CardDescription>{t("import.supplyCardDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ImportFormFields form={supplyForm} isSupply={true} />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {canDo("op:supply-cancel") && (
        <TabsContent value="supply-cancel">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                <CardTitle>{t("import.supplyCancelCardTitle")}</CardTitle>
              </div>
              <CardDescription>{t("import.supplyCancelCardDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...cancelForm}>
                <form onSubmit={cancelForm.handleSubmit((v) => handleCancelSubmit(v, true))} className="space-y-6">
                  <ProductListInput />
                  <Button type="submit" variant="destructive" disabled={supplyCancelMutation.isPending} className="w-full sm:w-auto">
                    {supplyCancelMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    {t("import.executeSupplyCancel")}
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
