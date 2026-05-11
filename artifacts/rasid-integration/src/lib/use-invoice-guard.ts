import { useState } from "react";

export function useInvoiceGuard(invoiceNum: string, alertEnabled: boolean) {
  const [pending, setPending] = useState<{ fn: () => void } | null>(null);

  const guard = (fn: () => void) => {
    if (alertEnabled && !invoiceNum.trim()) {
      setPending({ fn });
    } else {
      fn();
    }
  };

  return {
    guard,
    dialogOpen: !!pending,
    confirmSubmit: () => { pending?.fn(); setPending(null); },
    cancelSubmit: () => setPending(null),
  };
}
