import type { FlagReason } from "@/lib/listing-status";

/**
 * A listing's held change and its reasons, in the owner's words (decisions T-34 to T-36; the phone's product answers
 * carry `pending_edit` and the listing's own `flag_reasons`). Kept free of React so the wording can be tested.
 *
 * The server never takes a live listing down for an edit: a change that fails a check waits (`pending_edit`) over the
 * version customers still see, and a listing staff sent back stays flagged with the staff's reason until they approve it
 * again. So a save that answers 200 may have changed nothing the customers see, and the toast says which.
 */

/** A change to a live listing that waits: what was sent, and why. `state` is `flagged` in practice (it is decided when it is saved). */
export interface PendingEdit {
  state: "checking" | "flagged";
  fields: string[];
  changes: Record<string, unknown>;
  flag_reasons: FlagReason[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** One flag reason, read the careful way: the code and its plain words, and the extras a few carry. */
export function readReason(value: unknown): FlagReason | null {
  if (!isRecord(value) || typeof value.text !== "string") return null;
  const reason: FlagReason = { code: typeof value.code === "string" ? value.code : "", text: value.text };
  if (value.unchecked === true) reason.unchecked = true;
  if (typeof value.sent_back_for === "string") reason.sent_back_for = value.sent_back_for;
  if (Array.isArray(value.changed)) reason.changed = value.changed.filter((c): c is string => typeof c === "string");
  return reason;
}

export const readReasons = (value: unknown): FlagReason[] =>
  Array.isArray(value) ? value.map(readReason).filter((r): r is FlagReason => r !== null) : [];

/** `pending_edit` as the product answer carries it, or null when there is none (or it is not one). */
export function readPendingEdit(value: unknown): PendingEdit | null {
  if (!isRecord(value)) return null;
  return {
    state: value.state === "checking" ? "checking" : "flagged",
    fields: Array.isArray(value.fields) ? value.fields.filter((f): f is string => typeof f === "string") : [],
    changes: isRecord(value.changes) ? value.changes : {},
    flag_reasons: readReasons(value.flag_reasons),
  };
}

/** What the server calls a field, in the owner's words. */
const FIELD_WORDS: Record<string, string> = {
  title: "title",
  description: "description",
  category: "category",
  condition: "condition",
  attributes: "details",
  images: "photos",
  cover_image: "cover photo",
  brand_name: "brand",
  model_name: "model",
  usage_description: "how it is used",
  contact_name: "contact name",
  contact_number: "contact number",
  included_items: "what is included",
  rate: "price",
  security_deposit: "deposit",
  worth: "worth",
  location: "address",
};

/** "title, price and deposit". */
const joinWords = (words: readonly string[]): string =>
  words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

/** The fields a held change touches, in the owner's words. An unknown field is named as it came. */
export function fieldsLine(fields: readonly string[]): string {
  return joinWords([...new Set(fields.map((f) => FIELD_WORDS[f] ?? f.replace(/_/g, " ")))]);
}

const trimmed = (text: string | null | undefined) => (text ?? "").trim();
const sentence = (text: string) => (/[.!?]$/.test(text) ? text : `${text}.`);

/** Reasons that came from a person or a check, in the server's plain words, one after another. */
function reasonsText(reasons: readonly FlagReason[]): string {
  return reasons
    .map((r) => trimmed(r.text))
    .filter(Boolean)
    .join(" · ");
}

/** A reason a check could not run for: staff look at it, whatever it would have found. */
const couldNotRun = (reasons: readonly FlagReason[]) => reasons.some((r) => r.unchecked);

const SENT_BACK = "staff_rejected";
const CHANGED_SINCE = "changed_after_sent_back";

/**
 * Why a listing is flagged, in words an owner can act on:
 *  - sent back by staff (`staff_rejected`): "needs a change: <the staff's reason>. Edit it and we will look again.";
 *  - changed since (`changed_after_sent_back`): "Renit will look at it again" (what was changed, and what was asked);
 *  - a check that could not run (`unchecked`): the server's words, and that Renit's staff will look;
 *  - anything else: the check's own words.
 * Null when there is nothing to say.
 */
export function flagLine(reasons: readonly FlagReason[] | null | undefined): string | null {
  const list = reasons ?? [];
  const changed = list.find((r) => r.code === CHANGED_SINCE);
  if (changed) {
    // `changed` holds labels already ("title", "security deposit"), not field names.
    const what = changed.changed && changed.changed.length > 0 ? ` You changed: ${joinWords(changed.changed)}.` : "";
    const asked = trimmed(changed.sent_back_for) ? ` Renit asked: ${sentence(trimmed(changed.sent_back_for))}` : "";
    const others = reasonsText(list.filter((r) => r !== changed));
    return `Renit will look at it again. It is not live until Renit approves it.${what}${asked}${others ? ` Also: ${others}.` : ""}`;
  }
  const sentBack = list.find((r) => r.code === SENT_BACK);
  if (sentBack && trimmed(sentBack.text)) {
    return `Needs a change: ${sentence(trimmed(sentBack.text))} Edit it and we will look again.`;
  }
  const text = reasonsText(list);
  if (!text) return null;
  return couldNotRun(list) ? `${sentence(text)} A check could not run, so Renit's staff will look at it.` : text;
}

/** The held change as a line: "Waiting: price and deposit. Needs a change: The deposit is zero. Customers still see the earlier version." */
export function pendingLine(pending: PendingEdit | null | undefined): string | null {
  if (!pending) return null;
  const fields = fieldsLine(pending.fields);
  const lead = pending.state === "checking" ? "Being checked" : "Waiting";
  const why = pending.state === "flagged" ? reasonsText(pending.flag_reasons) : "";
  return [
    fields ? `${lead}: ${fields}.` : `${lead}.`,
    why ? `Needs a change: ${sentence(why)}` : null,
    why && couldNotRun(pending.flag_reasons) ? "A check could not run, so Renit's staff will look at it." : null,
    "Customers still see the earlier version.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ---- What a save said ---------------------------------------------------------------------------

/** The part of a product answer that says what a save did. */
export interface ListingAnswer {
  status?: string | null;
  flag_reasons?: unknown;
  pending_edit?: unknown;
  [field: string]: unknown;
}

export type SaveKind = "updated" | "nothing" | "checking" | "held" | "sent_back_again" | "flagged";

export interface SaveOutcome {
  kind: SaveKind;
  title: string;
  message?: string;
}

const NUMERIC_FIELDS = new Set(["rate", "security_deposit", "worth", "quantity", "lat", "long"]);

/** The same value, whatever spelling the server gave it ("610" and "610.00", a rounded coordinate). */
function same(key: string, a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (NUMERIC_FIELDS.has(key)) {
    const x = Number(a);
    const y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-6;
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => same(key, v, b[i]));
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => same(k, a[k], b[k]));
  }
  return (a ?? "") === (b ?? "") && (a === null || a === undefined) === (b === null || b === undefined);
}

/**
 * What a save of a listing did, from the answer: `sent` is the body that was sent and `before` the listing as the screen
 * had it (null when the screen has not got it all, as the photo screens, which always send new files). In this order:
 *  1. nothing was changed: every field sent comes back as it was, the status is the same, and no change newly waits;
 *  2. a change waits (`pending_edit`): "being checked", or "needs a change: <the server's reason>";
 *  3. the listing is flagged because of a change since staff sent it back: "Renit will look at it again";
 *  4. the listing is flagged, or being checked, after the save: said so;
 *  5. otherwise it was updated.
 */
export function saveOutcome(input: {
  before?: ListingAnswer | null;
  sent: Record<string, unknown>;
  answer: ListingAnswer | null | undefined;
}): SaveOutcome {
  const { before, sent, answer } = input;
  const updated: SaveOutcome = { kind: "updated", title: "Your product was updated!" };
  if (!answer) return updated;
  const pending = readPendingEdit(answer.pending_edit);
  const reasons = readReasons(answer.flag_reasons);
  if (before) {
    const heldBefore = readPendingEdit(before.pending_edit);
    const unchanged = Object.keys(sent).every((key) => same(key, before[key], answer[key]));
    const samePending = JSON.stringify(heldBefore) === JSON.stringify(pending);
    if (unchanged && samePending && (before.status ?? null) === (answer.status ?? null)) {
      return { kind: "nothing", title: "Nothing was changed" };
    }
  }
  if (pending) {
    return pending.state === "checking"
      ? { kind: "checking", title: "Your change is being checked", message: "Customers still see the earlier version until it passes." }
      : {
          kind: "held",
          title: "Your change is on hold",
          message: pendingLine(pending) ?? "It needs a change.",
        };
  }
  // A listing staff sent back, changed by its owner: the save sends it to the check again (so the answer says `checking`),
  // and the staff's reason is already "changed since it was sent back". It never goes live on the check alone.
  if (reasons.some((r) => r.code === CHANGED_SINCE) && (answer.status === "flagged" || answer.status === "checking")) {
    return {
      kind: "sent_back_again",
      title: "Renit will look at it again",
      message: "It is not live until Renit approves it.",
    };
  }
  if (answer.status === "flagged") {
    return { kind: "flagged", title: "Saved, but it needs a change", message: flagLine(reasons) ?? "Open it to see what to change." };
  }
  if (answer.status === "checking") {
    return { kind: "checking", title: "Your change is being checked", message: "It is saved. It is not live until the check is done." };
  }
  return updated;
}

// ---- A listing just posted from the phone -------------------------------------------------------

export interface SubmittedCopy {
  title: string;
  body: string;
  /** The status the pill shows beside the listing. */
  status: "checking" | "live" | "flagged";
}

/**
 * What the screen after posting says, from the status the post answered. Every photo of a new listing is checked, not
 * only the cover, and the check runs after the post: the answer is nearly always `checking`, and the result arrives by
 * push. An answer that already says more is told in plain words: live (a retry of a post that was already through),
 * flagged with the check's reasons, or held because a check could not run.
 */
export function submittedCopy(status: string | null | undefined, reasons: readonly FlagReason[] | null | undefined): SubmittedCopy {
  if (status === "live") {
    return { title: "Your listing is live.", body: "Renters can see it now. You can still edit it from My products.", status: "live" };
  }
  if (status === "flagged") {
    const why = flagLine(reasons);
    return {
      title: "Submitted, but it needs a change.",
      // A check that could not run is not the owner's to fix: staff look, and the owner is told.
      body: `${why ? `${sentence(why)} ` : ""}${
        couldNotRun(reasons ?? []) ? "You do not need to do anything: we tell you when they have looked." : "Open it from My products to change it, and we will look again."
      }`,
      status: "flagged",
    };
  }
  return {
    title: "Submitted.\nIt's with our team now.",
    body: "We check every new listing, and every photo on it, before renters can see it. Until then it sits in My products as Checking, and you can still edit it. We tell you when the check is done.",
    status: "checking",
  };
}
