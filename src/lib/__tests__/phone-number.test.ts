import { describe, expect, it } from "@jest/globals";
import { formatPhone, INDIA, toE164 } from "../phone-number";

const UK = { cca2: "GB", callingCode: "44" };

describe("toE164", () => {
  it("takes an Indian mobile typed or pasted the usual ways", () => {
    for (const typed of ["9812345678", "98123 45678", "98123-45678", "09812345678", "+91 98123 45678", "919812345678"]) {
      expect(toE164(INDIA, typed)).toBe("+919812345678");
    }
  });

  it("refuses an Indian number without its 10 digits", () => {
    expect(toE164(INDIA, "981234567")).toBeNull();
    expect(toE164(INDIA, "+91 981234567")).toBeNull();
    expect(toE164(INDIA, "")).toBeNull();
  });

  it("never puts the country code on twice", () => {
    expect(toE164(UK, "+44 7700 900123")).toBe("+447700900123");
    expect(toE164(UK, "07700 900123")).toBe("+447700900123");
  });

  it("keeps a full number with another country's code whatever is picked", () => {
    expect(toE164(INDIA, "+44 7700 900123")).toBe("+447700900123");
  });
});

describe("formatPhone", () => {
  it("groups an Indian mobile 5 + 5 and leaves others as they are", () => {
    expect(formatPhone("+919812345678")).toBe("+91 98123 45678");
    expect(formatPhone("+447700900123")).toBe("+447700900123");
  });
});
