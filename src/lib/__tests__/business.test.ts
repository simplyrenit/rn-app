import { describe, expect, it } from "@jest/globals";
import { billToRow, gstinErrorText, gstInvoiceLine, shortGstin, type BuyerGstin } from "@/lib/business";

const saved: BuyerGstin = {
  gstin: "27ABCPE0000F1Z5",
  legal_name: "FAKE TRADERS PRIVATE LIMITED",
  trade_name: "Fake Traders",
  address: "1 Test Street, Testville, Maharashtra, 400001",
  pincode: "400001",
  state_code: "27",
  state: "Maharashtra",
  checked_at: "2026-11-01T00:00:00Z",
};

const failure = (code: string | null, details: Record<string, unknown> | null = null, status = 422) => ({
  status,
  code,
  message: "server words",
  details,
});

describe("billToRow", () => {
  it("is hidden for anyone not billing as a business", () => {
    expect(billToRow(false, saved, false)).toEqual({ kind: "hidden" });
  });
  it("is never 'none saved' while the GSTIN is unknown", () => {
    expect(billToRow(true, undefined, false)).toEqual({ kind: "loading" });
    expect(billToRow(true, undefined, false, true)).toEqual({ kind: "failed" });
  });
  it("asks for a GSTIN when none is saved", () => {
    expect(billToRow(true, null, false)).toEqual({ kind: "add" });
  });
  it("is a switch, on unless turned off", () => {
    expect(billToRow(true, saved, false)).toEqual({ kind: "switch", gstin: saved, on: true });
    expect(billToRow(true, saved, true)).toEqual({ kind: "switch", gstin: saved, on: false });
  });
});

describe("gstinErrorText", () => {
  it("names a cancelled or suspended GSTIN", () => {
    expect(gstinErrorText(failure("gstin_inactive", { status: "cancelled" }))).toMatch(/cancelled/);
    expect(gstinErrorText(failure("gstin_inactive", { status: "other" }))).toMatch(/isn't active/);
  });
  it("has its own line for an unknown GSTIN and no connection", () => {
    expect(gstinErrorText(failure("gstin_not_found"))).toMatch(/couldn't find/);
    expect(gstinErrorText(null)).toMatch(/No connection/);
  });
  it("falls back to the server's sentence", () => {
    expect(gstinErrorText(failure("something_new"))).toBe("server words");
  });
});

it("shortens a GSTIN without its PAN", () => {
  expect(shortGstin("27ABCPE0000F1Z5")).toBe("27ABCPE…1Z5");
});

it("says what the shop's GST registration means, or nothing", () => {
  expect(gstInvoiceLine(true)).toMatch(/issues GST invoices/);
  expect(gstInvoiceLine(false)).toMatch(/isn't GST-registered/);
  expect(gstInvoiceLine(null)).toBeNull();
  expect(gstInvoiceLine(undefined)).toBeNull();
});
