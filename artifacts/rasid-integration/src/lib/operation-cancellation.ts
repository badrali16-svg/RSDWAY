import { z } from "zod";
import {
  importCancelProducts, supplyCancelProducts, dispatchCancelProducts,
  dispatchCancelBatchProducts, transferCancelProducts, transferCancelBatchProducts,
  pharmacySaleCancel, consumeCancelProducts, deactivationCancel, exportCancelProducts,
  type SoapResponse,
} from "@workspace/api-client-react";

export type CancellationReceipt = {
  id: string;
  operation: string;
  permission: string;
  notificationId?: string | null;
  request: unknown;
  cancel: () => Promise<SoapResponse>;
};

const product = z.object({
  GTIN: z.string().min(1), SN: z.string().optional(), BN: z.string().optional(),
  XD: z.string().optional(), QUANTITY: z.number().optional(),
});
const productList = z.object({
  products: z.array(product).min(1), invoiceNumber: z.string().optional(),
});
const toGlnList = productList.extend({ toGLN: z.string().min(1) });
const toGlnBatch = toGlnList.extend({
  products: z.array(product.omit({ SN: true }).extend({ QUANTITY: z.number().min(1) })).min(1),
});
const saleCancel = toGlnList.extend({ prescriptionId: z.string().min(1) });

function definition<T>(
  permission: string,
  prepare: (request: unknown) => T,
  send: (request: T) => Promise<SoapResponse>,
) {
  return (operation: string, request: unknown, notificationId?: string | null): CancellationReceipt => {
    const snapshot = structuredClone(prepare(request));
    return {
      id: crypto.randomUUID(),
      operation, permission, notificationId, request: structuredClone(snapshot),
      cancel: () => send(structuredClone(snapshot)),
    };
  };
}

function importCancellation(request: unknown): z.infer<typeof productList> {
  const input = z.object({
    GTIN: z.string().min(1), BN: z.string().optional(), XD: z.string().optional(),
    serialNumbers: z.array(z.string().min(1)).min(1), invoiceNumber: z.string().optional(),
  }).parse(request);
  return {
    products: input.serialNumbers.map((SN) => ({
      GTIN: input.GTIN, SN, BN: input.BN, XD: input.XD,
    })),
    invoiceNumber: input.invoiceNumber,
  };
}

const definitions: Record<string, ReturnType<typeof definition>> = {
  import: definition("op:import-cancel", importCancellation, importCancelProducts),
  supply: definition("op:supply-cancel", importCancellation, supplyCancelProducts),
  dispatch: definition("op:dispatch-cancel", (r) => toGlnList.parse(r), dispatchCancelProducts),
  "dispatch-batch": definition("op:dispatch-cancel-batch", (r) => toGlnBatch.parse(r), dispatchCancelBatchProducts),
  transfer: definition("op:transfer-cancel", (r) => toGlnList.parse(r), transferCancelProducts),
  "transfer-batch": definition("op:transfer-cancel-batch", (r) => toGlnBatch.parse(r), transferCancelBatchProducts),
  "pharmacy-sale": definition("op:pharmacy-sale-cancel", (r) => saleCancel.parse(r), pharmacySaleCancel),
  consume: definition("op:consume-cancel", (r) => productList.parse(r), consumeCancelProducts),
  deactivation: definition("op:deactivation-cancel", (r) => productList.parse(r), deactivationCancel),
  export: definition("op:export-cancel", (r) => productList.parse(r), exportCancelProducts),
};

export function prepareCancellation(
  operation: string, request: unknown, notificationId?: string | null,
): CancellationReceipt | null {
  return Object.hasOwn(definitions, operation)
    ? definitions[operation](operation, request, notificationId)
    : null;
}
