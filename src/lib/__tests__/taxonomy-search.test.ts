import { describe, expect, it } from "@jest/globals";
import { searchTaxonomy } from "../taxonomy-search";

const tree = [
  {
    title: "Art, Décor & Hobby",
    subcategories: [{ title: "Wall Art" }, { title: "Craft Kits" }],
  },
  {
    title: "Electronics & Computing",
    subcategories: [{ title: "Projector" }, { title: "Camera Lens" }, { title: "Other" }],
  },
  { title: "Books", subcategories: [{ title: "Novels" }] },
  { title: "Musicals", subcategories: [{ title: "Guitar" }] },
];

const paths = (query: string, label?: (t: string) => string) =>
  searchTaxonomy(tree, query, label).map(({ parent, child }) => `${parent.title} › ${child.title}`);

describe("searchTaxonomy", () => {
  it("returns nothing for an empty or blank query", () => {
    expect(paths("")).toEqual([]);
    expect(paths("   ")).toEqual([]);
  });

  it("matches sub-category titles case-insensitively", () => {
    expect(paths("PROJ")).toEqual(["Electronics & Computing › Projector"]);
  });

  it("ignores accents on either side", () => {
    expect(paths("decor")).toEqual(["Art, Décor & Hobby › Wall Art", "Art, Décor & Hobby › Craft Kits"]);
    expect(paths("nóvels")).toEqual(["Books › Novels"]);
  });

  it("lists every child of a parent whose title matches", () => {
    expect(paths("electronics")).toEqual([
      "Electronics & Computing › Projector",
      "Electronics & Computing › Camera Lens",
      "Electronics & Computing › Other",
    ]);
  });

  it("needs every word, across parent and child", () => {
    expect(paths("electronics other")).toEqual(["Electronics & Computing › Other"]);
    expect(paths("books other")).toEqual([]);
  });

  it("also matches the name a row is shown under", () => {
    const label = (t: string) => (t === "Musicals" ? "Musical instruments" : t);
    expect(paths("instrument", label)).toEqual(["Musicals › Guitar"]);
  });

  it("tolerates a parent without subcategories", () => {
    expect(searchTaxonomy([{ title: "Empty" }], "empty")).toEqual([]);
  });
});
