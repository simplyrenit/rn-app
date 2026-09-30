import { describe, expect, it } from "@jest/globals";
import { createDraft, draftReducer, DraftAction, hydrateDraft, serializeDraft } from "../draft";
import { buildCreatePayload } from "../payload";
import {
  currentSpecs,
  resolveCategoryId,
  specAttributes,
  specsFromResponse,
  specsLoading,
} from "../specs";
import { ListingDraft, WireSpec } from "../types";

const AC = { id: 7, parent: "Appliances", title: "Air conditioner" };
const FRIDGE = { id: 8, parent: "Appliances", title: "Refrigerator" };

const wire: WireSpec[] = [
  { key: "ac_type", label: "Type", type: "enum", facet: "default", options: ["Split", "Window"], value: "Split", status: "filled" },
  { key: "capacity", label: "Capacity", type: "enum", facet: "default", options: ["1 Ton", "1.5 Ton"], value: "1.5 Ton", status: "check" },
  { key: "brand", label: "Brand", type: "enum", facet: "default", options: ["Daikin", "LG"], value: null, status: "blank" },
  { key: "features", label: "Features", type: "multi_enum", facet: "expanded", options: ["Wi-Fi", "Fast Cooling"], value: ["Wi-Fi"], status: "filled" },
];

function build(...actions: DraftAction[]) {
  return actions.reduce<ListingDraft>(
    (d, a) => draftReducer(d, a) as ListingDraft,
    createDraft("attempt-1", 0)
  );
}

const loaded = (...more: DraftAction[]) =>
  build(
    { type: "editField", field: "category", value: AC },
    { type: "specsRequested", categoryId: 7 },
    { type: "specsLoaded", categoryId: 7, specs: wire },
    ...more
  );

describe("specsFromResponse", () => {
  it("keeps status, and blanks a value that is not one of the options", () => {
    const specs = specsFromResponse([
      ...wire,
      { key: "odd", label: "Odd", type: "enum", facet: "default", options: ["A"], value: "B", status: "filled" },
      { key: "text", label: "Text", type: "text", facet: "default", options: ["A"], value: "A", status: "filled" },
    ]);
    expect(specs.map((s) => [s.key, s.status, s.value])).toEqual([
      ["ac_type", "filled", "Split"],
      ["capacity", "check", "1.5 Ton"],
      ["brand", "blank", null],
      ["features", "filled", ["Wi-Fi"]],
      ["odd", "blank", null],
    ]);
  });
});

describe("resolveCategoryId", () => {
  const categories = [{ title: "Appliances", subcategories: [{ id: 7, title: "Air conditioner" }] }];
  it("finds the id for a category named by title, ignoring case", () => {
    expect(resolveCategoryId(categories, { parent: "appliances", title: "AIR CONDITIONER" })).toBe(7);
  });
  it("is null for a category not in the taxonomy", () => {
    expect(resolveCategoryId(categories, { parent: "Appliances", title: "Toaster" })).toBeNull();
  });
});

describe("specs in the draft", () => {
  it("shows a skeleton while the request runs, then the specs", () => {
    const loading = build(
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7 }
    );
    expect(specsLoading(loading)).toBe(true);
    expect(currentSpecs(loading)).toEqual([]);
    expect(currentSpecs(loaded()).map((s) => s.key)).toEqual(["ac_type", "capacity", "brand", "features"]);
  });

  it("clears the specs when the owner changes the category", () => {
    const d = loaded({ type: "editField", field: "category", value: FRIDGE });
    expect(d.specs).toEqual({ categoryId: null, status: "idle", items: [] });
  });

  it("keeps the specs when the owner re-picks the same category", () => {
    const d = loaded({ type: "editField", field: "category", value: { ...AC } });
    expect(currentSpecs(d)).toHaveLength(4);
  });

  it("ignores a response for a category the owner has since left", () => {
    const d = build(
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7 },
      { type: "editField", field: "category", value: FRIDGE },
      { type: "specsRequested", categoryId: 8 },
      { type: "specsLoaded", categoryId: 7, specs: wire }
    );
    expect(d.specs.status).toBe("loading");
    expect(d.specs.categoryId).toBe(8);
  });

  it("never shows specs asked for another category than the draft holds", () => {
    const d = build(
      { type: "mergeAi", event: { field: "category", status: "filled", value: { parent: AC.parent, title: AC.title } } },
      // The id the app resolves for the model's titles: a confirmation.
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7 },
      { type: "specsLoaded", categoryId: 7, specs: wire },
      // A later run re-reads the category: titles only, no id yet.
      { type: "mergeAi", event: { field: "category", status: "filled", value: { parent: "Appliances", title: "Refrigerator" } } }
    );
    expect(d.fields.category.value?.title).toBe("Refrigerator");
    expect(currentSpecs(d)).toEqual([]);
    expect(specAttributes(d)).toEqual({});
  });

  it("hides the card when the call failed", () => {
    const d = build(
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7 },
      { type: "specsUnavailable", categoryId: 7 }
    );
    expect(d.specs.status).toBe("unavailable");
    expect(currentSpecs(d)).toEqual([]);
    expect(specsLoading(d)).toBe(false);
  });

  it("makes an owner edit theirs", () => {
    const d = loaded({ type: "setSpec", key: "ac_type", value: "Window" });
    expect(currentSpecs(d)[0]).toMatchObject({ value: "Window", status: "user" });
  });

  it("clears the Check tag when the owner confirms the same value", () => {
    const d = loaded({ type: "setSpec", key: "capacity", value: "1.5 Ton" });
    expect(currentSpecs(d)[1]).toMatchObject({ value: "1.5 Ton", status: "user" });
  });

  it("stores a cleared multi-select as no value", () => {
    const d = loaded({ type: "setSpec", key: "features", value: [] });
    expect(currentSpecs(d)[3]).toMatchObject({ value: null, status: "user" });
  });

  it("asks again after a resume that was saved mid-request", () => {
    const d = build(
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7 }
    );
    expect(hydrateDraft(serializeDraft(d), 0)?.specs.status).toBe("idle");
    expect(hydrateDraft(serializeDraft(loaded()), 0)?.specs.status).toBe("ready");
  });

  it("gives a draft saved before ENG-34 empty specs", () => {
    const { specs, ...old } = createDraft("attempt-1", 0);
    expect(specs.status).toBe("idle");
    expect(hydrateDraft(JSON.stringify(old), 0)?.specs).toEqual({ categoryId: null, status: "idle", items: [] });
  });
});

describe("attributes in the create payload", () => {
  const contact = { name: "Asha", phone: "+919800000000" };

  it("sends filled, checked and owner-set values and omits blanks", () => {
    const d = loaded({ type: "setSpec", key: "ac_type", value: "Window" });
    expect(buildCreatePayload(d, contact).attributes).toEqual({
      ac_type: "Window",
      capacity: "1.5 Ton",
      features: ["Wi-Fi"],
    });
  });

  it("leaves the key out when no spec has a value", () => {
    expect(buildCreatePayload(build(), contact)).not.toHaveProperty("attributes");
  });
});
