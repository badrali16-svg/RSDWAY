import assert from "node:assert/strict";
import test from "node:test";
import { toDttsDate } from "../src/lib/dttsDate";
import { buildProductListXml } from "../src/lib/soapProxy";

test("converts display dates to the DTTS wire format", () => {
  assert.equal(toDttsDate("31-08-2027"), "2027-08-31");
  assert.equal(toDttsDate("31/08/2027"), "2027-08-31");
  assert.equal(toDttsDate("2027-08-31"), "2027-08-31");
});

test("does not silently rewrite invalid dates", () => {
  assert.equal(toDttsDate("31-02-2027"), "31-02-2027");
  assert.equal(toDttsDate("not-a-date"), "not-a-date");
});

test("normalizes XD inside product SOAP XML", () => {
  const xml = buildProductListXml([
    { GTIN: "04030539074766", BN: "253718081", XD: "31-08-2027", QUANTITY: 1 },
  ]);

  assert.match(xml, /<XD>2027-08-31<\/XD>/);
  assert.doesNotMatch(xml, /<XD>31-08-2027<\/XD>/);
});