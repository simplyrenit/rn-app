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
  plans: "prices",
  security_deposit: "deposit",
  worth: "worth",
  location: "address",
  coordinates: "pin on the map",
  full_address: "full address",
};

/** "title, price and deposit". */
const joinWords = (words: readonly string[]): string =>
  words.length <= 1 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

/** The fields a held change touches, in the owner's words. An unknown field is named as it came. */
export function fieldsLine(fields: readonly string[]): string {
  return joinWords([...new Set(fields.map((f) => FIELD_WORDS[f] ?? f.replace(/_/g, " ")))]);
}

/**
 * The fields of the listing the owner's own screens show and send, as plain values: what a waiting change names for them
 * can be laid over the listing. The category (an object on the listing, an id in a change), the details and the included
 * items are shaped differently and are not laid over.
 */
const OWNER_FIELDS = [
  "title",
  "description",
  "condition",
  "brand_name",
  "model_name",
  "usage_description",
  "contact_name",
  "contact_number",
  "rate",
  // ENG-281: a listing's prices, held and compared as one value.
  "plans",
  "security_deposit",
  "worth",
  "location",
  // The pin and the full address wait with a held place line and are applied with it (T-34): the server shows them in
  // `pending_edit`, and the form sends the pin with every save, so it has to be shown the one that waits.
  "coordinates",
  "full_address",
  "images",
  "cover_image",
];

/**
 * The listing as its owner sees it, which is what the server compares a save against: the version customers see with the
 * values of a waiting change laid over it (`pending_edit.changes`). The server reads a held field sent back as its
 * held value as no change, and sent back as the value customers see as "put back", which takes it out of the waiting
 * change; so every screen that fills a form from a listing, and sends the form whole, starts from this and not from the
 * top-level values. Idempotent.
 */
export function ownerView<T extends Record<string, any>>(product: T): T {
  const pending = readPendingEdit(product.pending_edit);
  if (!pending) return product;
  const over: Record<string, unknown> = {};
  for (const field of OWNER_FIELDS) if (field in pending.changes) over[field] = pending.changes[field];
  return { ...product, ...over };
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

/** The reasons that ask something of the owner: the findings, not the marks for a check that could not run. */
const askedOfOwner = (reasons: readonly FlagReason[]) => reasons.filter((r) => !r.unchecked);

/** The pin is applied with its address: it waits with it. */
export const PIN_WAITS = "The new pin waits with the address.";

/** What a check that could not run means for the owner: nothing to do, staff look. */
const STAFF_LOOK = "Renit's staff will look at it: a check could not run.";

const SENT_BACK = "staff_rejected";
const CHANGED_SINCE = "changed_after_sent_back";

/**
 * The owner changed a listing staff had sent back: it carries `changed_after_sent_back` whatever its status. A save answers
 * `checking` with the reason already in place and the check job flags it seconds later (or minutes, if it is behind), and in
 * between the listing must not read as one that is about to go live.
 */
export const changedSinceSentBack = (reasons: readonly FlagReason[] | null | undefined): boolean =>
  (reasons ?? []).some((r) => r.code === CHANGED_SINCE);

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

/**
 * The held change as a line: "Waiting: price and deposit. Needs a change: The deposit is zero. Customers still see the earlier
 * version." A check that could not run asks nothing of the owner and is not "needs a change": it has its own sentence,
 * "Renit's staff will look at it: a check could not run."
 */
export function pendingLine(pending: PendingEdit | null | undefined): string | null {
  if (!pending) return null;
  const fields = fieldsLine(pending.fields);
  const lead = pending.state === "checking" ? "Being checked" : "Waiting";
  const reasons = pending.state === "flagged" ? pending.flag_reasons : [];
  const asked = reasonsText(askedOfOwner(reasons));
  return [
    fields ? `${lead}: ${fields}.` : `${lead}.`,
    asked ? `Needs a change: ${sentence(asked)}` : null,
    couldNotRun(reasons) ? STAFF_LOOK : null,
    "Customers still see the earlier version.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** A held change that waits only because a check could not run: nothing is asked of the owner. */
export const waitsForStaff = (pending: PendingEdit | null | undefined): boolean =>
  Boolean(pending && pending.flag_reasons.length > 0 && askedOfOwner(pending.flag_reasons).length === 0 && couldNotRun(pending.flag_reasons));

// ---- What a save said ---------------------------------------------------------------------------

/** The part of a product answer that says what a save did. */
export interface ListingAnswer {
  status?: string | null;
  flag_reasons?: unknown;
  pending_edit?: unknown;
  [field: string]: unknown;
}

export type SaveKind = "updated" | "nothing" | "checking" | "held" | "sent_back_again" | "flagged" | "withdrawn";

export interface SaveOutcome {
  kind: SaveKind;
  title: string;
  message?: string;
}

// `price` and `min` are a plan's (ENG-281): "2500" is "2500.00".
const NUMERIC_FIELDS = new Set(["rate", "security_deposit", "worth", "quantity", "lat", "long", "price", "min"]);

/** The same value, whatever spelling the server gave it ("610" and "610.00", a rounded coordinate). */
function same(key: string, a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (NUMERIC_FIELDS.has(key)) {
    const x = Number(a);
    const y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 1e-6;
  }
  // The unavailable dates are the same dates in any order, whatever time of day an answer gives them.
  if (key === "blocked_dates" && Array.isArray(a) && Array.isArray(b)) {
    const days = (list: unknown[]) =>
      list.map((r) => (isRecord(r) ? `${String(r.start_date).slice(0, 10)}/${String(r.end_date).slice(0, 10)}` : "")).sort();
    return JSON.stringify(days(a)) === JSON.stringify(days(b));
  }
  // A category is the same category when its id is (the listing carries an object, a change an id, a save an object with one).
  if (key === "category") {
    const id = (v: unknown) => (isRecord(v) ? v.id : v);
    return id(a) === id(b);
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
 * had it (null when the screen has not got it); both the listing and the answer are read as the owner sees them
 * (`ownerView`), which is how the server compares. In this order:
 *  1. nothing was changed: every field sent comes back as it was, the status is the same, and the waiting change is the same;
 *  2. a change of this save waits (a field that was sent, is named in `pending_edit.fields`, and is held with a value it
 *     was not held with before): "being checked", or "needs a change: <the server's reason>";
 *  3. the listing is flagged because of a change since staff sent it back: "Renit will look at it again";
 *  4. the listing is flagged, or being checked, after the save: said so;
 *  5. a waiting change went away and nothing else changed: it was withdrawn (never "updated");
 *  6. otherwise it was updated, with a word on an earlier change that still waits, or one that was withdrawn.
 */
export function saveOutcome(input: {
  before?: ListingAnswer | null;
  sent: Record<string, unknown>;
  answer: ListingAnswer | null | undefined;
}): SaveOutcome {
  const { before, sent, answer } = input;
  if (!answer) return { kind: "updated", title: "Your product was updated!" };
  const pending = readPendingEdit(answer.pending_edit);
  const reasons = readReasons(answer.flag_reasons);
  const sentKeys = Object.keys(sent);
  // What waited before this save: null when nothing did, undefined when the screen cannot say.
  const heldBefore = before && "pending_edit" in before ? readPendingEdit(before.pending_edit) : before ? null : undefined;
  const was = before ? ownerView(before) : null;
  const now = ownerView(answer);

  if (was) {
    const unchanged = sentKeys.every((key) => same(key, was[key], now[key]));
    // The waiting change is the same one. A screen that cannot say what waited (`before` without `pending_edit`) cannot call it
    // the same when the answer carries one that names a field this save sent: that field was held by this save.
    const samePending =
      before && "pending_edit" in before
        ? JSON.stringify(heldBefore) === JSON.stringify(pending)
        : !(pending && pending.fields.some((field) => sentKeys.includes(field)));
    const sameStatus = !before || before.status === undefined || before.status === answer.status;
    if (unchanged && samePending && sameStatus) return { kind: "nothing", title: "Nothing was changed" };
  }

  // This save's own held fields: sent, named as waiting, and not waiting with that value before.
  const heldNow = (pending?.fields ?? []).filter(
    (field) => sentKeys.includes(field) && !(heldBefore && heldBefore.fields.includes(field) && same(field, heldBefore.changes[field], pending?.changes[field]))
  );
  if (pending && heldNow.length > 0) {
    return pending.state === "checking"
      ? { kind: "checking", title: "Your change is being checked", message: "Customers still see the earlier version until it passes." }
      : {
          kind: "held",
          // A check that could not run asks nothing of the owner: staff look.
          title: waitsForStaff(pending) ? "Renit's staff will look at your change" : "Your change is on hold",
          // A pin moved while its address waits, or with it, waits too: it is applied with the address.
          message: [pendingLine(pending) ?? "It needs a change.", heldNow.includes("coordinates") ? PIN_WAITS : null].filter(Boolean).join(" "),
        };
  }
  // A listing staff sent back, changed by its owner: the save sends it to the check again (so the answer says `checking`),
  // and the staff's reason is already "changed since it was sent back". It never goes live on the check alone.
  if (changedSinceSentBack(reasons) && (answer.status === "flagged" || answer.status === "checking")) {
    return { kind: "sent_back_again", title: "Renit will look at it again", message: "It is not live until Renit approves it." };
  }
  if (answer.status === "flagged") {
    return { kind: "flagged", title: "Saved, but it needs a change", message: flagLine(reasons) ?? "Open it to see what to change." };
  }
  if (answer.status === "checking") {
    return { kind: "checking", title: "Your change is being checked", message: "It is saved. It is not live until the check is done." };
  }

  // A held field that is no longer held: its held value passed and is live now (applied), or it was put back as customers
  // see it (the listing's own value stays), or the owner sent another value that passed (applied).
  const withdrawn = (heldBefore?.fields ?? []).filter(
    (field) =>
      !(pending?.fields ?? []).includes(field) &&
      !same(field, answer[field], heldBefore?.changes[field]) &&
      same(field, answer[field], before?.[field])
  );
  // A field that waited, waits no more and now holds its waiting value was applied: customers see it from now on. That is
  // a change too, though in the owner's view it looks the same before and after.
  const applied = (heldBefore?.fields ?? []).filter(
    (field) => !(pending?.fields ?? []).includes(field) && same(field, answer[field], heldBefore?.changes[field])
  );
  const others = was ? applied.length > 0 || sentKeys.some((key) => !withdrawn.includes(key) && !same(key, was[key], now[key])) : true;
  const gone = withdrawn.length > 0 ? `The ${fieldsLine(withdrawn)} you had waiting went back to what customers see.` : "";
  if (withdrawn.length > 0 && !others) return { kind: "withdrawn", title: "Your waiting change was withdrawn", message: gone };
  const still = pending ? `An earlier change still waits: ${fieldsLine(pending.fields) || "see the listing"}.` : "";
  const message = [gone, still].filter(Boolean).join(" ");
  return { kind: "updated", title: "Your product was updated!", ...(message ? { message } : {}) };
}

// ---- A listing just posted from the phone -------------------------------------------------------

export interface SubmittedCopy {
  title: string;
  body: string;
  /** The status the pill shows beside the listing. */
  status: "checking" | "live" | "flagged";
}

/**
 * What the screen after posting says, from the status the post answered and its reasons. Every photo of a new listing is
 * checked, not only the cover, and the check runs after the post: the answer is nearly always `checking`, and the result
 * arrives by push. But the reasons are read whatever the status: when the photo or text check could not run, the server stores
 * that mark and still answers `checking`, and the one thing to tell the owner is that staff will look (nothing is asked of
 * them). A status that already says more is told in plain words: live (a repeated post of a listing already through), or
 * flagged with the check's reasons.
 */
export function submittedCopy(
  status: string | null | undefined,
  reasons: readonly FlagReason[] | null | undefined,
  waits?: string | null
): SubmittedCopy {
  const list = reasons ?? [];
  if (status === "live") {
    return { title: "Your listing is live.", body: "Renters can see it now. You can still edit it from My products.", status: "live" };
  }
  const asked = askedOfOwner(list);
  const shown: SubmittedCopy["status"] = status === "flagged" ? "flagged" : "checking";
  if (couldNotRun(list) && (status === "flagged" || status === "checking") && asked.length === 0) {
    return {
      title: "Submitted.\nRenit's staff will look at it.",
      body: "A check could not run on your listing just now, so a person at Renit will look at it before renters can see it. You do not need to do anything: we tell you when they have looked.",
      status: shown,
    };
  }
  if (status === "flagged") {
    const why = flagLine(asked);
    return {
      title: "Submitted, but it needs a change.",
      body: `${why ? `${sentence(why)} ` : ""}${couldNotRun(list) ? "A check also could not run, so Renit's staff will look at it. " : ""}Open it from My products to change it, and we will look again.`,
      status: "flagged",
    };
  }
  // What the listing waits for, in the server's sentence (T-45), when it says (a shop's first products wait for Renit's staff).
  const waiting = typeof waits === "string" && waits.trim() ? waits.trim() : null;
  return {
    title: "Submitted.\nIt's with our team now.",
    body: waiting
      ? `${waiting} Until then it sits in My products as Checking, and you can still edit it. We tell you when it is done.`
      : "We check every new listing, and every photo on it, before renters can see it. Until then it sits in My products as Checking, and you can still edit it. We tell you when the check is done.",
    status: "checking",
  };
}
