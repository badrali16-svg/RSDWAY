import * as XLSX from "xlsx";
import { normalizeDateValue } from "./date-format";

type ExportProduct = {
  GTIN?: string;
  SN?: string;
  BN?: string;
  XD?: string;
  QUANTITY?: number;
};

type ExportOptions = {
  operation: string;
  products: ExportProduct[];
  mode: "sn" | "batch";
  toGLN?: string;
};

export function createReturnConsumeWorkbook({
  operation,
  products,
  mode,
  toGLN,
}: ExportOptions): XLSX.WorkBook {
  const rows = (products.length ? products : [{}]).map((product) => ({
    ...(toGLN !== undefined ? { "GLN المستلم": toGLN } : {}),
    GTIN: product.GTIN ?? "",
    ...(mode === "sn" ? { SN: product.SN ?? "" } : {}),
    BN: product.BN ?? "",
    XD: normalizeDateValue(product.XD) || product.XD || "",
    QUANTITY: product.QUANTITY ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, operation.slice(0, 31));
  return workbook;
}

export function downloadReturnConsumeData(options: ExportOptions): void {
  XLSX.writeFile(
    createReturnConsumeWorkbook(options),
    `${options.operation}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}
