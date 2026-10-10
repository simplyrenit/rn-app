import { describe, expect, it } from "@jest/globals";
import { parseQuantity, parseWorth, quantityInUseMessage, suggestedWorth } from "../stock";

describe("parseQuantity", () => {
  it("takes a whole number of at least 1", () => {
    expect(parseQuantity("1")).toBe(1);
    expect(parseQuantity(" 12 ")).toBe(12);
  });

  it("refuses 0, empty, decimals and text", () => {
    for (const bad of ["0", "", "  ", "1.5", "-2", "two", "1e3", null, undefined]) {
      expect(parseQuantity(bad as string | null | undefined)).toBeNull();
    }
  });
});

describe("parseWorth", () => {
  it("takes rupees above zero, up to two decimals", () => {
    expect(parseWorth("45000")).toBe(45000);
    expect(parseWorth("99.5")).toBe(99.5);
    expect(parseWorth("99.50")).toBe(99.5);
  });

  it("refuses zero, empty, three decimals and text", () => {
    for (const bad of ["0", "0.00", "", "12.345", "-5", "₹100", "1,000", null, undefined]) {
      expect(parseWorth(bad as string | null | undefined)).toBeNull();
    }
  });
});

describe("suggestedWorth", () => {
  it("turns the model's figure into the text a field holds, whole rupees", () => {
    expect(suggestedWorth(45000)).toBe("45000");
    expect(suggestedWorth("45000")).toBe("45000");
    expect(suggestedWorth(1499.6)).toBe("1500");
  });

  it("drops anything that is no usable figure", () => {
    for (const bad of [0, -3, "abc", null, undefined, NaN, {}, 0.2]) {
      expect(suggestedWorth(bad)).toBeNull();
    }
  });
});

describe("quantityInUseMessage", () => {
  it("names the worst day and the bookings", () => {
    expect(
      quantityInUseMessage({
        conflicts: [
          { day: "2026-10-23", in_use: 1, bookings: ["RN-24800"], blocks: [] },
          { day: "2026-10-24", in_use: 2, bookings: ["RN-24831", "RN-24840"], blocks: [] },
        ],
      })
    ).toBe("Keep at least 2 in stock. 2 units are in use on 24 Oct (RN-24831, RN-24840).");
  });

  it("says blocked when only a block holds the unit", () => {
    expect(quantityInUseMessage({ conflicts: [{ day: "2026-10-24", in_use: 1, bookings: [], blocks: [{}] }] })).toBe(
      "Keep at least 1 in stock. 1 unit is in use on 24 Oct (blocked)."
    );
  });

  it("still says something without details", () => {
    expect(quantityInUseMessage(null)).toContain("Keep at least");
    expect(quantityInUseMessage({ conflicts: [] })).toContain("Keep at least");
  });
});
