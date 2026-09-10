function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Convert a user-facing DD-MM-YYYY date to the YYYY-MM-DD format required by
 * DTTS SOAP services. Existing ISO dates remain unchanged.
 */
export function toDttsDate(value: string): string {
  const trimmed = value.trim();
  const displayMatch = trimmed.match(/^(\d{2})[-/.](\d{2})[-/.](\d{4})$/);
  if (displayMatch) {
    const [, day, month, year] = displayMatch;
    if (isRealDate(Number(year), Number(month), Number(day))) {
      return `${year}-${month}-${day}`;
    }
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isRealDate(Number(year), Number(month), Number(day))) {
      return trimmed;
    }
  }

  return trimmed;
}