import { computeDepositDefault, parseRate } from "./deposit";
import {
  AI_FIELDS,
  AiFieldName,
  CONDITIONS,
  CategoryValue,
  Condition,
  DepositRule,
  DraftFields,
  FieldEvent,
  FieldName,
  FieldSource,
  FieldValues,
  ListingDraft,
  ListingWarning,
  PhotoItem,
  WarningEvent,
  WarningType,
} from "./types";

export const MAX_PHOTOS = 5;
export const MAX_RUNS_PER_ATTEMPT = 3;
export const DRAFT_STORAGE_KEY = "listing-draft-v1";
export const DRAFT_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const FIELD_NAMES: FieldName[] = [
  "category",
  "title",
  "brand_name",
  "model_name",
  "condition",
  "description",
  "usage_description",
  "rate",
  "security_deposit",
  "location",
];

function emptyFields(): DraftFields {
  const fields = {} as Record<FieldName, { value: null; source: FieldSource }>;
  for (const name of FIELD_NAMES) fields[name] = { value: null, source: "empty" };
  return fields as unknown as DraftFields;
}

export function createDraft(attemptId: string, now: number): ListingDraft {
  return {
    attemptId,
    startedAt: now,
    photos: [],
    coverIndex: 0,
    fields: emptyFields(),
    conditionProposal: null,
    conditionConfirmed: false,
    depositTouched: false,
    depositRule: null,
    warnings: [],
    dismissedWarnings: [],
    extractionRuns: 0,
    photosChangedSinceRun: false,
    reviewNote: null,
  };
}

// ---- Source transitions -----------------------------------------------------

/** An AI value may land only on a field the owner has not touched (§7.2). */
export function aiMayWrite(source: FieldSource) {
  return source === "empty" || source === "ai";
}

/** What an owner edit turns a field's source into. */
export function editedSource(source: FieldSource): FieldSource {
  if (source === "ai") return "ai_edited";
  if (source === "empty") return "user";
  return source;
}

// ---- AI value validation -----------------------------------------------------

function isAiField(field: string): field is AiFieldName {
  return (AI_FIELDS as readonly string[]).includes(field);
}

function isCondition(value: unknown): value is Condition {
  return typeof value === "string" && (CONDITIONS as string[]).includes(value);
}

/**
 * The server validates before it sends (§4.4); this only guards the draft's
 * types, so a malformed event can never put an object into a text field.
 */
function coerceAiValue(field: AiFieldName, value: unknown) {
  if (field === "category") {
    const v = value as Partial<CategoryValue> | null;
    if (v && typeof v.parent === "string" && typeof v.title === "string" && v.parent && v.title) {
      return { parent: v.parent, title: v.title };
    }
    return null;
  }
  if (field === "condition") {
    const lowered = typeof value === "string" ? value.toLowerCase() : value;
    return isCondition(lowered) ? lowered : null;
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

// ---- Warnings ---------------------------------------------------------------

const KNOWN_WARNINGS: WarningType[] = [
  "unreadable",
  "stock_photo",
  "screenshot",
  "not_an_item",
  "duplicate",
];

export function warningKey(w: Pick<ListingWarning, "type" | "photo">) {
  return `${w.type}:${w.photo ?? 0}`;
}

// ---- Actions ----------------------------------------------------------------

export type DraftAction =
  | { type: "reset"; draft: ListingDraft | null }
  | { type: "addPhoto"; photo: PhotoItem }
  | { type: "updatePhoto"; id: string; patch: Partial<PhotoItem> }
  | { type: "replacePhoto"; index: number; photo: PhotoItem }
  | { type: "removePhoto"; id: string }
  | { type: "setCover"; id: string }
  | { type: "runStarted" }
  | { type: "serverRunCounted" }
  | { type: "runsExhausted" }
  | { type: "mergeAi"; event: FieldEvent }
  | { type: "addWarning"; warning: WarningEvent }
  | { type: "dismissWarning"; warning: Pick<ListingWarning, "type" | "photo"> }
  | { type: "editField"; field: Exclude<FieldName, "condition">; value: unknown }
  | { type: "confirmCondition"; value: Condition }
  | { type: "prefillLocation"; value: FieldValues["location"] }
  | { type: "setDepositRule"; rule: DepositRule | null }
  | { type: "setReviewNote"; note: ListingDraft["reviewNote"] };

/** Recompute the deposit default while the owner has not overridden it. */
function withDerivedDeposit(draft: ListingDraft): ListingDraft {
  if (draft.depositTouched) return draft;
  const deposit = computeDepositDefault(
    parseRate(draft.fields.rate.value),
    draft.depositRule ?? undefined
  );
  const current = draft.fields.security_deposit;
  const next =
    deposit === null
      ? { value: null, source: "empty" as FieldSource }
      : // The default is derived from the owner's own rate, not from the model,
        // so it is reported as the owner's value (§5.2's example sends "user").
        { value: String(deposit), source: "user" as FieldSource };
  if (current.value === next.value && current.source === next.source) return draft;
  return { ...draft, fields: { ...draft.fields, security_deposit: next } };
}

function mergeAi(draft: ListingDraft, event: FieldEvent): ListingDraft {
  if (!isAiField(event.field)) return draft;
  const field = event.field;
  const current = draft.fields[field];

  if (event.status === "blank") {
    // Only an untouched, still-empty field takes the evidence: it is what the
    // hint under the field reads from. A blank never clears an earlier value.
    if (current.source !== "empty" || current.value !== null) return draft;
    return {
      ...draft,
      fields: {
        ...draft.fields,
        [field]: {
          ...current,
          confidence: event.confidence,
          evidence: event.evidence,
        },
      },
    };
  }

  const value = coerceAiValue(field, event.value);
  if (value === null) return draft;

  if (field === "condition") {
    // A proposal, never a confirmation — and a later run cannot overturn a
    // condition the owner has already tapped.
    if (draft.conditionConfirmed || !aiMayWrite(current.source)) return draft;
    return {
      ...draft,
      conditionProposal: value as Condition,
      fields: {
        ...draft.fields,
        condition: {
          value: value as Condition,
          source: "ai",
          confidence: event.confidence,
          evidence: event.evidence,
        },
      },
    };
  }

  if (!aiMayWrite(current.source)) return draft;
  return {
    ...draft,
    fields: {
      ...draft.fields,
      [field]: {
        value,
        source: "ai",
        confidence: event.confidence,
        evidence: event.evidence,
      },
    },
  };
}

/**
 * Drop the untouched AI values when a run starts on a changed photo set.
 *
 * They describe photos that may no longer be in the listing, and because a
 * blank never clears an earlier value (see `mergeAi`), a new run that can't
 * read the brand would otherwise leave the old photo's brand standing, still
 * marked "ai", on a different item. Anything the owner typed, edited or
 * confirmed stays. Same-photo re-runs (a category hint) keep today's values.
 */
function withoutStaleAi(draft: ListingDraft): ListingDraft {
  const fields = { ...draft.fields } as Record<FieldName, { value: unknown; source: FieldSource }>;
  let changed = false;
  for (const name of AI_FIELDS) {
    if (name === "condition" && draft.conditionConfirmed) continue;
    if (fields[name].source !== "ai") continue;
    fields[name] = { value: null, source: "empty" };
    changed = true;
  }
  if (!changed) return draft;
  return {
    ...draft,
    fields: fields as unknown as DraftFields,
    conditionProposal: draft.conditionConfirmed ? draft.conditionProposal : null,
  };
}

function isBlankValue(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value === "");
}

function editField(
  draft: ListingDraft,
  field: Exclude<FieldName, "condition">,
  value: unknown
): ListingDraft {
  const current = draft.fields[field] as { value: unknown; source: FieldSource };
  const nextValue = isBlankValue(value) ? null : value;
  if (JSON.stringify(current.value) === JSON.stringify(nextValue)) return draft;

  // Clearing keeps the edited source, so a later run cannot refill the field.
  const next = {
    ...draft,
    fields: {
      ...draft.fields,
      [field]: { ...current, value: nextValue, source: editedSource(current.source) },
    },
  } as ListingDraft;

  if (field === "security_deposit") return { ...next, depositTouched: true };
  if (field === "rate") return withDerivedDeposit(next);
  return next;
}

function keyPhoto(key: string) {
  return Number(key.split(":")[1] ?? 0);
}

function renumberDismissedAfterRemoval(keys: string[], removed: number) {
  return keys
    .filter((k) => keyPhoto(k) !== removed)
    .map((k) => {
      const photo = keyPhoto(k);
      return photo > removed ? `${k.split(":")[0]}:${photo - 1}` : k;
    });
}

function renumberWarningsAfterRemoval(warnings: ListingWarning[], removed: number) {
  return warnings
    .filter((w) => w.photo !== removed)
    .map((w) => (w.photo && w.photo > removed ? { ...w, photo: w.photo - 1 } : w));
}

export function draftReducer(
  draft: ListingDraft | null,
  action: DraftAction
): ListingDraft | null {
  if (action.type === "reset") return action.draft;
  if (!draft) return draft;

  switch (action.type) {
    case "addPhoto":
      if (draft.photos.length >= MAX_PHOTOS) return draft;
      return {
        ...draft,
        photos: [...draft.photos, action.photo],
        photosChangedSinceRun: true,
      };

    case "updatePhoto":
      return {
        ...draft,
        photos: draft.photos.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
      };

    case "replacePhoto": {
      if (action.index < 0 || action.index >= draft.photos.length) return draft;
      const photos = draft.photos.slice();
      photos[action.index] = action.photo;
      const photoNumber = action.index + 1;
      return {
        ...draft,
        photos,
        warnings: draft.warnings.filter((w) => w.photo !== photoNumber),
        // A "Keep it" was about the old photo in this slot, not the new one.
        dismissedWarnings: draft.dismissedWarnings.filter((k) => keyPhoto(k) !== photoNumber),
        photosChangedSinceRun: true,
      };
    }

    case "removePhoto": {
      const index = draft.photos.findIndex((p) => p.id === action.id);
      if (index < 0) return draft;
      const photos = draft.photos.filter((p) => p.id !== action.id);
      let coverIndex = draft.coverIndex;
      if (index === coverIndex) coverIndex = 0;
      else if (index < coverIndex) coverIndex -= 1;
      return {
        ...draft,
        photos,
        coverIndex: Math.max(0, Math.min(coverIndex, photos.length - 1)),
        warnings: renumberWarningsAfterRemoval(draft.warnings, index + 1),
        dismissedWarnings: renumberDismissedAfterRemoval(draft.dismissedWarnings, index + 1),
        photosChangedSinceRun: true,
      };
    }

    case "setCover": {
      const index = draft.photos.findIndex((p) => p.id === action.id);
      return index < 0 ? draft : { ...draft, coverIndex: index };
    }

    case "runStarted":
      // The run counter is not bumped here: a request refused before the
      // server creates a run (403, 429, a pre-stream 503) costs nothing, and
      // counting it would disable retries the server still allows. See
      // `serverRunCounted`.
      return {
        ...(draft.photosChangedSinceRun ? withoutStaleAi(draft) : draft),
        photosChangedSinceRun: false,
        // Photo numbers in old warnings — and old "Keep it" choices — refer
        // to the old photo set.
        warnings: [],
        dismissedWarnings: [],
        reviewNote: null,
      };

    case "serverRunCounted":
      return { ...draft, extractionRuns: draft.extractionRuns + 1 };

    case "runsExhausted":
      // The server said 429 quota_runs: whatever we counted, there are none left.
      return draft.extractionRuns >= MAX_RUNS_PER_ATTEMPT
        ? draft
        : { ...draft, extractionRuns: MAX_RUNS_PER_ATTEMPT };

    case "mergeAi":
      return mergeAi(draft, action.event);

    case "addWarning": {
      const type = action.warning.type as WarningType;
      if (!KNOWN_WARNINGS.includes(type)) return draft;
      const warning: ListingWarning = {
        type,
        photo: action.warning.photo,
        reason: action.warning.reason,
      };
      const key = warningKey(warning);
      if (draft.warnings.some((w) => warningKey(w) === key)) return draft;
      return { ...draft, warnings: [...draft.warnings, warning] };
    }

    case "dismissWarning": {
      const key = warningKey(action.warning);
      if (draft.dismissedWarnings.includes(key)) return draft;
      return { ...draft, dismissedWarnings: [...draft.dismissedWarnings, key] };
    }

    case "editField":
      return editField(draft, action.field, action.value);

    case "confirmCondition": {
      const current = draft.fields.condition;
      // Agreeing with the model's guess keeps it the model's value; choosing
      // anything else is an edit of it.
      const source: FieldSource =
        current.source === "ai"
          ? action.value === draft.conditionProposal
            ? "ai"
            : "ai_edited"
          : editedSource(current.source);
      return {
        ...draft,
        conditionConfirmed: true,
        fields: {
          ...draft.fields,
          condition: { ...current, value: action.value, source },
        },
      };
    }

    case "prefillLocation": {
      // A default, not an edit: only ever fills a field nobody has set.
      const current = draft.fields.location;
      if (current.source !== "empty" || current.value !== null) return draft;
      return {
        ...draft,
        fields: { ...draft.fields, location: { value: action.value, source: "user" } },
      };
    }

    case "setDepositRule":
      return withDerivedDeposit({ ...draft, depositRule: action.rule });

    case "setReviewNote":
      return draft.reviewNote === action.note ? draft : { ...draft, reviewNote: action.note };

    default:
      return draft;
  }
}

// ---- Derived state ----------------------------------------------------------

export function uploadedPhotos(draft: ListingDraft) {
  return draft.photos.filter((p) => p.status === "done" && p.remoteUrl);
}

/** Fields the model filled and nobody has changed — the L-14 "prefilled_count". */
export function prefilledCount(draft: ListingDraft) {
  return (Object.keys(draft.fields) as FieldName[]).filter(
    (name) => draft.fields[name].source === "ai"
  ).length;
}

export function canRunAgain(draft: ListingDraft) {
  return draft.extractionRuns < MAX_RUNS_PER_ATTEMPT;
}

export interface Requirement {
  key: "rate" | "condition" | "category" | "title" | "description" | "location" | "deposit";
  label: string;
}

/** What still blocks Preview, in the order Review lays the fields out (§8.4). */
export function missingRequirements(draft: ListingDraft): Requirement[] {
  const f = draft.fields;
  const missing: Requirement[] = [];
  if (parseRate(f.rate.value) === null) missing.push({ key: "rate", label: "price" });
  if (!draft.conditionConfirmed || !f.condition.value)
    missing.push({ key: "condition", label: "condition" });
  if (!f.category.value) missing.push({ key: "category", label: "category" });
  if (!f.title.value?.trim()) missing.push({ key: "title", label: "title" });
  if (!f.description.value?.trim())
    missing.push({ key: "description", label: "description" });
  // A pin with no name would reach the server as an empty `location`.
  if (!f.location.value?.locality?.trim())
    missing.push({ key: "location", label: "pickup location" });
  // The deposit is derived from the price, so it is only named once there is
  // a price. After that an empty one means the owner cleared it: sending 0
  // would list the item with no deposit at all, which nobody chose.
  if (
    parseRate(f.rate.value) !== null &&
    !/^\d+(\.\d{1,2})?$/.test(f.security_deposit.value?.trim() ?? "")
  )
    missing.push({ key: "deposit", label: "deposit" });
  return missing;
}

export function stillNeededLabel(missing: Requirement[]) {
  if (missing.length === 0) return "";
  const labels = missing.map((m) => m.label);
  if (labels.length === 1) return `Still needed: ${labels[0]}`;
  return `Still needed: ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

// ---- Persistence ------------------------------------------------------------

/**
 * What is written to storage. A photo that has not finished uploading has only
 * a local file behind it, which may be gone by the time the draft is resumed,
 * so only uploaded photos are kept (§7.2).
 */
export function serializeDraft(draft: ListingDraft): string {
  const cover = draft.photos[draft.coverIndex];
  const photos = draft.photos.filter((p) => p.status === "done" && p.remoteUrl);
  const coverIndex = cover ? Math.max(0, photos.indexOf(cover)) : 0;
  return JSON.stringify({ ...draft, photos, coverIndex });
}

/** Parse a stored draft; null when it is missing, malformed or expired. */
export function hydrateDraft(raw: string | null, now: number): ListingDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ListingDraft;
    if (!parsed || typeof parsed.attemptId !== "string" || !parsed.fields) return null;
    if (typeof parsed.startedAt !== "number" || now - parsed.startedAt > DRAFT_MAX_AGE_MS) {
      return null;
    }
    const base = createDraft(parsed.attemptId, parsed.startedAt);
    const photos = (parsed.photos ?? []).filter((p) => p.status === "done" && p.remoteUrl);
    return {
      ...base,
      ...parsed,
      fields: { ...base.fields, ...parsed.fields },
      photos,
      coverIndex: Math.min(Math.max(0, parsed.coverIndex ?? 0), Math.max(0, photos.length - 1)),
      dismissedWarnings: parsed.dismissedWarnings ?? [],
      warnings: parsed.warnings ?? [],
    };
  } catch {
    return null;
  }
}

/** For the resume sheet: "Finish your {title or 'last'} listing?" */
export function draftDisplayTitle(draft: ListingDraft) {
  return draft.fields.title.value?.trim() || "last";
}

/** A draft worth offering back: anything beyond a freshly opened L-12. */
export function isDraftWorthResuming(draft: ListingDraft) {
  return (
    draft.photos.length > 0 ||
    (Object.keys(draft.fields) as FieldName[]).some((n) => draft.fields[n].value !== null)
  );
}
