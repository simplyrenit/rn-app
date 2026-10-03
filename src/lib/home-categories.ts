import type { Category, CategoryItem } from "./types";

/** Home's grid is 4 x 2 and its last cell is the "All categories" tile. */
export const HOME_TILE_COUNT = 7;

/**
 * What a category tile needs. An API `Category` is one; so is a bundled tile
 * mapped across, which has a slug and a name but no remote picture.
 */
export interface BrowseCategory {
  slug?: string;
  title: string;
  main_icon?: string | null;
  light_icon?: string | null;
  dark_icon?: string | null;
}

/**
 * The seven categories Home shows, in order.
 *
 * Admin puts a category on Home by giving it a `homepage_order_id` above 0, so
 * adding or archiving one changes Home with no release. A server from before
 * that field (or one where nobody has set it yet) gets the first seven in the
 * API's own order instead of an empty grid. No list at all — a cold start
 * offline — falls back to the bundled tiles, so Home is never blank.
 */
export function pickHomeCategories(
  categories: Category[],
  bundled: CategoryItem[]
): BrowseCategory[] {
  if (categories.length === 0) {
    return bundled
      .slice(0, HOME_TILE_COUNT)
      .map(({ name, slug }) => ({ slug, title: name }));
  }
  const ranked = categories
    .filter((category) => (category.homepage_order_id ?? 0) > 0)
    .sort((a, b) => a.homepage_order_id! - b.homepage_order_id!);
  return (ranked.length > 0 ? ranked : categories).slice(0, HOME_TILE_COUNT);
}

/**
 * The shorter names the Home frame prints, keyed by v2 slug. A Home cell is 80pt
 * wide at 360dp, and "Machines, Tools & Equipment" needs three lines there; the
 * All categories screen has the room and keeps the API's full titles.
 */
const HOME_NAMES: Record<string, string> = {
  "electronics-computing": "Electronics",
  "photo-video-production": "Photo & video",
  "audio-music-dj": "Music & DJ",
  "fashion-accessories": "Fashion",
  "gaming-vr-emerging-tech": "Gaming & VR",
  "machines-tools-equipment": "Machines & tools",
  "travel-outdoor-office": "Travel & outdoor",
};

export function homeTileName(category: BrowseCategory): string {
  return (category.slug && HOME_NAMES[category.slug]) || category.title;
}
