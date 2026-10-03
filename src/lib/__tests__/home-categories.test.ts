import { describe, expect, it } from "@jest/globals";
import { homeTileName, pickHomeCategories } from "../home-categories";
import type { Category, CategoryItem } from "../types";

const category = (slug: string, homepage_order_id?: number): Category => ({
  slug,
  title: slug,
  homepage_order_id,
  order_id: 0,
  main_icon: "",
  light_icon: null,
  dark_icon: null,
  subcategories: [],
});

const bundled: CategoryItem[] = ["a", "b", "c", "d", "e", "f", "g", "h"].map(
  (slug) => ({ name: slug.toUpperCase(), slug, image: 1 })
);

const slugs = (list: { slug?: string }[]) => list.map((c) => c.slug);

describe("pickHomeCategories", () => {
  it("orders by homepage_order_id and drops the zeros", () => {
    const list = [category("x", 0), category("y", 2), category("z", 1), category("w")];
    expect(slugs(pickHomeCategories(list, bundled))).toEqual(["z", "y"]);
  });

  it("caps Home at seven", () => {
    const list = Array.from({ length: 9 }, (_, i) => category(`c${i}`, 9 - i));
    expect(slugs(pickHomeCategories(list, bundled))).toEqual(
      ["c8", "c7", "c6", "c5", "c4", "c3", "c2"]
    );
  });

  it("takes the first seven in API order when no category has a Home slot", () => {
    const list = Array.from({ length: 9 }, (_, i) => category(`c${i}`));
    expect(slugs(pickHomeCategories(list, bundled))).toEqual(
      ["c0", "c1", "c2", "c3", "c4", "c5", "c6"]
    );
  });

  it("falls back to the bundled tiles when the list is empty", () => {
    const picked = pickHomeCategories([], bundled);
    expect(slugs(picked)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(picked[0].title).toBe("A");
  });
});

describe("homeTileName", () => {
  it("shortens the long v2 titles and keeps the rest", () => {
    expect(homeTileName({ slug: "electronics-computing", title: "Electronics & Computing" })).toBe("Electronics");
    expect(homeTileName({ slug: "automobiles-mobility", title: "Automobiles & Mobility" })).toBe("Automobiles & Mobility");
    expect(homeTileName({ title: "Books" })).toBe("Books");
  });
});
