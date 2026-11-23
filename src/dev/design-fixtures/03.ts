import type { Category } from "@/lib/types";
import type { DevFixture } from "./registry";

// all-categories · Loaded (2089:24546): the frame's 15 parents, in its order, under the taxonomy v2 slugs the API
// sends (as in HOME_NAMES in lib/home-categories.ts and the v2 keys in lib/category-icons.tsx). No uploaded pictures.
const ALL_CATEGORIES: [string, string][] = [
  ["Electronics & Computing", "electronics-computing"],
  ["Photo & Video Production", "photo-video-production"],
  ["Audio, Music & DJ", "audio-music-dj"],
  ["Fashion & Accessories", "fashion-accessories"],
  ["Gaming, VR & Emerging Tech", "gaming-vr-emerging-tech"],
  ["Machines, Tools & Equipment", "machines-tools-equipment"],
  ["Travel, Outdoor & Office", "travel-outdoor-office"],
  ["Fitness & Sports", "fitness-sports"],
  ["Automobiles & Mobility", "automobiles-mobility"],
  ["Appliances", "appliances"],
  ["Furniture", "furniture"],
  ["Art, Decor & Hobby", "art-decor-hobby"],
  ["Events & Celebrations", "events-celebrations"],
  ["Baby & Kids", "baby-kids"],
  ["Health & Medical", "health-medical"],
];

const categories: Category[] = ALL_CATEGORIES.map(([title, slug], index) => ({
  id: 9000 + index,
  slug,
  // Home shows seven (ENG-76); the first seven here, so Home stays filled while the fixture is on.
  homepage_order_id: index < 7 ? index + 1 : 0,
  dark_icon: null,
  light_icon: null,
  main_icon: "",
  order_id: index + 1,
  title,
  subcategories: [],
}));

/** Design fixtures for Figma section 03 (Home and browse), keyed by frame id (registry.ts). */
export const fixtures: Record<string, DevFixture> = {
  "2089:24546": { route: "AllCategories", responses: { "GET /category/": categories } },
};
