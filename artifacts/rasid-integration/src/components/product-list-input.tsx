import { useRef, useCallback, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "./ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./ui/form";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Plus, Trash2, Upload, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

type ProductRow = {
  GTIN: string;
  SN?: string;
  BN?: string;
  XD?: string;
  QUANTITY?: number;
};

function normalizeKey(k: string) {
  return k.trim().toUpperCase();
}

function findCol(row: Record<string, unknown>, names: string[]): string {
  for (const name of names) {
    const key = Object.keys(row).find(k => normalizeKey(k) === name);
    if (key !== undefined) return String(row[key] ?? "").trim();
  }
  return "";
}

function parseProductsFromSheet(data: ArrayBuffer): ProductRow[] {
  const workbook = XLSX.read(data, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // Use raw: false so XLSX formats dates as strings; also handle semicolon-delimited CSV
  const raw = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Auto-detect delimiter from header line
  const headerLine = lines[0];
  const delimiter = headerLine.includes(";") ? ";" : headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(delimiter).map(h => h.trim());

  const rows: ProductRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] ?? ""; });

    const GTIN = findCol(obj, ["GTIN", "BARCODE"]);
    if (!GTIN) continue;

    const XD_raw = findCol(obj, ["XD", "EXPIRY", "EXPIRY DATE", "EXP DATE"]);
    // Convert DD/MM/YYYY → YYYY-MM-DD if needed
    let XD = XD_raw;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(XD_raw)) {
      const [d, m, y] = XD_raw.split("/");
      XD = `${y}-${m}-${d}`;
    }

    const QUANTITY_raw = findCol(obj, ["QUANTITY", "QTY", "AMOUNT"]);
    const QUANTITY = QUANTITY_raw ? Number(QUANTITY_raw) || undefined : undefined;

    rows.push({
      GTIN,
      SN: findCol(obj, ["SN", "SERIAL", "SERIAL NUMBER"]) || undefined,
      BN: findCol(obj, ["BN", "BATCH", "BATCH NUMBER", "LOT"]) || undefined,
      XD: XD || undefined,
      QUANTITY,
    });
  }
  return rows;
}

export function ProductListInput({ name = "products" }: { name?: string }) {
  const { control, setValue, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const products = parseProductsFromSheet(data);
        if (products.length === 0) {
          toast({ title: "لم يتم العثور على بيانات", description: "تأكد من أن الملف يحتوي على عمود GTIN على الأقل", variant: "destructive" });
          return;
        }
        setValue(name, products);
        setUploadedFile({ name: file.name, count: products.length });
        toast({ title: "تم رفع الملف", description: `تم استيراد ${products.length} منتج من الملف` });
      } catch {
        toast({ title: "خطأ في قراءة الملف", description: "تأكد من أن الملف بصيغة Excel أو CSV صحيحة", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [name, setValue, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setValue(name, []);
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="text-base font-semibold">قائمة المنتجات (Products)</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {fields.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {fields.length} منتج
            </Badge>
          )}
          {/* Upload button */}
          {uploadedFile ? (
            <div className="flex items-center gap-2 text-sm border rounded-md px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
              <FileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-xs font-medium truncate max-w-[140px]">{uploadedFile.name}</span>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={clearUpload}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              type="button" variant="outline" size="sm"
              className="gap-2"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={isDragging ? { borderColor: "hsl(var(--primary))", background: "hsl(var(--primary)/0.05)" } : {}}
            >
              <Upload className="h-3.5 w-3.5" />
              رفع ملف Excel / CSV
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          {/* Manual add button */}
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => append({ GTIN: "", SN: undefined, BN: undefined, XD: undefined, QUANTITY: undefined })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة يدوي
          </Button>
        </div>
      </div>

      {/* Upload hint */}
      {!uploadedFile && fields.length === 0 && (
        <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          <FileSpreadsheet className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>يمكنك رفع ملف Excel أو CSV يحتوي على الأعمدة:</p>
          <p dir="ltr" className="font-mono font-bold mt-1 tracking-wider">GTIN ; SN ; BN ; XD</p>
          <p dir="ltr" className="font-mono font-bold tracking-wider text-muted-foreground">GTIN ; QUANTITY ; BN ; XD</p>
          <p className="mt-1">الفاصل يمكن أن يكون <span className="font-mono">(;)</span> أو <span className="font-mono">(,)</span> — التاريخ بصيغة DD/MM/YYYY أو YYYY-MM-DD</p>
          <p className="mt-1">أو إضافة المنتجات يدوياً بالضغط على "إضافة يدوي"</p>
        </div>
      )}

      {/* Products list */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="relative p-4 border rounded-md bg-card space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-medium text-sm text-muted-foreground">المنتج {index + 1}</span>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <FormField control={control} name={`${name}.${index}.GTIN`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>GTIN</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" placeholder="Global Trade Item Number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`${name}.${index}.SN`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>SN</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" placeholder="Serial Number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`${name}.${index}.BN`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>BN</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" placeholder="Batch Number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`${name}.${index}.XD`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>XD</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" type="date" placeholder="YYYY-MM-DD" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`${name}.${index}.QUANTITY`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكمية (QUANTITY)</FormLabel>
                    <FormControl>
                      <Input
                        dir="ltr" className="text-left font-semibold" type="number" placeholder="0" min="1"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value !== "" ? Number(e.target.value) : undefined)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
