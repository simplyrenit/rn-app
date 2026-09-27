import { describe, expect, it } from "@jest/globals";
import { createDraft, draftReducer, DraftAction } from "../draft";
import { buildCreatePayload } from "../payload";
import { ListingDraft, PhotoItem } from "../types";

const photo = (id: string, source: PhotoItem["source"], status: PhotoItem["status"] = "done"): PhotoItem => ({
  id,
  localUri: `file:///${id}.jpg`,
  remoteUrl: status === "done" ? `https://cdn.example.com/${id}.jpg` : undefined,
  source,
  status,
});

function build(...actions: DraftAction[]) {
  return actions.reduce<ListingDraft>(
    (d, a) => draftReducer(d, a) as ListingDraft,
    createDraft("5b0c1c9e-4c6f-4a79-9f2e-2f1b8a2f9d11", 0)
  );
}

const contact = { name: "Asha Rao", phone: "+919800000000" };

describe("buildCreatePayload", () => {
  const draft = build(
    { type: "addPhoto", photo: photo("a", "camera") },
    { type: "addPhoto", photo: photo("b", "gallery") },
    { type: "addPhoto", photo: photo("c", "camera", "failed") },
    { type: "setCover", id: "b" },
    {
      type: "mergeAi",
      event: { field: "category", status: "filled", value: { parent: "Gaming", title: "Consoles" } },
    },
    { type: "mergeAi", event: { field: "title", status: "filled", value: "Sony PS5" } },
    { type: "mergeAi", event: { field: "brand_name", status: "filled", value: "Sony" } },
    { type: "mergeAi", event: { field: "condition", status: "filled", value: "Good" } },
    { type: "mergeAi", event: { field: "description", status: "filled", value: "My PS5." } },
    { type: "editField", field: "title", value: "Sony PS5 with 2 controllers" },
    { type: "editField", field: "model_name", value: "CFI-1216A" },
    { type: "confirmCondition", value: "good" },
    { type: "editField", field: "rate", value: "610" },
    {
      type: "prefillLocation",
      value: { locality: "Thane West, Thane", fullAddress: "Flat 1203", lat: 19.2, long: 72.97 },
    }
  );
  const payload = buildCreatePayload(draft, contact);

  it("sends uploaded images in order, with the cover picked from them", () => {
    expect(payload.images).toEqual(["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"]);
    expect(payload.cover_image).toBe("https://cdn.example.com/b.jpg");
    expect(payload.photo_sources).toEqual(["camera", "gallery"]);
  });

  it("sends condition in lower case", () => {
    expect(payload.condition).toBe("good");
  });

  it("reports where each value came from", () => {
    expect(payload.field_sources).toEqual({
      category: "ai",
      title: "ai_edited",
      brand_name: "ai",
      model_name: "user",
      condition: "ai",
      description: "ai",
      rate: "user",
      security_deposit: "user",
      location: "user",
    });
  });

  it("maps the rest of today's create shape plus the §5.2 fields", () => {
    expect(payload).toMatchObject({
      title: "Sony PS5 with 2 controllers",
      description: "My PS5.",
      rate: 610,
      security_deposit: 3050,
      currency: "INR",
      category: { parent: "Gaming", title: "Consoles" },
      brand_name: "Sony",
      model_name: "CFI-1216A",
      usage_description: "",
      coordinates: { lat: 19.2, long: 72.97 },
      location: "Thane West, Thane",
      full_address: "Flat 1203",
      contact_name: "Asha Rao",
      contact_number: "+919800000000",
      blocked_dates: [],
      extraction_attempt_id: "5b0c1c9e-4c6f-4a79-9f2e-2f1b8a2f9d11",
    });
  });

  it("falls back to the first uploaded photo when the cover never uploaded", () => {
    const d = build(
      { type: "addPhoto", photo: photo("a", "camera", "failed") },
      { type: "addPhoto", photo: photo("b", "camera") }
    );
    expect(buildCreatePayload(d, contact).cover_image).toBe("https://cdn.example.com/b.jpg");
  });
});
