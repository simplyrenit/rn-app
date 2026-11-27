import type { NeedingDraft, PhotoJob } from "@/lib/draft-photos";
import type { KycStatusResponse } from "@/lib/types";
import type { DevFixture } from "./registry";
import { fixtures as b } from "./10-b";
import { fixtures as c } from "./10-c";
import { COVER_1984, kapoorBooks, merchantPending, merchantRejected } from "./10-common";

// Group A (ENG-435): the Post tab gate, the draft-photo walk and Submitted. Groups B and C keep theirs in 10-b / 10-c.
// Every `List*` and `DraftPhotos` entry carries `params.design` (at least `{}`): each screen's write and navigation
// guards are `if (design)`, so a fixture without it would run the real flow (plan §0.2, checked by the seed test).

const postTab = { route: "MainTabs", params: { screen: "Post" } } as const;

// The walk's drafts (2094:22877): the frame's four first, then plain ones up to the 36 still waiting.
const NAMED: [string, string][] = [
  ["Bosch GSB 500W impact drill", "RN-0142"],
  ["Canon EOS 1500D kit", "RN-0143"],
  ["JBL PartyBox 310", "RN-0144"],
  ["Decathlon 2-person tent", "RN-0145"],
];
const drafts: NeedingDraft[] = Array.from({ length: 36 }, (_, i) => {
  const [title, shop_code] = NAMED[i] ?? [`Draft ${i + 1}`, `RN-${String(142 + i).padStart(4, "0")}`];
  return { name: `design-draft-${i + 1}`, title, shop_code };
});

const job = (i: number, status: PhotoJob["status"]): PhotoJob => ({
  id: `design-job-${i}`,
  name: `design-draft-taken-${i}`,
  title: `Draft taken ${i}`,
  uri: "",
  url: null,
  status,
  error: null,
  attachSent: false,
});

const kycNone: KycStatusResponse = {
  kyc_status: "none",
  case_ref: null,
  business_verified: false,
  business_verified_at: null,
  reason_code: null,
  next_action: null,
  updated_at: null,
};

const submitted = (params: object, responses: Record<string, unknown> = {}): DevFixture => ({
  route: "ListSubmitted",
  params: { productName: "1984 – George Orwell", coverUrl: COVER_1984, ...params },
  responses,
  session: { user: kapoorBooks },
});

const a: Record<string, DevFixture> = {
  // Signed out: a fixture cannot sign the app out, so this one needs a signed-out device.
  "2094:22625": { ...postTab, responses: {} },
  "2094:22718": { ...postTab, responses: {}, session: { user: merchantPending } },
  "2094:22770": { ...postTab, responses: {}, session: { user: merchantRejected } },
  // Approved: a `replace` to MainTabs › Post skips the tab's `tabPress`, so the fallback shows.
  "2094:22828": { ...postTab, responses: {}, session: { user: kapoorBooks } },

  "2094:22877": {
    route: "DraftPhotos",
    params: {
      design: {
        walk: { waiting: drafts, skipped: [], taken: 6, total: 42 },
        jobs: [job(1, "uploading"), job(2, "uploading")],
      },
    },
    responses: {
      "GET /shop/drafts/needing-photos/": { results: drafts, total_results: 42, current_page: 1, total_pages: 1 },
    },
    session: { user: kapoorBooks },
  },
  "2094:22940": {
    route: "DraftPhotos",
    params: {
      design: { walk: { waiting: [], skipped: drafts.slice(0, 3), taken: 38, total: 42 }, jobs: [job(1, "failed")] },
    },
    responses: {},
    session: { user: kapoorBooks },
  },
  "2094:22989": {
    route: "DraftPhotos",
    params: { design: { walk: { waiting: [], skipped: [], taken: 42, total: 42 }, jobs: [] } },
    responses: {},
    session: { user: kapoorBooks },
  },
  // No walk and no read listed: the read 404s, so "We couldn't load your drafts" (not `not_shop_owner`).
  "2094:23035": { route: "DraftPhotos", params: { design: {} }, responses: {}, session: { user: kapoorBooks } },

  "2096:29335": submitted({ status: "checking", design: { kycNudge: true } }, { "GET /kyc/merchant/status/": kycNone }),
  "2096:29395": submitted({ status: "live", design: {} }),
  // `submittedCopy` builds "The price looks too high. Open it from My products to change it, and we will look again."
  "2096:29435": submitted({
    status: "flagged",
    reasons: [{ code: "price_too_high", text: "The price looks too high" }],
    design: {},
  }),
  "2097:31046": submitted(
    { status: "live", design: { ringPermission: "ask" } },
    { "GET /shop/": { name: "Kapoor Books", is_merchant: true, can_take_bookings: true } }
  ),
};

/** Design fixtures for Figma section 10, keyed by frame id (registry.ts). */
export const fixtures: Record<string, DevFixture> = { ...a, ...b, ...c };
