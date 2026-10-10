import { describe, expect, it } from "@jest/globals";
import { e164, isCode, isUnlocked, resendLabel, unlockErrorMessage } from "../unlock";

const NOW = new Date("2026-10-12T05:00:00Z");

describe("isUnlocked", () => {
  it("is true until the instant it runs out", () => {
    expect(isUnlocked({ unlocked: true, unlocked_until: "2026-10-12T05:00:01Z" }, NOW)).toBe(true);
    expect(isUnlocked({ unlocked: true, unlocked_until: "2026-10-12T05:00:00Z" }, NOW)).toBe(false);
  });

  it("is false when locked, or when the answer has no end", () => {
    expect(isUnlocked({ unlocked: false, unlocked_until: null }, NOW)).toBe(false);
    expect(isUnlocked({ unlocked: true, unlocked_until: null }, NOW)).toBe(false);
    expect(isUnlocked({ unlocked: true, unlocked_until: "not a date" }, NOW)).toBe(false);
  });

  it("does not trust a stale `unlocked: true`", () => {
    expect(isUnlocked({ unlocked: true, unlocked_until: "2026-10-12T04:00:00Z" }, NOW)).toBe(false);
  });
});

describe("e164", () => {
  it("keeps a number that has its country code", () => {
    expect(e164("+919876543210")).toBe("+919876543210");
  });

  it("drops the dash the profile sheet saves", () => {
    expect(e164("+91-9876543210")).toBe("+919876543210");
    expect(e164(" +91 98765 43210 ")).toBe("+919876543210");
  });

  it("reads ten digits as an Indian number", () => {
    expect(e164("9876543210")).toBe("+919876543210");
  });

  it("reads 91 or a leading 0 without a plus", () => {
    expect(e164("919876543210")).toBe("+919876543210");
    expect(e164("09876543210")).toBe("+919876543210");
  });

  it("gives null for something that cannot be a number", () => {
    expect(e164("")).toBeNull();
    expect(e164(null)).toBeNull();
    expect(e164("12345")).toBeNull();
    // Eleven digits with no plus and no leading 0: not guessed at.
    expect(e164("12345678901")).toBeNull();
  });

  it("keeps another country's number when it has the plus", () => {
    expect(e164("+44 7911 123456")).toBe("+447911123456");
  });
});

describe("isCode", () => {
  it("is six digits", () => {
    expect(isCode("123456")).toBe(true);
    expect(isCode("12345")).toBe(false);
    expect(isCode("1234567")).toBe(false);
    expect(isCode("12345a")).toBe(false);
  });
});

describe("unlockErrorMessage", () => {
  it("has a line for each code the server names", () => {
    const lines = ["code_invalid", "wrong_phone", "phone_required", "unlock_unavailable", null].map(unlockErrorMessage);
    expect(new Set(lines).size).toBe(5);
  });
});

describe("resendLabel", () => {
  it("counts down as the frame draws it", () => {
    expect(resendLabel(24)).toBe("Send again in 0:24");
    expect(resendLabel(30)).toBe("Send again in 0:30");
    expect(resendLabel(5)).toBe("Send again in 0:05");
    expect(resendLabel(0)).toBe("Send again in 0:00");
    expect(resendLabel(65)).toBe("Send again in 1:05");
    expect(resendLabel(-3)).toBe("Send again in 0:00");
  });
});
