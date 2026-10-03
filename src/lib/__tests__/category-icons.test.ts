import { describe, expect, it } from "@jest/globals";
import { CubeIcon, FireIcon } from "react-native-heroicons/outline";
import { categoryIconFor, SUB_ICONS } from "../category-icons";

const glyphs: Record<string, number> = require("@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json");

describe("category icons", () => {
  it("only maps sub-categories to glyphs that exist", () => {
    // A typo renders a "?" tile at runtime and no type error catches it.
    const missing = Object.entries(SUB_ICONS).filter(([, g]) => !(g in glyphs));
    expect(missing).toEqual([]);
  });

  it("gives a sub-category its own glyph and leaves parents on Heroicons", () => {
    expect(categoryIconFor("Refrigerator", "appliances-refrigerator")).not.toBe(CubeIcon);
    expect(categoryIconFor("Appliances", "appliances")).toBe(FireIcon);
  });
});
