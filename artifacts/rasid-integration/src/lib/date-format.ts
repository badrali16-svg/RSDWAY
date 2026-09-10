import { format, isValid, parse } from "date-fns";

const DISPLAY_FORMAT = "dd-MM-yyyy";
const ISO_FORMAT = "yyyy-MM-dd";

function parseWithFormat(value: string, dateFormat: string): Date | undefined {
  const parsed = parse(value, dateFormat, new Date());
  if (!isValid(parsed) || format(parsed, dateFormat) !== value) return undefined;
  return parsed;
}

export function parseDateValue(value?: string | null): Date | undefined {
  const cleaned = value?.trim().replace(/[/.]/g, "-");
  if (!cleaned) return undefined;

  if (/^\d{2}-\d{2}-\d{4}$/.test(cleaned)) {
    return parseWithFormat(cleaned, DISPLAY_FORMAT);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return parseWithFormat(cleaned, ISO_FORMAT);
  }
  return undefined;
}

export function formatDateValue(date: Date): string {
  return format(date, DISPLAY_FORMAT);
}

export function normalizeDateValue(value?: string | null): string {
  const parsed = parseDateValue(value);
  return parsed ? formatDateValue(parsed) : "";
}

export function maskDateValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}