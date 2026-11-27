import type { ListFlowDesign } from "@/dev/list-flow-seed";
import type { SavedAddress } from "@/lib/addresses";
import { createDraft } from "@/lib/list-flow/draft";
import type { ListingDraft, PhotoItem, Spec } from "@/lib/list-flow/types";
import { COVER_1984, FICTION_ID, LIST_FLOW_READS, kapoorBooks } from "./10-common";
import type { DevFixture } from "./registry";

/**
 * Section-10 fixtures of ENG-435 group C (Review, its category and spec sheets, Preview), merged into the registry
 * through 10.ts. Every one is a `design` seed (plan §2a): the screen draws the seed's draft, nothing is written or
 * sent, and the specs come from the seed, so no `POST …/specs/` goes out.
 */

const photo = (n: number): PhotoItem => ({
  id: `design-photo-${n}`,
  localUri: COVER_1984,
  remoteUrl: COVER_1984,
  source: "camera",
  status: "done",
});

/**
 * The pickup is a saved address, so Review shows "Edit flat or landmark for this listing" under the picker
 * (2083:14692); the draft's flat line is the address's own, so the field stays closed.
 */
const thaneWest: SavedAddress = {
  id: 9301,
  address: "Hill View, Thane West",
  address_line_1: "Flat 4, Hill View",
  address_line_2: "Near Upvan Lake",
  locality: "Thane West",
  address_type: "home",
  label: "",
  coordinates: { lat: 19.1972, long: 72.9722 },
  is_default: true,
  postal_code: "400606",
};

const spec = (key: string, label: string, over: Partial<Spec>): Spec => ({
  key,
  label,
  type: "enum",
  facet: "default",
  options: [],
  value: null,
  status: "filled",
  ...over,
});

/**
 * Author, Format and Language on the card; Publisher, Year, Pages and Brand behind "Add more detail" (Brand is
 * 2096:25440's sheet; the hint reads only the first three: "Publisher, Year, Pages and more. Optional.").
 */
const specs1984 = (language: string[] = ["English"]): Spec[] => [
  spec("author", "Author", { options: ["George Orwell"], value: "George Orwell" }),
  spec("format", "Format", { options: ["Paperback", "Hardcover"], value: "Paperback", status: "check" }),
  spec("language", "Language", {
    type: "multi_enum",
    options: ["English", "Hindi", "Marathi"],
    value: language,
  }),
  spec("publisher", "Publisher", { facet: "more", status: "blank" }),
  spec("year", "Year", { facet: "more", status: "blank" }),
  spec("pages", "Pages", { facet: "more", status: "blank" }),
  spec("brand", "Brand", {
    facet: "more",
    options: ["Canon", "Fujifilm", "GoPro", "Nikon", "Panasonic", "Sony"],
    value: "Sony",
  }),
];

/** The 1984 book on Review with its two checks still open (2083:14692): Daily ₹40, deposit ₹120 (3 × the day). */
const review1984 = (over: Partial<ListingDraft> = {}, language?: string[]): ListingDraft => {
  const base = createDraft("design-eng435-c", 0);
  return {
    ...base,
    photos: [photo(1), photo(2)],
    extractionRuns: 1,
    fields: {
      ...base.fields,
      category: { value: { id: FICTION_ID, parent: "Books", title: "Fiction" }, source: "ai" },
      title: { value: "1984 – George Orwell", source: "ai" },
      brand_name: { value: "Penguin Books", source: "ai" },
      model_name: { value: null, source: "empty", evidence: "label partly readable, photo 2" },
      condition: { value: "good", source: "ai" },
      description: {
        value: "Paperback of George Orwell's 1984, Penguin Modern Classics. Clean pages, light wear on the cover.",
        source: "ai",
      },
      plans: { value: [{ unit: "day", price: "40", min: 1 }], source: "user" },
      security_deposit: { value: "120", source: "ai" },
      location: {
        value: { locality: "Thane West", fullAddress: "Flat 4, Hill View, Near Upvan Lake", lat: 19.1972, long: 72.9722 },
        source: "user",
      },
      quantity: { value: "1", source: "user" },
      worth: { value: "350", source: "ai" },
    },
    conditionProposal: "good",
    conditionConfirmed: false,
    depositRule: { parent: "Books", multiplier: 3, floor: 100, round_to: 10, worth_share: null },
    reviewNote: null,
    specs: { categoryId: FICTION_ID, requestId: null, status: "ready", items: specs1984(language) },
    ...over,
  };
};

/** The note frames: the run ended without filling the form, so the price is still empty. */
const reviewWithNote = (note: "failed" | "quota"): ListingDraft => {
  const base = review1984({ reviewNote: note });
  return {
    ...base,
    fields: {
      ...base.fields,
      plans: { value: [{ unit: "day", price: "", min: 1 }], source: "user" },
      security_deposit: { value: null, source: "empty" },
    },
  };
};

/** Review's reads: the shared ones, plus the saved pickup address and the Books deposit rule. */
const REVIEW_READS = {
  ...LIST_FLOW_READS,
  "GET /my/addresses/": [thaneWest],
  "GET /deposit-rules/": [{ parent: "Books", multiplier: 3, floor: 100, round_to: 10, worth_share: null }],
};

const review = (design: ListFlowDesign): DevFixture => ({
  route: "ListReview",
  params: { design },
  responses: REVIEW_READS,
  session: { user: kapoorBooks },
});

/** Preview's draft: both checks done, the worth confirmed; the renter-facing specs in the frame's order. */
const preview1984 = (): ListingDraft => {
  const base = review1984();
  const items = specs1984();
  const pick = (key: string) => items.find((s) => s.key === key) as Spec;
  return {
    ...base,
    fields: {
      ...base.fields,
      condition: { value: "good", source: "user" },
      worth: { value: "350", source: "user" },
    },
    conditionConfirmed: true,
    // Author, Language, Format (2096:29125); nothing else carries a value, so nothing else is listed.
    specs: {
      ...base.specs,
      items: [pick("author"), pick("language"), pick("format"), { ...pick("brand"), value: null }],
    },
  };
};

const preview: DevFixture = {
  route: "ListPreview",
  params: { design: { draft: preview1984() } },
  responses: LIST_FLOW_READS,
  session: { user: kapoorBooks },
};

export const fixtures: Record<string, DevFixture> = {
  // list-review · checks pending (01): F+scroll, 2623 of content.
  "2083:14692": review({ draft: review1984(), run: { status: "done" } }),
  // list-reading · failed → lands on Review with a note (the note follows `draft.reviewNote`, not the run).
  "2095:24558": review({ draft: reviewWithNote("failed"), run: { status: "failed" } }),
  // list-reading · quota (rate limited) → lands on Review with a note.
  "2095:24717": review({ draft: reviewWithNote("quota"), run: { status: "rate_limited" } }),
  // category-sheet · parents: opens on mount over the Review backdrop.
  "2096:24835": review({ draft: review1984(), run: { status: "done" }, sheet: "category" }),
  // category-sheet · subcategories (Books).
  "2096:25059": review({ draft: review1984(), run: { status: "done" }, sheet: { category: "Books" } }),
  // spec-sheet · one choice (radios): Format, Paperback.
  "2096:25258": review({ draft: review1984(), run: { status: "done" }, sheet: { spec: "format" } }),
  // spec-sheet · brand (searchable list): Sony.
  "2096:25440": review({ draft: review1984(), run: { status: "done" }, sheet: { spec: "brand" } }),
  // spec-sheet · several choices (checkboxes): English and Hindi.
  "2097:31093": review({
    draft: review1984({}, ["English", "Hindi"]),
    run: { status: "done" },
    sheet: { spec: "language" },
  }),
  // list-preview · idle (top) and full scroll: blocked on ENG-429 (image, strip, map) for a pass.
  "2097:30938": preview,
  "2096:29125": preview,
};
