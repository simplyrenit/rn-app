import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_DEPOSIT_RULE,
  computeDepositDefault,
  parseDepositRule,
  parseRate,
} from "../deposit";

describe("computeDepositDefault", () => {
  it("is k × rate when that is above the floor and already on a step", () => {
    // §5.4: rate 610 → 5 × 610 = 3050 → Rs 3,050.
    expect(computeDepositDefault(610)).toBe(3050);
  });

  it("applies the floor", () => {
    // §5.4: rate 80 → 400 → floor → Rs 500.
    expect(computeDepositDefault(80)).toBe(500);
  });

  it("rounds up to the next round_to step", () => {
    expect(computeDepositDefault(611)).toBe(3100); // 3055 → 3100
    expect(computeDepositDefault(101)).toBe(550); // 505 → 550
    expect(computeDepositDefault(100.5)).toBe(550); // 502.5 → 550
  });

  it("does not bump a value that is on a step by float noise", () => {
    expect(computeDepositDefault(0.1 * 3 * 1000, DEFAULT_DEPOSIT_RULE)).toBe(1500);
  });

  it("uses the rule it is given", () => {
    expect(computeDepositDefault(333, { multiplier: 3, floor: 100, round_to: 100 })).toBe(1000);
    expect(computeDepositDefault(10, { multiplier: 3, floor: 1000, round_to: 100 })).toBe(1000);
  });

  it("returns null without a valid rate", () => {
    expect(computeDepositDefault(null)).toBeNull();
    expect(computeDepositDefault(0)).toBeNull();
    expect(computeDepositDefault(-1)).toBeNull();
  });
});

describe("parseDepositRule", () => {
  it("reads the API's decimal strings", () => {
    expect(
      parseDepositRule({ parent: "Gaming", multiplier: "5.00", floor: "500.00", round_to: "50.00" })
    ).toEqual({ parent: "Gaming", multiplier: 5, floor: 500, round_to: 50 });
  });

  it("drops an unreadable rule", () => {
    expect(parseDepositRule({ multiplier: "x", floor: "500", round_to: "50" })).toBeNull();
    expect(parseDepositRule(null)).toBeNull();
  });
});

describe("parseRate", () => {
  it("accepts a positive amount with up to two decimals", () => {
    expect(parseRate("610")).toBe(610);
    expect(parseRate(" 99.5 ")).toBe(99.5);
  });

  it("rejects zero, negatives, and malformed text", () => {
    for (const v of ["", "0", "-1", "1.234", "abc", null, undefined]) {
      expect(parseRate(v as string | null)).toBeNull();
    }
  });
});
