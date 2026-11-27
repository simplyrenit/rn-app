import type { ChecklistRow } from "@/context/list-draft-context";
import type { ListFlowDesign } from "@/dev/list-flow-seed";
import { createDraft } from "@/lib/list-flow/draft";
import type { ListingDraft, PhotoItem, PhotoStatus } from "@/lib/list-flow/types";
import { COVER_1984, FICTION_ID, LIST_FLOW_READS, kapoorBooks, terms } from "./10-common";
import type { DevFixture } from "./registry";
import { Image } from "react-native";

/**
 * Section-10 fixtures of ENG-435 group B (add photos, reading, their sheets), merged into the registry through 10.ts.
 * Every one is a `design` seed (plan §2a): the screen draws the seed's draft and run, and nothing is written,
 * uploaded or extracted.
 */

/** The whole 1984 photo as the scan panel draws it (FIT): the tile crop padded to the frame's margins. */
const PHOTO_1984: string = Image.resolveAssetSource(require("../assets/design-1984-photo.png"))?.uri ?? "";

const photo = (n: number, status: PhotoStatus = "done", uri = COVER_1984): PhotoItem => ({
  id: `design-photo-${n}`,
  localUri: uri,
  remoteUrl: uri,
  source: "camera",
  status,
});

const draft = (over: Partial<ListingDraft> = {}): ListingDraft => ({
  ...createDraft("design-eng435-b", 0),
  ...over,
});

/** The 1984 book as the reading frames have read it: AI category, title, brand, a condition guess; no model. */
const read1984 = (over: Partial<ListingDraft>): ListingDraft => {
  const base = draft({ photos: [photo(1, "done", PHOTO_1984), photo(2, "done", PHOTO_1984)], extractionRuns: 1 });
  return {
    ...base,
    fields: {
      ...base.fields,
      category: { value: { id: FICTION_ID, parent: "Books", title: "Fiction" }, source: "ai" },
      title: { value: "1984 – George Orwell", source: "ai" },
      brand_name: { value: "Penguin Books", source: "ai" },
      condition: { value: "good", source: "ai" },
    },
    conditionProposal: "good",
    ...over,
  };
};

/** Category, title and brand in, the model left blank: the running frames (2095:24471, 01 2082:14565). */
const RUNNING_CHECKLIST: ChecklistRow[] = [
  { field: "category", status: "filled" },
  { field: "title", status: "filled" },
  { field: "brand_name", status: "filled" },
  { field: "model_name", status: "blank" },
];

const signedIn = { session: { user: kapoorBooks } };
const addPhotos = (design: ListFlowDesign, ownerTermsAccepted: boolean, params: object = {}): DevFixture => ({
  route: "ListAddPhotos",
  params: { ...params, design },
  responses: { ...LIST_FLOW_READS, "GET /terms/": terms(ownerTermsAccepted) },
  ...signedIn,
});
const reading = (design: ListFlowDesign): DevFixture => ({
  route: "ListReading",
  params: { design },
  responses: LIST_FLOW_READS,
  ...signedIn,
});

export const fixtures: Record<string, DevFixture> = {
  // list-add-photos · fresh (owner terms to tick)
  "2094:24997": addPhotos({ draft: draft() }, false),
  // list-add-photos · photos uploading: the cover and photo 2 in, 3 uploading, 4 failed.
  "2094:25067": addPhotos(
    { draft: draft({ photos: [photo(1), photo(2), photo(3, "uploading"), photo(4, "failed")] }) },
    true
  ),
  // list-add-photos · L-12b retake warning: photo 2 looks like a stock photo.
  "2094:25123": addPhotos(
    { draft: draft({ photos: [photo(1), photo(2)], warnings: [{ type: "stock_photo", photo: 2 }], extractionRuns: 1 }) },
    true,
    { focusPhoto: 2 }
  ),
  // add-photo-sheet · on list-add-photos (the fresh backdrop)
  "2094:25168": addPhotos({ draft: draft(), sheet: "add-photo" }, false),
  // resume-draft-sheet · on list-add-photos: an untitled draft, so "Finish your last listing?"
  "2094:25236": addPhotos({ draft: draft({ photos: [photo(1)] }), resumable: true }, false),
  // list-reading · unreadable (L-13b): the run is done and photo 2's label could not be read.
  "2095:24375": reading({
    draft: read1984({ warnings: [{ type: "unreadable", photo: 2 }] }),
    run: {
      status: "done",
      photoCount: 2,
      checklist: [
        ...RUNNING_CHECKLIST,
        { field: "condition", status: "filled" },
        { field: "description", status: "blank" },
      ],
    },
  }),
  // list-reading · retake warning: still reading, photo 2 looks like a stock photo.
  "2095:24471": reading({
    draft: read1984({ warnings: [{ type: "stock_photo", photo: 2 }] }),
    run: { status: "running", photoCount: 2, checklist: RUNNING_CHECKLIST },
  }),
  // list-reading · running (01): no warning, so the taller panel.
  "2082:14565": reading({
    draft: read1984({}),
    run: { status: "running", photoCount: 2, checklist: RUNNING_CHECKLIST },
  }),
};
