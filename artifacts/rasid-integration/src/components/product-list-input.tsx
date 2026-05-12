import { useRef, useCallback, useState, useEffect } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "./ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./ui/form";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Plus, Trash2, Upload, FileSpreadsheet, X, CheckCircle2, Download, ScanLine, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/use-language";
import * as XLSX from "xlsx";

// ─── GS1 Data Matrix parser ──────────────────────────────────────────────────

type ParsedGS1 = {
  gtin?: string;
  sn?: string;
  bn?: string;
  xd?: string;   // YYYY-MM-DD
  qty?: number;
};

/** Convert GS1 YYMMDD to YYYY-MM-DD. Day=00 → last day of month. */
function gs1DateToIso(raw: string): string {
  if (raw.length !== 6) return "";
  const yy = parseInt(raw.slice(0, 2), 10);
  const mm = parseInt(raw.slice(2, 4), 10);
  let dd = parseInt(raw.slice(4, 6), 10);
  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  if (dd === 0) {
    // Last day of month
    dd = new Date(year, mm, 0).getDate();
  }
  return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** Parse GS1 Data Matrix with parentheses notation e.g. (01)GTIN(17)DATE(10)BN(21)SN */
function parseParentheses(s: string): ParsedGS1 {
  const result: ParsedGS1 = {};
  const re = /\((\d{2,4})\)([^(]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const ai = m[1];
    const val = m[2].trim();
    if (ai === "01" && val.length >= 13) result.gtin = val.slice(0, 14);
    else if (ai === "17" && val.length >= 6) result.xd = gs1DateToIso(val.slice(0, 6));
    else if (ai === "10") result.bn = val || undefined;
    else if (ai === "21") result.sn = val || undefined;
    else if (ai === "30" || ai === "37") { const q = parseInt(val, 10); if (!isNaN(q)) result.qty = q; }
  }
  return result;
}

/** Parse raw GS1 sequential string (no parentheses).
 *  Uses GS (char 29 / \x1d) as variable-field separator.
 *  Fixed AIs: 01→14 chars, 17→6 chars, 310x→6 chars.
 */
function parseRaw(s: string): ParsedGS1 {
  const GS = "\x1d";
  const result: ParsedGS1 = {};
  let i = 0;

  // Skip leading FNC1 indicator ]d2 or ]C1
  s = s.replace(/^\](?:d2|C1|Q3|e0)/i, "");

  while (i < s.length) {
    const remaining = s.slice(i);
    const ai2 = remaining.slice(0, 2);
    const ai3 = remaining.slice(0, 3);
    const ai4 = remaining.slice(0, 4);

    if (ai2 === "01" && remaining.length >= 16) {
      result.gtin = remaining.slice(2, 16);
      i += 16;
    } else if (ai2 === "17" && remaining.length >= 8) {
      result.xd = gs1DateToIso(remaining.slice(2, 8));
      i += 8;
    } else if (ai2 === "10") {
      i += 2;
      const rest10 = remaining.slice(2);
      const gsPos10 = rest10.indexOf(GS);
      let end10: number;
      if (gsPos10 >= 0) {
        end10 = gsPos10;
      } else {
        // No GS separator: look for AI "21" (serial) as terminator
        const ai21pos = rest10.indexOf("21");
        end10 = ai21pos >= 0 ? ai21pos : rest10.length;
      }
      result.bn = rest10.slice(0, end10) || undefined;
      i += end10;
      if (s[i] === GS) i++;
    } else if (ai2 === "21") {
      i += 2;
      const rest21 = remaining.slice(2);
      const gsPos21 = rest21.indexOf(GS);
      result.sn = (gsPos21 >= 0 ? rest21.slice(0, gsPos21) : rest21) || undefined;
      i += gsPos21 >= 0 ? gsPos21 : rest21.length;
      if (s[i] === GS) i++;
    } else if (ai2 === "30") {
      i += 2;
      const end = remaining.indexOf(GS, 2);
      const qStr = end === -1 ? remaining.slice(2) : remaining.slice(2, end);
      const q = parseInt(qStr, 10);
      if (!isNaN(q)) result.qty = q;
      i += end === -1 ? remaining.length - 2 : end - 2;
      if (end !== -1) i++;
    } else if (ai4.startsWith("310") || ai4.startsWith("311") || ai4.startsWith("312") || ai4.startsWith("316")) {
      // Net weight / quantity fields, 6 digits
      const raw6 = remaining.slice(4, 10);
      const decimals = parseInt(ai4[3], 10);
      const q = parseInt(raw6, 10) / Math.pow(10, decimals);
      if (!isNaN(q)) result.qty = Math.round(q);
      i += 10;
    } else if (ai3 === "337" || ai3 === "339") {
      i += 10; // skip 6-digit net
    } else if (remaining[0] === GS) {
      i++; // skip stray GS
    } else {
      i++; // unknown, advance
    }
  }
  return result;
}

export function parseGS1DataMatrix(raw: string): ParsedGS1 | null {
  const s = raw.trim();
  if (!s) return null;
  const parsed = s.includes("(") ? parseParentheses(s) : parseRaw(s);
  if (!parsed.gtin && !parsed.sn && !parsed.bn) return null;
  return parsed;
}

// ─── DataMatrix scanner widget ────────────────────────────────────────────────

type ScanFlash = "ok" | "err" | null;

function DataMatrixScanner({ mode, name, append, getValues, setFormValue }: {
  mode: "sn" | "batch";
  name: string;
  append: (row: object) => void;
  getValues: (n: string) => unknown;
  setFormValue: (n: string, v: unknown) => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [flash, setFlash] = useState<ScanFlash>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const triggerFlash = (type: ScanFlash) => {
    setFlash(type);
    setTimeout(() => setFlash(null), 1200);
  };

  const handleScan = useCallback(() => {
    const raw = value.trim();
    if (!raw) return;
    const parsed = parseGS1DataMatrix(raw);
    if (!parsed || !parsed.gtin) {
      triggerFlash("err");
      toast({
        title: t("products.dmErrTitle"),
        description: t("products.dmErrDesc"),
        variant: "destructive",
      });
      setValue("");
      return;
    }

    if (mode === "batch") {
      const rows = (getValues(name) as Array<{ GTIN: string; BN?: string; XD?: string; QUANTITY?: number }>) ?? [];
      const scanGtin = parsed.gtin;
      const scanBn = parsed.bn ?? "";
      const scanXd = parsed.xd ?? "";
      const idx = rows.findIndex(
        r => r.GTIN === scanGtin && (r.BN ?? "") === scanBn && (r.XD ?? "") === scanXd
      );
      if (idx >= 0) {
        const updated = rows.map((r, i) =>
          i === idx ? { ...r, QUANTITY: (r.QUANTITY ?? 1) + 1 } : r
        );
        setFormValue(name, updated);
        toast({ title: t("products.dmQtyTitle"), description: `${t("products.dmQtyDesc")} ${updated[idx].QUANTITY}` });
      } else {
        append({ GTIN: parsed.gtin, BN: scanBn, XD: scanXd, QUANTITY: parsed.qty ?? 1 });
      }
    } else {
      // SN mode — check for duplicate SN before appending
      const snValue = parsed.sn?.trim() ?? "";
      if (snValue) {
        const rows = (getValues(name) as Array<{ SN?: string }>) ?? [];
        const isDup = rows.some(r => (r.SN?.trim() ?? "") === snValue);
        if (isDup) {
          triggerFlash("err");
          toast({
            title: t("import.dmDupTitle"),
            description: `${t("import.dmDupDesc")} ${snValue}`,
            variant: "destructive",
          });
          setValue("");
          return;
        }
      }
      append({
        GTIN: parsed.gtin,
        SN: snValue,
        BN: parsed.bn ?? "",
        XD: parsed.xd ?? "",
        QUANTITY: parsed.qty ?? undefined,
      });
    }

    triggerFlash("ok");
    setValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [value, mode, name, append, getValues, setFormValue, toast, t]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  };

  const borderClass =
    flash === "ok"
      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
      : flash === "err"
      ? "border-destructive bg-destructive/5"
      : "border-border";

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-sm font-medium">
        <ScanLine className="h-4 w-4 text-primary" />
        {t("products.dmLabel")}
      </Label>
      <div className="relative flex gap-2">
        <div className={`flex-1 relative flex items-center rounded-md border transition-colors ${borderClass}`}>
          <Input
            ref={inputRef}
            dir="ltr"
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-mono text-sm"
            placeholder={t("products.dmPlaceholder")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {flash === "ok" && (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 me-3 animate-in fade-in" />
          )}
          {flash === "err" && (
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 me-3 animate-in fade-in" />
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={!value.trim()}
          onClick={handleScan}
        >
          {t("products.dmAdd")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("products.dmHint")}</p>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

  const raw = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

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

// ─── ProductListInput ─────────────────────────────────────────────────────────

export function ProductListInput({ name = "products", mode = "sn" }: { name?: string; mode?: "sn" | "batch" }) {
  const { control, setValue, getValues } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; count: number } | null>(null);
  const isBatch = mode === "batch";

  useEffect(() => {
    if (fields.length === 0) {
      isBatch
        ? append({ GTIN: "", BN: undefined, XD: undefined, QUANTITY: 1 })
        : append({ GTIN: "", SN: undefined, BN: undefined, XD: undefined, QUANTITY: undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadTemplate = () => {
    const headers = isBatch
      ? [["GTIN", "BN", "XD", "QUANTITY"]]
      : [["GTIN", "SN", "BN", "XD"]];
    const exampleRow = isBatch
      ? [["74637840842700", "BATCH001", "2026-12-31", 100]]
      : [["74637840842700", "SN0000001", "BATCH001", "2026-12-31"]];
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...exampleRow]);
    ws["!cols"] = headers[0].map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    const filename = isBatch ? "template_batch.xlsx" : "template_sn.xlsx";
    XLSX.writeFile(wb, filename);
  };

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const products = parseProductsFromSheet(data);
        if (products.length === 0) {
          toast({ title: t("products.noDataTitle"), description: t("products.noDataDesc"), variant: "destructive" });
          return;
        }
        setValue(name, products);
        setUploadedFile({ name: file.name, count: products.length });
        toast({ title: t("products.uploadedTitle"), description: `${products.length} ${t("products.uploadedDesc")}` });
      } catch {
        toast({ title: t("products.uploadErrTitle"), description: t("products.uploadErrDesc"), variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [name, setValue, toast, t]);

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
      {/* ── Data Matrix Scanner ── */}
      <DataMatrixScanner mode={mode} name={name} append={append} getValues={getValues} setFormValue={setValue} />

      {/* ── Header row ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className="text-base font-semibold">{t("products.listLabel")}</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {fields.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              {fields.length} {t("products.count")}
            </Badge>
          )}
          <Button
            type="button" variant="ghost" size="sm"
            className="gap-2 text-muted-foreground hover:text-primary"
            onClick={downloadTemplate}
            title={isBatch ? `${t("products.downloadTemplate")} (Batch)` : `${t("products.downloadTemplate")} (SN)`}
          >
            <Download className="h-3.5 w-3.5" />
            {t("products.downloadTemplate")}
          </Button>

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
              {t("products.uploadFile")}
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button" variant="outline" size="sm"
            onClick={() => isBatch
              ? append({ GTIN: "", BN: undefined, XD: undefined, QUANTITY: 1 })
              : append({ GTIN: "", SN: undefined, BN: undefined, XD: undefined, QUANTITY: undefined })}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("products.addManual")}
          </Button>
        </div>
      </div>

      {/* Upload hint */}
      {!uploadedFile && fields.length === 0 && (
        <div className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
          <FileSpreadsheet className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>{t("products.uploadHint")}</p>
          {isBatch ? (
            <p dir="ltr" className="font-mono font-bold mt-1 tracking-wider">GTIN ; BN ; XD ; QUANTITY</p>
          ) : (
            <>
              <p dir="ltr" className="font-mono font-bold mt-1 tracking-wider">GTIN ; SN ; BN ; XD</p>
              <p dir="ltr" className="font-mono font-bold tracking-wider text-muted-foreground">GTIN ; QUANTITY ; BN ; XD</p>
            </>
          )}
          <p className="mt-1">{t("products.separatorHint")}</p>
          <p className="mt-1">{t("products.manualHint")}</p>
        </div>
      )}

      {/* Products list */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="relative p-4 border rounded-md bg-card space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="font-medium text-sm text-muted-foreground">{t("products.item")} {index + 1}</span>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className={`grid grid-cols-1 gap-4 ${isBatch ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-5"}`}>
                <FormField control={control} name={`${name}.${index}.GTIN`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>GTIN</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" placeholder="Global Trade Item Number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {!isBatch && (
                  <FormField control={control} name={`${name}.${index}.SN`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>SN</FormLabel>
                      <FormControl><Input dir="ltr" className="text-left" placeholder="Serial Number" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || undefined)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={control} name={`${name}.${index}.BN`} render={({ field }) => (
                  <FormItem>
                    <FormLabel>BN {isBatch && <span className="text-muted-foreground text-xs">{t("products.bnRequired")}</span>}</FormLabel>
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
                    <FormLabel>
                      {t("products.quantityLabel")}{isBatch && <span className="text-destructive ms-1">*</span>}
                    </FormLabel>
                    <FormControl>
                      <Input
                        dir="ltr" className={`text-left font-semibold${isBatch ? " border-primary/50" : ""}`}
                        type="number" placeholder={isBatch ? "1" : "0"} min="1"
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
