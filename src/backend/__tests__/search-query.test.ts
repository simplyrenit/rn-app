import { describe, expect, it, jest } from "@jest/globals";
import { buildSearchQuery } from "../search";

// The query builder is pure; keep the app config and the axios client (which
// pulls in AsyncStorage) out of the test.
jest.mock("@/lib/config", () => ({ SEARCH_PRODUCTS: "", SEARCH_SPEC_FILTERS: "" }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: {} }));

const noDates = { start_date: undefined, end_date: undefined };
const base = {
  sort: "",
  category: "Appliances",
  subcategory: "Air Conditioner (AC)",
  min_price: "",
  max_price: "",
  product_rating: 0,
  owner_rating: 0,
  condition: "",
};

describe("buildSearchQuery", () => {
  it("repeats a spec key once per option, commas intact", () => {
    const query = buildSearchQuery("ac", undefined, noDates, {
      ...base,
      specs: { ac_type: ["Split", "Window"], btu: ["Up to 12,000"] },
    });
    const params = query.split("&").map((pair) => pair.split("=").map(decodeURIComponent));
    expect(params).toEqual([
      ["title", "ac"],
      ["category", "Appliances"],
      ["subcategory", "Air Conditioner (AC)"],
      ["attr.ac_type", "Split"],
      ["attr.ac_type", "Window"],
      ["attr.btu", "Up to 12,000"],
    ]);
  });

  it("leaves out empty filters and sends coordinates as lat/long", () => {
    expect(buildSearchQuery("", { lat: 19.2, lng: 72.9 }, noDates)).toBe(
      "title=&lat=19.2&long=72.9"
    );
  });
});
