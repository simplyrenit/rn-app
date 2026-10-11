import { describe, expect, it } from "@jest/globals";
import {
  DRAFT_MAX_AGE_MS,
  MAX_RUNS_PER_ATTEMPT,
  canRunAgain,
  createDraft,
  draftReducer,
  hydrateDraft,
  isDraftWorthResuming,
  missingRequirements,
  photosChangedSinceRun,
  serializeDraft,
  stillNeededLabel,
} from "../draft";
import { DraftAction } from "../draft";
import { FieldEvent, ListingDraft, PhotoItem } from "../types";

const NOW = 1_790_000_000_000;

function apply(draft: ListingDraft, ...actions: DraftAction[]): ListingDraft {
  return actions.reduce<ListingDraft>((d, a) => draftReducer(d, a) as ListingDraft, draft);
}

const fresh = () => createDraft("attempt-1", NOW);

const filled = (field: string, value: unknown, extra: Partial<FieldEvent> = {}): DraftAction => ({
  type: "mergeAi",
  event: { field, status: "filled", value, confidence: 0.9, ...extra },
});

const blank = (field: string, evidence?: string): DraftAction => ({
  type: "mergeAi",
  event: { field, status: "blank", value: null, confidence: 0.4, evidence },
});

const photo = (id: string, status: PhotoItem["status"] = "done"): PhotoItem => ({
  id,
  localUri: `file:///${id}.jpg`,
  remoteUrl: status === "done" ? `https://cdn.example.com/${id}.jpg` : undefined,
  source: "camera",
  status,
});

describe("merge rule", () => {
  it("fills an empty field and marks it ai", () => {
    const d = apply(fresh(), filled("title", "Sony PS5"));
    expect(d.fields.title).toMatchObject({ value: "Sony PS5", source: "ai", confidence: 0.9 });
  });

  it("lets a later run replace a value that is still the model's", () => {
    const d = apply(fresh(), filled("title", "PS5"), filled("title", "Sony PS5 Disc"));
    expect(d.fields.title.value).toBe("Sony PS5 Disc");
    expect(d.fields.title.source).toBe("ai");
  });

  it("never overwrites an ai_edited field", () => {
    const d = apply(
      fresh(),
      filled("title", "PS5"),
      { type: "editField", field: "title", value: "My PS5" },
      filled("title", "Sony PS5 Disc")
    );
    expect(d.fields.title).toMatchObject({ value: "My PS5", source: "ai_edited" });
  });

  it("never overwrites a user field", () => {
    const d = apply(
      fresh(),
      { type: "editField", field: "brand_name", value: "Sony" },
      filled("brand_name", "Microsoft")
    );
    expect(d.fields.brand_name).toMatchObject({ value: "Sony", source: "user" });
  });

  it("keeps a cleared field cleared: the edited source blocks a refill", () => {
    const d = apply(
      fresh(),
      filled("model_name", "CFI-1216A"),
      { type: "editField", field: "model_name", value: "" },
      filled("model_name", "CFI-1216A")
    );
    expect(d.fields.model_name).toMatchObject({ value: null, source: "ai_edited" });
  });

  it("stores evidence from a blank event on an empty field and leaves it null", () => {
    const d = apply(fresh(), blank("model_name", "label partly readable, photo 2"));
    expect(d.fields.model_name).toMatchObject({
      value: null,
      source: "empty",
      evidence: "label partly readable, photo 2",
    });
  });

  it("does not let a blank event clear a filled field", () => {
    const d = apply(fresh(), filled("brand_name", "Sony"), blank("brand_name", "unsure"));
    expect(d.fields.brand_name).toMatchObject({ value: "Sony", source: "ai" });
  });

  it("does not attach blank evidence to a field the owner typed", () => {
    const d = apply(
      fresh(),
      { type: "editField", field: "model_name", value: "X1" },
      blank("model_name", "blurred")
    );
    expect(d.fields.model_name.evidence).toBeUndefined();
  });

  it("ignores fields outside the extraction allowlist", () => {
    const before = fresh();
    const d = apply(before, filled("rate", "500"), filled("location", "Thane"));
    expect(d.fields.rate.value).toBeNull();
    expect(d.fields.location.value).toBeNull();
  });

  it("accepts a category only as a {parent, title} pair", () => {
    const bad = apply(fresh(), filled("category", "Gaming"));
    expect(bad.fields.category.value).toBeNull();
    const good = apply(fresh(), filled("category", { parent: "Gaming", title: "Consoles" }));
    expect(good.fields.category).toMatchObject({
      value: { parent: "Gaming", title: "Consoles" },
      source: "ai",
    });
  });
});

describe("condition: proposal vs confirmation", () => {
  it("sets the proposal only; it is not confirmed", () => {
    const d = apply(fresh(), filled("condition", "good"));
    expect(d.conditionProposal).toBe("good");
    expect(d.conditionConfirmed).toBe(false);
    expect(missingRequirements(d).map((m) => m.key)).toContain("condition");
  });

  it("rejects values outside excellent/good/fair", () => {
    const d = apply(fresh(), filled("condition", "mint"));
    expect(d.conditionProposal).toBeNull();
    expect(d.fields.condition.value).toBeNull();
  });

  it("confirming the AI's guess keeps the source ai", () => {
    const d = apply(fresh(), filled("condition", "good"), { type: "confirmCondition", value: "good" });
    expect(d.conditionConfirmed).toBe(true);
    expect(d.fields.condition).toMatchObject({ value: "good", source: "ai" });
  });

  it("choosing something else is an edit", () => {
    const d = apply(fresh(), filled("condition", "good"), { type: "confirmCondition", value: "fair" });
    expect(d.fields.condition).toMatchObject({ value: "fair", source: "ai_edited" });
    expect(d.conditionProposal).toBe("good");
  });

  it("a tap with no proposal is the owner's value", () => {
    const d = apply(fresh(), { type: "confirmCondition", value: "excellent" });
    expect(d.fields.condition).toMatchObject({ value: "excellent", source: "user" });
  });

  it("a new run never resets a confirmed condition", () => {
    const d = apply(
      fresh(),
      filled("condition", "good"),
      { type: "confirmCondition", value: "good" },
      { type: "runStarted" },
      filled("condition", "fair")
    );
    expect(d.conditionConfirmed).toBe(true);
    expect(d.fields.condition.value).toBe("good");
    expect(d.conditionProposal).toBe("good");
  });
});

describe("edit transitions", () => {
  it("ai -> ai_edited, empty -> user, and edited sources stay put", () => {
    let d = apply(fresh(), filled("title", "PS5"));
    d = apply(d, { type: "editField", field: "title", value: "PS5 Pro" });
    expect(d.fields.title.source).toBe("ai_edited");
    d = apply(d, { type: "editField", field: "title", value: "PS5 Pro 2TB" });
    expect(d.fields.title.source).toBe("ai_edited");

    d = apply(d, { type: "editField", field: "description", value: "Mine" });
    expect(d.fields.description.source).toBe("user");
  });

  it("an edit to the same value is not an edit", () => {
    const d = apply(fresh(), filled("title", "PS5"), { type: "editField", field: "title", value: "PS5" });
    expect(d.fields.title.source).toBe("ai");
  });

  it("keeps the sub-category's id when the extraction names it, and still takes the titles alone (P3-8)", () => {
    const named = apply(
      fresh(),
      filled("category", { parent: "Gaming", title: "Gaming Console", id: 41, slug: "gaming-vr-emerging-tech-gaming-console" })
    );
    // The id rides along; the slug is not kept.
    expect(named.fields.category).toMatchObject({ source: "ai" });
    expect(named.fields.category.value).toEqual({ id: 41, parent: "Gaming", title: "Gaming Console" });
    // The old shape: two titles, no id.
    const old = apply(fresh(), filled("category", { parent: "Gaming", title: "Gaming Console" }));
    expect(old.fields.category.value).toEqual({ parent: "Gaming", title: "Gaming Console" });
    // An id that is not a whole positive number is dropped, never trusted.
    for (const id of ["41", 0, -3, 4.5, null]) {
      const odd = apply(fresh(), filled("category", { parent: "Gaming", title: "Gaming Console", id }));
      expect(odd.fields.category.value).toEqual({ parent: "Gaming", title: "Gaming Console" });
    }
  });

  it("picking the AI's category from the sheet takes the id but is not an edit", () => {
    const ai = { parent: "Gaming", title: "Consoles" };
    let d = apply(fresh(), filled("category", ai), {
      type: "editField",
      field: "category",
      value: { id: 42, ...ai },
    });
    expect(d.fields.category).toMatchObject({ value: { id: 42, ...ai }, source: "ai" });

    // Still the model's, so a run on changed photos clears it as before.
    d = apply(d, { type: "runStarted" }, { type: "serverRunCounted", clearStaleAi: true });
    expect(d.fields.category).toMatchObject({ value: null, source: "empty" });

    const other = apply(fresh(), filled("category", ai), {
      type: "editField",
      field: "category",
      value: { id: 7, parent: "Gaming", title: "VR Headsets" },
    });
    expect(other.fields.category.source).toBe("ai_edited");
  });

  it("recomputes the deposit from the rate until the owner overrides it", () => {
    let d = apply(fresh(), { type: "editField", field: "rate", value: "610" });
    expect(d.fields.security_deposit.value).toBe("3050");
    d = apply(d, { type: "editField", field: "rate", value: "80" });
    expect(d.fields.security_deposit.value).toBe("500");
    d = apply(d, { type: "editField", field: "security_deposit", value: "1000" });
    expect(d.depositTouched).toBe(true);
    d = apply(d, { type: "editField", field: "rate", value: "900" });
    expect(d.fields.security_deposit.value).toBe("1000");
  });

  it("uses the category's deposit rule once it is known", () => {
    const d = apply(
      fresh(),
      { type: "editField", field: "rate", value: "100" },
      { type: "setDepositRule", rule: { multiplier: 10, floor: 200, round_to: 100 } }
    );
    expect(d.fields.security_deposit.value).toBe("1000");
  });

  it("prefills a location only when nothing is set", () => {
    const home = { locality: "Thane West, Thane", fullAddress: "", lat: 19.2, long: 72.97 };
    const other = { locality: "Bandra, Mumbai", fullAddress: "", lat: 19.05, long: 72.83 };
    const d = apply(fresh(), { type: "prefillLocation", value: home }, { type: "prefillLocation", value: other });
    expect(d.fields.location.value).toEqual(home);
  });
});

describe("photos", () => {
  it("caps at five and flags a changed photo set", () => {
    let d = fresh();
    for (let i = 0; i < 7; i++) d = apply(d, { type: "addPhoto", photo: photo(`p${i}`) });
    expect(d.photos).toHaveLength(5);
    expect(photosChangedSinceRun(d)).toBe(true);
    d = apply(d, { type: "runStarted" });
    // Settled only once the server takes the run, against what it was sent;
    // and only a run the server actually created counts against the three.
    expect(photosChangedSinceRun(d)).toBe(true);
    expect(d.extractionRuns).toBe(0);
    d = apply(d, {
      type: "serverRunCounted",
      sentPhotoIds: d.photos.map((p) => p.id),
    });
    expect(photosChangedSinceRun(d)).toBe(false);
    d = apply(d, { type: "runStarted" }, { type: "serverRunCounted" });
    expect(d.extractionRuns).toBe(2);
  });

  it("forgets a Keep-it for a replaced photo and for a new run", () => {
    let d = apply(
      fresh(),
      { type: "addPhoto", photo: photo("a") },
      { type: "addPhoto", photo: photo("b") },
      { type: "dismissWarning", warning: { type: "stock_photo", photo: 1 } },
      { type: "dismissWarning", warning: { type: "duplicate", photo: 2 } },
      { type: "replacePhoto", index: 0, photo: photo("a2") }
    );
    expect(d.dismissedWarnings).toEqual(["duplicate:2"]);
    d = apply(d, { type: "runStarted" });
    expect(d.dismissedWarnings).toEqual([]);
  });

  it("renumbers Keep-it choices when an earlier photo is removed", () => {
    const d = apply(
      fresh(),
      { type: "addPhoto", photo: photo("a") },
      { type: "addPhoto", photo: photo("b") },
      { type: "addPhoto", photo: photo("c") },
      { type: "dismissWarning", warning: { type: "stock_photo", photo: 1 } },
      { type: "dismissWarning", warning: { type: "duplicate", photo: 3 } },
      { type: "removePhoto", id: "a" }
    );
    expect(d.dismissedWarnings).toEqual(["duplicate:2"]);
  });

  it("keeps the cover on the same photo when an earlier one is removed", () => {
    let d = apply(
      fresh(),
      { type: "addPhoto", photo: photo("a") },
      { type: "addPhoto", photo: photo("b") },
      { type: "addPhoto", photo: photo("c") },
      { type: "setCover", id: "c" },
      { type: "removePhoto", id: "a" }
    );
    expect(d.photos[d.coverIndex].id).toBe("c");
    d = apply(d, { type: "removePhoto", id: "c" });
    expect(d.coverIndex).toBe(0);
  });

  it("drops and renumbers warnings when a photo goes", () => {
    const d = apply(
      fresh(),
      { type: "addPhoto", photo: photo("a") },
      { type: "addPhoto", photo: photo("b") },
      { type: "addPhoto", photo: photo("c") },
      { type: "addWarning", warning: { type: "stock_photo", photo: 1 } },
      { type: "addWarning", warning: { type: "unreadable", photo: 3 } },
      { type: "addWarning", warning: { type: "unreadable", photo: 3 } },
      { type: "removePhoto", id: "a" }
    );
    expect(d.warnings).toEqual([{ type: "unreadable", photo: 2, reason: undefined }]);
  });
});

describe("a run on a changed photo set", () => {
  const firstRun = () =>
    apply(
      fresh(),
      { type: "addPhoto", photo: photo("canon") },
      { type: "runStarted" },
      { type: "serverRunCounted", clearStaleAi: true },
      filled("brand_name", "Canon"),
      filled("category", { parent: "Electronics", title: "Camera & Lens" }),
      filled("title", "Canon DSLR"),
      filled("condition", "good"),
      { type: "editField", field: "title", value: "My Canon" }
    );

  const accepted: DraftAction[] = [
    { type: "runStarted" },
    { type: "serverRunCounted", clearStaleAi: true },
  ];

  it("drops the old photos' untouched AI values once the server takes the run", () => {
    const d = apply(
      firstRun(),
      { type: "removePhoto", id: "canon" },
      { type: "addPhoto", photo: photo("ps5") },
      ...accepted,
      // The new run can't read a brand: the old photo's brand must not survive.
      blank("brand_name")
    );
    expect(d.fields.brand_name).toMatchObject({ value: null, source: "empty" });
    expect(d.fields.category).toMatchObject({ value: null, source: "empty" });
    expect(d.fields.condition).toMatchObject({ value: null, source: "empty" });
    expect(d.conditionProposal).toBeNull();
    expect(d.fields.title).toMatchObject({ value: "My Canon", source: "ai_edited" });
  });

  it("keeps them when the run is refused before the server creates it", () => {
    // Offline, a pre-stream 503, 403 or 429: runStarted, then nothing.
    const d = apply(
      firstRun(),
      { type: "addPhoto", photo: photo("label") },
      { type: "runStarted" }
    );
    expect(d.fields.brand_name).toMatchObject({ value: "Canon", source: "ai" });
    expect(d.conditionProposal).toBe("good");
    // Nothing read the new photo, so Continue must still offer a run.
    expect(photosChangedSinceRun(d)).toBe(true);
  });

  it("leaves a photo that was still uploading marked unread", () => {
    const d = apply(
      firstRun(),
      { type: "addPhoto", photo: photo("late", "uploading") },
      { type: "runStarted" },
      // The run was sent only the uploaded photo.
      { type: "serverRunCounted", sentPhotoIds: ["canon"] },
      { type: "updatePhoto", id: "late", patch: { status: "done", remoteUrl: "https://cdn.example.com/late.jpg" } }
    );
    expect(photosChangedSinceRun(d)).toBe(true);
  });

  it("does not count a photo whose upload failed as a change", () => {
    let d = apply(
      firstRun(),
      { type: "addPhoto", photo: photo("broken", "failed") },
      { type: "runStarted" },
      { type: "serverRunCounted", sentPhotoIds: ["canon"] }
    );
    // Continue would send the same photo again: no new run.
    expect(photosChangedSinceRun(d)).toBe(false);
    // Once a retry succeeds it is new to the model.
    d = apply(d, {
      type: "updatePhoto",
      id: "broken",
      patch: { status: "done", remoteUrl: "https://cdn.example.com/broken.jpg" },
    });
    expect(photosChangedSinceRun(d)).toBe(true);
  });

  it("keeps a confirmed condition and the guess it agreed with", () => {
    const d = apply(
      firstRun(),
      { type: "confirmCondition", value: "good" },
      { type: "addPhoto", photo: photo("label") },
      ...accepted
    );
    expect(d.fields.condition).toMatchObject({ value: "good", source: "ai" });
    expect(d.conditionProposal).toBe("good");
  });

  it("drops an old guess the owner overruled", () => {
    const d = apply(
      firstRun(),
      { type: "confirmCondition", value: "fair" },
      { type: "addPhoto", photo: photo("label") },
      ...accepted
    );
    expect(d.fields.condition).toMatchObject({ value: "fair", source: "ai_edited" });
    expect(d.conditionProposal).toBeNull();
  });

  it("leaves values alone on a same-photo re-run (a category hint)", () => {
    const d = apply(
      firstRun(),
      { type: "runStarted" },
      { type: "serverRunCounted", clearStaleAi: false },
      blank("brand_name")
    );
    expect(d.fields.brand_name).toMatchObject({ value: "Canon", source: "ai" });
    expect(d.conditionProposal).toBe("good");
  });
});

describe("run budget", () => {
  it("believes the server's quota_runs over the local count", () => {
    const d = apply(fresh(), { type: "serverRunCounted" }, { type: "runsExhausted" });
    expect(d.extractionRuns).toBe(MAX_RUNS_PER_ATTEMPT);
    expect(canRunAgain(d)).toBe(false);
  });
});

describe("requirements", () => {
  it("names what is missing in Review order", () => {
    const d = fresh();
    expect(missingRequirements(d).map((m) => m.key)).toEqual([
      "rate",
      "condition",
      "category",
      "title",
      "description",
      "location",
      "worth",
    ]);
    expect(stillNeededLabel([{ key: "condition", label: "condition" }])).toBe(
      "Still needed: condition"
    );
    expect(
      stillNeededLabel([
        { key: "rate", label: "price" },
        { key: "condition", label: "condition" },
        { key: "title", label: "title" },
      ])
    ).toBe("Still needed: price, condition and title");
  });

  it("is satisfied once every required item is set", () => {
    const d = apply(
      fresh(),
      filled("category", { parent: "Gaming", title: "Consoles" }),
      filled("title", "Sony PS5"),
      filled("description", "My PS5."),
      { type: "confirmCondition", value: "good" },
      { type: "editField", field: "rate", value: "500" },
      { type: "editField", field: "worth", value: "45000" },
      {
        type: "prefillLocation",
        value: { locality: "Thane West, Thane", fullAddress: "", lat: 19.2, long: 72.97 },
      }
    );
    expect(missingRequirements(d)).toEqual([]);
  });

  it("asks for a deposit the owner cleared instead of sending 0", () => {
    const d = apply(fresh(), { type: "editField", field: "rate", value: "500" });
    expect(missingRequirements(d).map((m) => m.key)).not.toContain("deposit");
    const cleared = apply(d, { type: "editField", field: "security_deposit", value: "" });
    expect(missingRequirements(cleared).map((m) => m.key)).toContain("deposit");
  });

  it("rejects a zero or malformed price", () => {
    for (const rate of ["0", "abc", "-5", "1.234"]) {
      const d = apply(fresh(), { type: "editField", field: "rate", value: rate });
      expect(missingRequirements(d).map((m) => m.key)).toContain("rate");
    }
  });
});

describe("save-this-address intent", () => {
  it("starts unset, takes a type, and clears on null", () => {
    expect(fresh().saveAddressAs).toBeUndefined();
    const chosen = apply(fresh(), { type: "setSaveAddressAs", value: "home" });
    expect(chosen.saveAddressAs).toBe("home");
    expect(apply(chosen, { type: "setSaveAddressAs", value: "work" }).saveAddressAs).toBe("work");
    expect(apply(chosen, { type: "setSaveAddressAs", value: null }).saveAddressAs).toBeUndefined();
  });

  it("returns the same draft when nothing changes, so it is not re-saved", () => {
    const d = fresh();
    expect(draftReducer(d, { type: "setSaveAddressAs", value: null })).toBe(d);
    const chosen = apply(d, { type: "setSaveAddressAs", value: "other" });
    expect(draftReducer(chosen, { type: "setSaveAddressAs", value: "other" })).toBe(chosen);
  });

  it("survives a save and resume", () => {
    const d = apply(fresh(), { type: "setSaveAddressAs", value: "work" });
    expect(hydrateDraft(serializeDraft(d), NOW + 1000)!.saveAddressAs).toBe("work");
  });

  it("hydrates a draft stored before the field existed", () => {
    const stored = JSON.parse(serializeDraft(fresh()));
    expect("saveAddressAs" in stored).toBe(false);
    const restored = hydrateDraft(JSON.stringify(stored), NOW + 1000)!;
    expect(restored).not.toBeNull();
    expect(restored.saveAddressAs).toBeUndefined();
  });

  it("drops a stored value that is not an address type", () => {
    const stored = { ...JSON.parse(serializeDraft(fresh())), saveAddressAs: "office" };
    expect(hydrateDraft(JSON.stringify(stored), NOW + 1000)!.saveAddressAs).toBeUndefined();
  });
});

describe("persistence", () => {
  it("stores only uploaded photos and keeps the cover pointing at the same photo", () => {
    const d = apply(
      fresh(),
      { type: "addPhoto", photo: photo("a", "uploading") },
      { type: "addPhoto", photo: photo("b") },
      { type: "addPhoto", photo: photo("c") },
      { type: "setCover", id: "c" }
    );
    const restored = hydrateDraft(serializeDraft(d), NOW + 1000)!;
    expect(restored.photos.map((p) => p.id)).toEqual(["b", "c"]);
    expect(restored.photos[restored.coverIndex].id).toBe("c");
  });

  it("renumbers warnings and Keep-it choices past a dropped photo", () => {
    const d = apply(
      fresh(),
      { type: "addPhoto", photo: photo("a") },
      { type: "addPhoto", photo: photo("b", "uploading") },
      { type: "addPhoto", photo: photo("c") },
      { type: "addWarning", warning: { type: "stock_photo", photo: 3 } },
      { type: "addWarning", warning: { type: "unreadable", photo: 2 } },
      { type: "dismissWarning", warning: { type: "stock_photo", photo: 3 } }
    );
    const restored = hydrateDraft(serializeDraft(d), NOW + 1000)!;
    expect(restored.photos.map((p) => p.id)).toEqual(["a", "c"]);
    // C is photo 2 now; the warning about the dropped B is gone.
    expect(restored.warnings).toEqual([{ type: "stock_photo", photo: 2, reason: undefined }]);
    expect(restored.dismissedWarnings).toEqual(["stock_photo:2"]);
  });

  it("discards a draft older than 14 days", () => {
    const raw = serializeDraft(fresh());
    expect(hydrateDraft(raw, NOW + DRAFT_MAX_AGE_MS - 1)).not.toBeNull();
    expect(hydrateDraft(raw, NOW + DRAFT_MAX_AGE_MS + 1)).toBeNull();
  });

  it("returns null for garbage", () => {
    expect(hydrateDraft("{not json", NOW)).toBeNull();
    expect(hydrateDraft(JSON.stringify({ hello: 1 }), NOW)).toBeNull();
    expect(hydrateDraft(null, NOW)).toBeNull();
  });
});

describe("quantity and worth (ENG-155)", () => {
  it("starts at one unit, as the owner's own answer", () => {
    const d = fresh();
    expect(d.fields.quantity).toEqual({ value: "1", source: "user" });
    expect(missingRequirements(d).map((m) => m.key)).not.toContain("quantity");
  });

  it("asks again when the owner clears the quantity or types 0", () => {
    for (const value of ["", "0", "1.5"]) {
      const d = apply(fresh(), { type: "editField", field: "quantity", value });
      expect(missingRequirements(d).map((m) => m.key)).toContain("quantity");
    }
    const five = apply(fresh(), { type: "editField", field: "quantity", value: "5" });
    expect(five.fields.quantity.value).toBe("5");
    expect(missingRequirements(five).map((m) => m.key)).not.toContain("quantity");
  });

  it("reads the worth as a number of rupees, and still as the old money string (P3-8)", () => {
    expect(apply(fresh(), filled("worth", 45000)).fields.worth.value).toBe("45000");
    expect(apply(fresh(), filled("worth", "45000.00")).fields.worth.value).toBe("45000");
    expect(apply(fresh(), filled("worth", "45000")).fields.worth.value).toBe("45000");
    // No usable figure: nothing is suggested.
    expect(apply(fresh(), filled("worth", 0)).fields.worth.value).toBeNull();
    expect(apply(fresh(), filled("worth", "about fifty thousand")).fields.worth.value).toBeNull();
  });

  it("fills an untouched worth from the stream as a suggestion that still needs confirming", () => {
    const d = apply(fresh(), filled("worth", 45000, { confidence: 0.6 }));
    expect(d.fields.worth).toMatchObject({ value: "45000", source: "ai", confidence: 0.6 });
    expect(missingRequirements(d).map((m) => m.key)).toContain("worth");
  });

  it("counts a confirmed suggestion, and keeps it the owner's afterwards", () => {
    const d = apply(fresh(), filled("worth", 45000), { type: "confirmWorth" });
    expect(d.fields.worth).toMatchObject({ value: "45000", source: "user" });
    expect(missingRequirements(d).map((m) => m.key)).not.toContain("worth");
    // A later run cannot replace what the owner has confirmed.
    expect(apply(d, filled("worth", 99000)).fields.worth.value).toBe("45000");
  });

  it("counts a suggestion the owner changed", () => {
    const d = apply(fresh(), filled("worth", 45000), { type: "editField", field: "worth", value: "52000" });
    expect(d.fields.worth).toMatchObject({ value: "52000", source: "ai_edited" });
    expect(missingRequirements(d).map((m) => m.key)).not.toContain("worth");
  });

  it("never lets the model overwrite a worth the owner typed", () => {
    const d = apply(fresh(), { type: "editField", field: "worth", value: "30000" }, filled("worth", 45000));
    expect(d.fields.worth).toMatchObject({ value: "30000", source: "user" });
  });

  it("ignores a blank, an unusable figure and a suggestion of zero", () => {
    expect(apply(fresh(), blank("worth")).fields.worth).toEqual({ value: null, source: "empty" });
    expect(apply(fresh(), filled("worth", "a lot")).fields.worth.value).toBeNull();
    expect(apply(fresh(), filled("worth", 0)).fields.worth.value).toBeNull();
  });

  it("does not confirm a worth that is not a suggestion", () => {
    const empty = apply(fresh(), { type: "confirmWorth" });
    expect(empty.fields.worth).toEqual({ value: null, source: "empty" });
  });

  it("drops a suggestion made from photos that have since changed, and keeps a confirmed one", () => {
    const suggested = apply(fresh(), filled("worth", 45000));
    const rerun = apply(suggested, { type: "serverRunCounted", clearStaleAi: true });
    expect(rerun.fields.worth).toEqual({ value: null, source: "empty" });

    const confirmed = apply(suggested, { type: "confirmWorth" }, { type: "serverRunCounted", clearStaleAi: true });
    expect(confirmed.fields.worth.value).toBe("45000");
  });

  it("remembers the not-delivered choice, and survives storage", () => {
    const d = apply(fresh(), { type: "setNotDelivered", value: true });
    expect(d.notDelivered).toBe(true);
    const back = hydrateDraft(serializeDraft(d), NOW);
    expect(back?.notDelivered).toBe(true);
    expect(apply(d, { type: "setNotDelivered", value: false }).notDelivered).toBe(false);
  });

  it("gives a draft stored before the fields existed one unit and no worth", () => {
    const old = JSON.parse(serializeDraft(fresh()));
    delete old.fields.quantity;
    delete old.fields.worth;
    const back = hydrateDraft(JSON.stringify(old), NOW);
    expect(back?.fields.quantity).toEqual({ value: "1", source: "user" });
    expect(back?.fields.worth).toEqual({ value: null, source: "empty" });
  });

  it("is not worth resuming just because the quantity starts at one", () => {
    expect(isDraftWorthResuming(fresh())).toBe(false);
    expect(isDraftWorthResuming(apply(fresh(), { type: "editField", field: "quantity", value: "3" }))).toBe(true);
    expect(isDraftWorthResuming(apply(fresh(), { type: "editField", field: "worth", value: "100" }))).toBe(true);
  });
});
