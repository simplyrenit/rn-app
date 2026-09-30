/**
 * The photo-first listing flow's data model (ENG-10, IMPLEMENTATION.md §7.2).
 *
 * Everything here is plain data so the reducer in `draft.ts` can stay pure and
 * be unit-tested without React, storage or the network.
 */

export type FieldName =
  | "category"
  | "title"
  | "brand_name"
  | "model_name"
  | "condition"
  | "description"
  | "usage_description"
  | "rate"
  | "security_deposit"
  | "location";

/** The fields the extraction service reports on (§4.3). Anything else is ignored. */
export const AI_FIELDS = [
  "category",
  "title",
  "brand_name",
  "model_name",
  "condition",
  "description",
] as const;
export type AiFieldName = (typeof AI_FIELDS)[number];

export type FieldSource = "empty" | "ai" | "ai_edited" | "user";

export type Condition = "excellent" | "good" | "fair";
export const CONDITIONS: Condition[] = ["excellent", "good", "fair"];

export interface CategoryValue {
  /**
   * The sub-category's server id, when the picker had one. AI extraction and
   * drafts saved before ENG-28 carry only the titles.
   */
  id?: number;
  parent: string;
  title: string;
}

export interface LocationValue {
  /** "Locality, City" — what the create payload sends as `location`. */
  locality: string;
  /** Flat, building, landmark. Owner-only on the server (§5.2). */
  fullAddress: string;
  lat: number;
  long: number;
}

export interface FieldValues {
  category: CategoryValue;
  title: string;
  brand_name: string;
  model_name: string;
  condition: Condition;
  description: string;
  usage_description: string;
  /** Kept as the typed text; parsed only when it is used. */
  rate: string;
  security_deposit: string;
  location: LocationValue;
}

export interface FieldState<T> {
  value: T | null;
  source: FieldSource;
  /** From the model, for display only. */
  confidence?: number;
  /** e.g. "label partly readable, photo 2" — drives the blank-field hint. */
  evidence?: string;
}

export type DraftFields = { [K in FieldName]: FieldState<FieldValues[K]> };

export type PhotoSource = "camera" | "gallery";
export type PhotoStatus = "uploading" | "done" | "failed";

export interface PhotoItem {
  /** Stable key for the tile; survives reordering and removal of siblings. */
  id: string;
  localUri: string;
  remoteUrl?: string;
  source: PhotoSource;
  status: PhotoStatus;
  /** Automatic retries already spent on this photo (§7.3 allows one). */
  retries?: number;
}

export type WarningType =
  | "unreadable"
  | "stock_photo"
  | "screenshot"
  | "not_an_item"
  | "duplicate";

export interface ListingWarning {
  type: WarningType;
  /** 1-based, in the order the photos were sent. */
  photo?: number;
  reason?: string;
}

export interface DepositRule {
  parent?: string;
  multiplier: number;
  floor: number;
  round_to: number;
}

// ---- Specs (ENG-34) -----------------------------------------------------------

export type SpecType = "enum" | "multi_enum";
/** An option for `enum`, a list of options for `multi_enum`. */
export type SpecValue = string | string[];
/**
 * `filled` and `check` come from the server (`check` is a value it is less
 * sure of); `user` is anything the owner has set, confirmed or cleared.
 */
export type SpecStatus = "filled" | "check" | "blank" | "user";

export interface Spec {
  key: string;
  label: string;
  type: SpecType;
  /** "default" specs sit on the card; anything else waits behind "Add more detail". */
  facet: string;
  options: string[];
  value: SpecValue | null;
  status: SpecStatus;
}

export interface SpecsState {
  /** The sub-category the specs were asked for; null before any request. */
  categoryId: number | null;
  /**
   * The request the draft is waiting on. Only its answer is taken: the same
   * category can be asked for twice (B, A, B), and the first B's late failure
   * must not land on the second B.
   */
  requestId: string | null;
  /** `unavailable` means the call failed: no card, and never a blocker. */
  status: "idle" | "loading" | "ready" | "unavailable";
  items: Spec[];
}

export interface ListingDraft {
  /** uuid v4, created when L-12 opens a fresh draft. */
  attemptId: string;
  startedAt: number;
  photos: PhotoItem[];
  coverIndex: number;
  fields: DraftFields;
  /**
   * The model's condition guess, kept apart from the value so Review can keep
   * outlining "AI's guess" after the owner has picked something else, and so
   * `condition_confirmed` can report whether the owner agreed with it.
   */
  conditionProposal: Condition | null;
  conditionConfirmed: boolean;
  depositTouched: boolean;
  /** The rule `security_deposit` is derived from while untouched. */
  depositRule: DepositRule | null;
  warnings: ListingWarning[];
  /** Warnings the owner chose to keep ("Keep it"); not shown again. */
  dismissedWarnings: string[];
  extractionRuns: number;
  /**
   * The photos the last run the server accepted was sent; null before any.
   * Whether the photos changed since is derived from this against the
   * uploaded photos (`photosChangedSinceRun` in draft.ts), never stored.
   */
  lastRunPhotoIds: string[] | null;
  /**
   * Why Review opened without AI help, when it did. Persisted so a resumed
   * draft still explains its blanks.
   */
  reviewNote: "failed" | "quota" | null;
  specs: SpecsState;
}

// ---- Wire shapes (IMPLEMENTATION.md §4.6) ----------------------------------

export interface ExtractionRequest {
  attempt_id: string;
  image_urls: string[];
  photo_sources: PhotoSource[];
  category_hint: CategoryValue | null;
}

export interface RunEvent {
  run_id: string;
  attempt_id: string;
  provider: string;
  model: string;
  prompt_version: string;
}

export interface FieldEvent {
  field: string;
  status: "filled" | "blank";
  value: unknown;
  confidence?: number;
  evidence?: string;
}

export interface WarningEvent {
  type: WarningType | string;
  photo?: number;
  reason?: string;
}

export interface WireDepositRule {
  parent?: string;
  multiplier: string | number;
  floor: string | number;
  round_to: string | number;
}

export interface DoneEvent {
  run_id: string;
  filled: string[];
  blank: string[];
  deposit_rule?: WireDepositRule | null;
  latency_ms?: number;
}

export interface ExtractionJsonResponse {
  run: RunEvent;
  fields: FieldEvent[];
  warnings: WarningEvent[];
  done: DoneEvent;
}

/** `POST listing-extractions/specs/` (ENG-34 contract). */
export interface SpecsRequest {
  attempt_id: string;
  category_id: number;
  title?: string;
  brand_name?: string;
  model_name?: string;
  description?: string;
}

export interface WireSpec {
  key: string;
  label: string;
  type: string;
  facet: string;
  options: string[];
  value: unknown;
  status: string;
}

export interface SpecsResponse {
  category_id: number;
  specs: WireSpec[];
}

/**
 * §4.6's pre-stream error codes and the client-side failure reasons. The
 * server may send codes this list does not know (in an `error` event or a
 * 503 body); those are passed through as they are, for `extraction_failed`.
 */
export type ExtractionErrorCode =
  | "invalid_request"
  | "merchant_not_approved"
  | "quota_attempts"
  | "quota_runs"
  | "extraction_unavailable"
  | "timeout"
  | "network"
  | "server_error"
  | "unauthorized"
  | "no_photos"
  | (string & {});
