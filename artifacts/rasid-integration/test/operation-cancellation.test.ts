import assert from "node:assert/strict";
import { after, test } from "node:test";
import { prepareCancellation } from "../src/lib/operation-cancellation";
import { isCompleteOperationSuccess } from "../src/lib/operation-success";

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("Live requests are forbidden in cancellation tests"); };
after(() => { globalThis.fetch = originalFetch; });

const products = [
  { GTIN: "04030539074766", SN: "SERIAL-001", BN: "BATCH-001", XD: "31-08-2027", QUANTITY: 2 },
  { GTIN: "04030539074766", SN: "SERIAL-002", BN: "BATCH-001", XD: "31-08-2027", QUANTITY: 1 },
];

const cases = [
  ["import", "import-cancel"], ["supply", "supply-cancel"],
  ["dispatch", "dispatch-cancel"], ["dispatch-batch", "dispatch-cancel-batch"],
  ["transfer", "transfer-cancel"], ["transfer-batch", "transfer-cancel-batch"],
  ["pharmacy-sale", "pharmacy-sale-cancel"], ["consume", "consume-cancel"],
  ["deactivation", "deactivation-cancel"], ["export", "export-cancel"],
] as const;

for (const [operation, cancellation] of cases) {
  test(`${operation}: uses the matching cancellation service and original data`, async (t) => {
    const input = {
      products: structuredClone(products),
      toGLN: "0012345678901", prescriptionId: "RX-001", invoiceNumber: "INV-001",
      GTIN: products[0].GTIN, BN: products[0].BN, XD: products[0].XD, MD: "01-08-2025",
      serialNumbers: ["SERIAL-001", "SERIAL-002"],
      doctorId: "DO-NOT-COPY", patientNationalId: "DO-NOT-COPY",
      countryCode: "SA", DR: "1", explanation: "DO-NOT-COPY",
    };
    const receipt = prepareCancellation(operation, input, "TEST-123");
    assert.ok(receipt);
    assert.equal(receipt.permission, `op:${cancellation}`);
    assert.equal(receipt.notificationId, "TEST-123");

    input.products[0].SN = "EDITED-AFTER-SUCCESS";
    input.serialNumbers[0] = "EDITED-AFTER-SUCCESS";
    input.toGLN = "EDITED-AFTER-SUCCESS";
    input.prescriptionId = "EDITED-AFTER-SUCCESS";
    let calls = 0;
    t.mock.method(globalThis, "fetch", async (url, options) => {
      calls++;
      assert.equal(url, `/api/rasid/${cancellation}`);
      assert.equal(options?.method, "POST");
      const sent = JSON.parse(options?.body as string);
      assert.equal(sent.invoiceNumber, "INV-001");
      assert.equal(sent.products.length, 2);
      assert.equal(sent.products[0].GTIN, products[0].GTIN);
      assert.equal(sent.products[0].BN, products[0].BN);
      assert.equal(sent.products[0].XD, products[0].XD);
      if (operation.endsWith("-batch")) {
        assert.equal(sent.products[0].QUANTITY, 2);
        assert.equal(sent.products[1].QUANTITY, 1);
        assert.ok(!("SN" in sent.products[0]));
      } else {
        assert.equal(sent.products[0].SN, "SERIAL-001");
        assert.equal(sent.products[1].SN, "SERIAL-002");
      }
      if (["dispatch", "dispatch-batch", "transfer", "transfer-batch", "pharmacy-sale"].includes(operation)) {
        assert.equal(sent.toGLN, "0012345678901");
      } else {
        assert.ok(!("toGLN" in sent));
      }
      if (operation === "pharmacy-sale") assert.equal(sent.prescriptionId, "RX-001");
      else assert.ok(!("prescriptionId" in sent));
      for (const field of ["MD", "serialNumbers", "doctorId", "patientNationalId", "DR", "countryCode", "explanation"]) {
        assert.ok(!(field in sent));
      }
      return new Response(JSON.stringify({ success: true, notificationId: "CANCEL-123", rawXml: "<RC>00000</RC>" }), {
        headers: { "content-type": "application/json" },
      });
    });
    assert.equal((await receipt.cancel()).success, true);
    assert.equal(calls, 1);
  });
}

test("unsupported operations and cancellations never get an artificial inverse", () => {
  for (const operation of [
    "accept", "accept-batch", "accept-dispatch", "return", "return-batch",
    "package-upload", "package-query", "check-status", ...cases.map(([, cancel]) => cancel),
  ]) {
    assert.equal(prepareCancellation(operation, { products }), null);
  }
});

test("invalid cancellation data is rejected before sending", () => {
  assert.throws(() => prepareCancellation("dispatch", { products }));
  assert.throws(() => prepareCancellation("transfer-batch", { products: [{ GTIN: "1" }], toGLN: "123" }));
  assert.throws(() => prepareCancellation("pharmacy-sale", { products, toGLN: "123" }));
  assert.throws(() => prepareCancellation("import", { GTIN: "1", serialNumbers: [] }));
});

test("each successful submission gets a new cancellation state", () => {
  const first = prepareCancellation("consume", { products }, "TEST-123");
  const second = prepareCancellation("consume", { products }, "TEST-123");
  assert.ok(first);
  assert.ok(second);
  assert.notEqual(first.id, second.id);
});

test("a connection failure never automatically repeats the cancellation", async (t) => {
  const receipt = prepareCancellation("consume", { products });
  assert.ok(receipt);
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("Simulated connection failure");
  });
  await assert.rejects(receipt.cancel(), /Simulated connection failure/);
  assert.equal(calls, 1);
});

test("only complete success can enable quick cancellation", () => {
  assert.equal(isCompleteOperationSuccess({ success: true, notificationId: "123", rawXml: "<RC>00000</RC>" }), true);
  for (const response of [
    { success: false, rawXml: "<RC>00000</RC>" },
    { success: true, notificationId: "-1", rawXml: "<RC>00000</RC>" },
    { success: true, rawXml: "<RC>21017</RC>" },
    { success: true, rawXml: "<RC>00000</RC><UNSUCCESSFULUNITCOUNT>1</UNSUCCESSFULUNITCOUNT>" },
    { success: true, rawXml: "<RC>00000</RC><PRODUCT><RC>11035</RC></PRODUCT>" },
  ]) assert.equal(isCompleteOperationSuccess(response), false);
});
