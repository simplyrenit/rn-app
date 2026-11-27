import { describe, expect, it } from "@jest/globals";
import {
  BriefcaseIcon,
  CakeIcon,
  CameraIcon,
  CpuChipIcon,
  CubeIcon,
  FaceSmileIcon,
  FireIcon,
  HeartIcon,
  HomeModernIcon,
  MusicalNoteIcon,
  PaintBrushIcon,
  RocketLaunchIcon,
  ShoppingBagIcon,
  TrophyIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
} from "react-native-heroicons/outline";
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

  it("draws every parent with the 2.1 kit Category icon map's glyph (figma/00 2110:30283)", () => {
    const parents: [string, string, unknown][] = [
      ["Electronics & Computing", "electronics-computing", CpuChipIcon],
      ["Photo & Video Production", "photo-video-production", CameraIcon],
      ["Audio, Music & DJ", "audio-music-dj", MusicalNoteIcon],
      ["Fashion & Accessories", "fashion-accessories", ShoppingBagIcon],
      ["Gaming, VR & Emerging Tech", "gaming-vr-emerging-tech", RocketLaunchIcon],
      ["Machines, Tools & Equipment", "machines-tools-equipment", WrenchScrewdriverIcon],
      ["Travel, Outdoor & Office", "travel-outdoor-office", BriefcaseIcon],
      ["Fitness & Sports", "fitness-sports", TrophyIcon],
      ["Automobiles & Mobility", "automobiles-mobility", TruckIcon],
      ["Appliances", "appliances", FireIcon],
      ["Furniture", "furniture", HomeModernIcon],
      ["Art, Decor & Hobby", "art-decor-hobby", PaintBrushIcon],
      ["Events & Celebrations", "events-celebrations", CakeIcon],
      ["Baby & Kids", "baby-kids", FaceSmileIcon],
      ["Health & Medical", "health-medical", HeartIcon],
    ];
    for (const [title, slug, icon] of parents) {
      expect([title, categoryIconFor(title, slug)]).toEqual([title, icon]);
    }
    // The legacy fashion names too, and Other / all falls back to the cube.
    for (const name of ["Fashion", "Clothing", "Formalwear"]) {
      expect(categoryIconFor(name)).toBe(ShoppingBagIcon);
    }
    expect(categoryIconFor("Something new")).toBe(CubeIcon);
  });
});
