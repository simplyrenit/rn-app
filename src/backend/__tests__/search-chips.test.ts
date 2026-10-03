import { describe, expect, it, jest } from "@jest/globals";
import { SpecFilter, quickChipSpec, toggleSpecOption } from "../search";

jest.mock("@/lib/config", () => ({ SEARCH_PRODUCTS: "", SEARCH_SPEC_FILTERS: "" }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: {} }));

const spec = (key: string, facet: SpecFilter["facet"]): SpecFilter => ({
  key,
  label: key,
  type: "enum",
  facet,
  options: [{ value: `${key}-a`, count: 1 }],
});

describe("quickChipSpec", () => {
  it("picks the first default spec in the server's order", () => {
    const filters = [spec("capacity", "expanded"), spec("type", "default"), spec("brand", "default")];
    expect(quickChipSpec(filters)?.key).toBe("type");
  });

  it("is null without a default spec", () => {
    expect(quickChipSpec([spec("capacity", "expanded")])).toBeNull();
    expect(quickChipSpec([])).toBeNull();
  });
});

describe("toggleSpecOption", () => {
  it("adds an option alongside the spec's others, keeping other specs", () => {
    expect(toggleSpecOption({ type: ["Desert"], size: ["70 L+"] }, "type", "Tower")).toEqual({
      type: ["Desert", "Tower"],
      size: ["70 L+"],
    });
  });

  it("removes a chosen option and drops a spec left empty", () => {
    expect(toggleSpecOption({ type: ["Desert", "Tower"] }, "type", "Desert")).toEqual({
      type: ["Tower"],
    });
    expect(toggleSpecOption({ type: ["Desert"] }, "type", "Desert")).toEqual({});
  });

  it("does not mutate its input", () => {
    const specs = { type: ["Desert"] };
    toggleSpecOption(specs, "type", "Tower");
    expect(specs).toEqual({ type: ["Desert"] });
  });
});
