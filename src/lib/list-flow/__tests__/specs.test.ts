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
    { type: "specsRequested", categoryId: 7, requestId: "r7" },
    { type: "specsLoaded", requestId: "r7", specs: wire },
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
      { type: "specsRequested", categoryId: 7, requestId: "r7" }
    );
    expect(specsLoading(loading)).toBe(true);
    expect(currentSpecs(loading)).toEqual([]);
    expect(currentSpecs(loaded()).map((s) => s.key)).toEqual(["ac_type", "capacity", "brand", "features"]);
  });

  it("clears the specs when the owner changes the category", () => {
    const d = loaded({ type: "editField", field: "category", value: FRIDGE });
    expect(d.specs).toEqual({ categoryId: null, requestId: null, status: "idle", items: [] });
  });

  it("keeps the specs when the owner re-picks the same category", () => {
    const d = loaded({ type: "editField", field: "category", value: { ...AC } });
    expect(currentSpecs(d)).toHaveLength(4);
  });

  it("ignores a response for a category the owner has since left", () => {
    const d = build(
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "r7" },
      { type: "editField", field: "category", value: FRIDGE },
      { type: "specsRequested", categoryId: 8, requestId: "r8" },
      { type: "specsLoaded", requestId: "r7", specs: wire }
    );
    expect(d.specs.status).toBe("loading");
    expect(d.specs.categoryId).toBe(8);
  });

  it("never shows specs asked for another category than the draft holds", () => {
    const d = build(
      { type: "mergeAi", event: { field: "category", status: "filled", value: { parent: AC.parent, title: AC.title } } },
      // The id the app resolves for the model's titles: a confirmation.
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "r7" },
      { type: "specsLoaded", requestId: "r7", specs: wire },
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
      { type: "specsRequested", categoryId: 7, requestId: "r7" },
      { type: "specsUnavailable", requestId: "r7" }
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
      { type: "specsRequested", categoryId: 7, requestId: "r7" }
    );
    expect(hydrateDraft(serializeDraft(d), 0)?.specs.status).toBe("idle");
    expect(hydrateDraft(serializeDraft(loaded()), 0)?.specs.status).toBe("ready");
  });

  it("gives a draft saved before ENG-34 empty specs", () => {
    const { specs, ...old } = createDraft("attempt-1", 0);
    expect(specs.status).toBe("idle");
    expect(hydrateDraft(JSON.stringify(old), 0)?.specs).toEqual({ categoryId: null, requestId: null, status: "idle", items: [] });
  });
});

describe("specs across requests and re-runs", () => {
  const photo = (id: string) => ({
    id,
    localUri: `file:///${id}.jpg`,
    remoteUrl: `https://cdn.test/${id}.jpg`,
    source: "camera" as const,
    status: "done" as const,
  });

  it("takes only the answer to the latest request for the same category (B, A, B)", () => {
    const d = build(
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "b1" },
      { type: "editField", field: "category", value: FRIDGE },
      { type: "specsRequested", categoryId: 8, requestId: "a" },
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "b2" },
      // The first B's timeout lands late; the second B's answer after it.
      { type: "specsUnavailable", requestId: "b1" },
      { type: "specsLoaded", requestId: "b2", specs: wire }
    );
    expect(d.specs.status).toBe("ready");
    expect(currentSpecs(d)).toHaveLength(4);
  });

  it("drops the old photos' specs on a changed-photos run and keeps the owner's", () => {
    const d = build(
      { type: "addPhoto", photo: photo("a") },
      { type: "serverRunCounted", clearStaleAi: true, sentPhotoIds: ["a"] },
      { type: "mergeAi", event: { field: "category", status: "filled", value: { parent: AC.parent, title: AC.title } } },
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "r1" },
      { type: "specsLoaded", requestId: "r1", specs: wire },
      { type: "setSpec", key: "brand", value: "LG" },
      // New photos, and the run on them is accepted.
      { type: "addPhoto", photo: photo("b") },
      { type: "serverRunCounted", clearStaleAi: true, sentPhotoIds: ["a", "b"] }
    );
    expect(d.specs.status).toBe("idle");
    expect(d.specs.items.map((s) => [s.key, s.value, s.status])).toEqual([["brand", "LG", "user"]]);
    expect(specAttributes(d)).toEqual({});

    // The re-run names the same category; the new answer comes under the owner's brand.
    const again = [
      { type: "mergeAi", event: { field: "category", status: "filled", value: { parent: AC.parent, title: AC.title } } },
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "r2" },
      {
        type: "specsLoaded",
        requestId: "r2",
        specs: [
          { ...wire[0], value: "Window", status: "check" },
          { ...wire[2], value: "Daikin", status: "filled" },
        ],
      },
    ] as DraftAction[];
    const next = again.reduce<ListingDraft>((x, a) => draftReducer(x, a) as ListingDraft, d);
    expect(specAttributes(next)).toEqual({ ac_type: "Window", brand: "LG" });
  });

  it("does not touch specs on a same-photo re-run", () => {
    const d = loaded({ type: "serverRunCounted", clearStaleAi: false });
    expect(d.specs.status).toBe("ready");
  });

  it("ignores an answer that arrives after a stale-photo reset", () => {
    const d = build(
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "r1" },
      { type: "serverRunCounted", clearStaleAi: true, sentPhotoIds: [] },
      { type: "specsLoaded", requestId: "r1", specs: wire }
    );
    expect(d.specs.status).toBe("idle");
  });

  it("hydrates a stored specs object with missing parts", () => {
    const d = build({ type: "editField", field: "category", value: AC });
    const raw = JSON.parse(serializeDraft(d));
    raw.specs = { categoryId: 7, status: "ready" };
    expect(hydrateDraft(JSON.stringify(raw), 0)?.specs).toEqual({
      categoryId: 7,
      requestId: null,
      status: "ready",
      items: [],
    });
  });
});

describe("the owner's spec values survive a changed-photos re-run", () => {
  const contact = { name: "Asha", phone: "+919800000000" };
  const photo = (id: string) => ({
    id,
    localUri: `file:///${id}.jpg`,
    remoteUrl: `https://cdn.test/${id}.jpg`,
    source: "camera" as const,
    status: "done" as const,
  });
  const then = (d: ListingDraft, ...actions: DraftAction[]) =>
    actions.reduce<ListingDraft>((x, a) => draftReducer(x, a) as ListingDraft, d);

  /** Owner-chosen category, specs in, the owner set Brand, then new photos were read. */
  const afterRerun = () =>
    loaded(
      { type: "setSpec", key: "brand", value: "LG" },
      { type: "addPhoto", photo: photo("b") },
      { type: "serverRunCounted", clearStaleAi: true, sentPhotoIds: ["b"] }
    );

  it("keeps them shown and sent before the re-ask is made", () => {
    const d = afterRerun();
    expect(d.specs.status).toBe("idle");
    expect(currentSpecs(d).map((s) => s.key)).toEqual(["brand"]);
    expect(buildCreatePayload(d, contact).attributes).toEqual({ brand: "LG" });
  });

  it("keeps them while the re-ask is in flight", () => {
    const d = then(afterRerun(), { type: "specsRequested", categoryId: 7, requestId: "r2" });
    expect(specsLoading(d)).toBe(true);
    expect(buildCreatePayload(d, contact).attributes).toEqual({ brand: "LG" });
  });

  it("keeps them after a failed re-ask", () => {
    // The client turns every refusal, 409 spec_limit included, into
    // specsUnavailable; the 409 itself is covered in the backend suite.
    const d = then(
      afterRerun(),
      { type: "specsRequested", categoryId: 7, requestId: "r2" },
      { type: "specsUnavailable", requestId: "r2" }
    );
    expect(d.specs.status).toBe("unavailable");
    expect(currentSpecs(d).map((s) => [s.key, s.value, s.status])).toEqual([["brand", "LG", "user"]]);
    expect(buildCreatePayload(d, contact).attributes).toEqual({ brand: "LG" });
  });

  it("keeps them when the re-run names no category and the owner's stands", () => {
    const d = then(afterRerun(), {
      type: "mergeAi",
      event: { field: "category", status: "blank", value: null },
    });
    expect(d.fields.category.value).toEqual(AC);
    expect(buildCreatePayload(d, contact).attributes).toEqual({ brand: "LG" });
  });

  it("brings them back when the model's category was cleared and the owner re-picks it", () => {
    const d = build(
      { type: "mergeAi", event: { field: "category", status: "filled", value: { parent: AC.parent, title: AC.title } } },
      { type: "editField", field: "category", value: AC },
      { type: "specsRequested", categoryId: 7, requestId: "r1" },
      { type: "specsLoaded", requestId: "r1", specs: wire },
      { type: "setSpec", key: "brand", value: "LG" },
      { type: "addPhoto", photo: photo("b") },
      { type: "serverRunCounted", clearStaleAi: true, sentPhotoIds: ["b"] },
      // The re-run cannot place the item.
      { type: "mergeAi", event: { field: "category", status: "blank", value: null } }
    );
    expect(d.fields.category.value).toBeNull();
    expect(buildCreatePayload(d, contact)).not.toHaveProperty("attributes");
    const repicked = then(d, { type: "editField", field: "category", value: AC });
    expect(buildCreatePayload(repicked, contact).attributes).toEqual({ brand: "LG" });
    // Another category still starts clean.
    const other = then(d, { type: "editField", field: "category", value: FRIDGE });
    expect(other.specs.items).toEqual([]);
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
