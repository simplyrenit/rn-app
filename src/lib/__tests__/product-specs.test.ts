import { describe, expect, it } from "@jest/globals";
import { ProductSpec } from "../types";
import { keySpecLine, specMatchesFilters, specValueText } from "../product-specs";

const main = (key: string, label: string, value: ProductSpec["value"]): ProductSpec => ({
  key,
  label,
  value,
  facet: "default",
});

const DAIKIN_SPECS: ProductSpec[] = [
  main("capacity", "Capacity", "1.1 – 1.5 Ton"),
  main("brand", "Brand", "Daikin"),
  main("ac_type", "AC type", "Split"),
  main("technology", "Technology", "Inverter"),
  main("bee_rating", "BEE star rating", "5 Star"),
  { key: "coil", label: "Coil material", value: "Copper", facet: "expanded" },
];

describe("keySpecLine", () => {
  it("is empty when the title states every main spec", () => {
    expect(
      keySpecLine("Daikin 1.5 Ton 5 Star Inverter Split AC", DAIKIN_SPECS)
    ).toBe("");
  });

  it("keeps main specs the title does not state, in order", () => {
    expect(keySpecLine("Daikin AC", DAIKIN_SPECS)).toBe(
      "1.1 – 1.5 Ton · Split · Inverter"
    );
  });

  it("never shows more than three, and never an expanded spec", () => {
    expect(keySpecLine("Air conditioner", DAIKIN_SPECS).split(" · ")).toHaveLength(3);
    expect(keySpecLine("Daikin 1.5 Ton 5 Star Inverter Split AC", DAIKIN_SPECS)).not.toContain(
      "Copper"
    );
  });

  it("drops the brand the title names (PDP-04)", () => {
    const specs = [
      main("brand", "Brand", "Sony"),
      main("console_type", "Console type", "Home Console"),
    ];
    expect(keySpecLine("Sony PS5 with two controllers", specs)).toBe("Home Console");
  });

  it("states a range only by one of its ends in the same unit", () => {
    const specs = [main("capacity", "Capacity", "1.1 – 1.5 Ton")];
    expect(keySpecLine("LG 1.1 ton split", specs)).toBe("");
    expect(keySpecLine("LG 1.5-ton split", specs)).toBe("");
    expect(keySpecLine("LG 1.5ton split", specs)).toBe("");
    // Inside the range but not an end: the page must not claim it.
    expect(keySpecLine("LG 1.2 Ton split", specs)).toBe("1.1 – 1.5 Ton");
    // The right number in another unit.
    expect(keySpecLine("LG 1.5 kW split", specs)).toBe("1.1 – 1.5 Ton");
  });

  it("reads thousands separators as the same number", () => {
    const specs = [main("btu", "Cooling capacity", "12,000 – 18,000 BTU")];
    expect(keySpecLine("Voltas 18000 BTU window", specs)).toBe("");
  });

  it("matches whole words only", () => {
    const specs = [main("ac_type", "AC type", "AC")];
    expect(keySpecLine("Blackstone cooler", specs)).toBe("AC");
  });

  it("is empty with no specs (older API)", () => {
    expect(keySpecLine("Anything", [])).toBe("");
  });

  it("keeps a multi-value spec unless the title states all of its values", () => {
    const specs = [main("ports", "Ports", ["HDMI", "USB-C"])];
    expect(keySpecLine("Monitor with HDMI", specs)).toBe("HDMI, USB-C");
    expect(keySpecLine("Monitor HDMI USB-C", specs)).toBe("");
  });
});

describe("specMatchesFilters", () => {
  const acType = main("ac_type", "AC type", "Split");

  it("matches a chosen option of the same key exactly", () => {
    expect(specMatchesFilters(acType, { ac_type: ["Window", "Split"] })).toBe(true);
  });

  it("does not match another key, another value, or no filters", () => {
    expect(specMatchesFilters(acType, { brand: ["Split"] })).toBe(false);
    expect(specMatchesFilters(acType, { ac_type: ["Window"] })).toBe(false);
    expect(specMatchesFilters(acType, undefined)).toBe(false);
    expect(specMatchesFilters(acType, {})).toBe(false);
  });

  it("matches a multi-value spec on any of its values", () => {
    const ports = main("ports", "Ports", ["HDMI", "USB-C"]);
    expect(specMatchesFilters(ports, { ports: ["USB-C"] })).toBe(true);
  });
});

describe("specValueText", () => {
  it("shows a stored range exactly and lists multiple values", () => {
    expect(specValueText("1.1 – 1.5 Ton")).toBe("1.1 – 1.5 Ton");
    expect(specValueText(["HDMI", "USB-C"])).toBe("HDMI, USB-C");
  });
});
