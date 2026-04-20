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
import { Loader2, PackagePlus, Ban, Upload, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SoapResponseViewer } from "@/components/soap-response-viewer";
import { ProductListInput } from "@/components/product-list-input";
import * as XLSX from "xlsx";

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
          toast({ title: "تم رفع الملف", description: `تم استيراد ${sns.length} رقم تسلسلي (العمود: ${firstKey})` });
        } else if (snKey) {
          const sns = rows
            .map(r => String(r[snKey] ?? "").trim())
            .filter(Boolean);
          onChange(sns.join("\n"));
          setUploadedFile({ name: file.name, count: sns.length });
          toast({ title: "تم رفع الملف", description: `تم استيراد ${sns.length} رقم تسلسلي` });
        } else {
          toast({ title: "الملف فارغ", description: "لا توجد بيانات في الملف", variant: "destructive" });
        }
      } catch {
        toast({ title: "خطأ في قراءة الملف", description: "تأكد من أن الملف بصيغة Excel أو CSV صحيحة", variant: "destructive" });
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
          إدخال يدوي
        </Button>
        <Button
          type="button"
          variant={inputMode === "file" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("file")}
          className="gap-2"
        >
          <Upload className="h-3.5 w-3.5" />
          رفع ملف Excel / CSV
        </Button>
        {value && (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            {value.split("\n").filter(Boolean).length} رقم
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
              <p className="font-medium text-sm">اسحب الملف هنا أو اضغط للاختيار</p>
              <p className="text-xs text-muted-foreground mt-1">
                يدعم ملفات Excel (.xlsx, .xls) وCSV (.csv)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                يجب أن يحتوي الملف على عمود باسم <span dir="ltr" className="font-mono font-bold">SN</span>
              </p>
              <Button type="button" variant="outline" size="sm" className="mt-4 gap-2" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                <Upload className="h-4 w-4" />
                اختر ملفاً
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
                    تم تحميل <span className="font-bold text-green-700 dark:text-green-400">{uploadedFile.count}</span> رقم تسلسلي
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1 text-xs">
                  <Upload className="h-3 w-3" />
                  تغيير
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
              <p className="text-xs font-medium text-muted-foreground mb-2">معاينة الأرقام المستوردة:</p>
              <pre dir="ltr" className="text-xs font-mono text-left max-h-[100px] overflow-y-auto">
                {value.split("\n").filter(Boolean).slice(0, 10).join("\n")}
                {value.split("\n").filter(Boolean).length > 10 && `\n... و${value.split("\n").filter(Boolean).length - 10} أرقام أخرى`}
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
  const [response, setResponse] = useState<SoapResponse | null>(null);

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
      onError: () => {
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
              <FormLabel>رقم التشغيلة (BN)</FormLabel>
              <FormControl><Input dir="ltr" className="text-left" placeholder="Batch Number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="MD" render={({ field }) => (
            <FormItem>
              <FormLabel>تاريخ التصنيع (MD)</FormLabel>
              <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="XD" render={({ field }) => (
            <FormItem>
              <FormLabel>تاريخ الانتهاء (XD)</FormLabel>
              <FormControl><Input dir="ltr" className="text-left" type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="serialNumbersStr" render={({ field }) => (
          <FormItem>
            <FormLabel>الأرقام التسلسلية (SNs)</FormLabel>
            <FormControl>
              <SnSerialInput value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" disabled={isSupply ? supplyMutation.isPending : importMutation.isPending} className="w-full sm:w-auto">
          {(isSupply ? supplyMutation.isPending : importMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSupply ? "تنفيذ عملية التصنيع" : "تنفيذ عملية الاستيراد"}
        </Button>
      </form>
    </Form>
  );

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
              <ImportFormFields form={importForm} isSupply={false} />
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
              <ImportFormFields form={supplyForm} isSupply={true} />
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
