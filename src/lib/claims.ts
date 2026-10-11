import { ApiError, fieldErrors } from "@/lib/api-error";
import type { BookingShop } from "@/lib/shop-booking";
import { BookingCustomer, addDays, dayOf, dayShort, money, rangeLabel, timeAndDay, todayIst } from "@/lib/booking";
import { Side } from "@/lib/capture";
import { reached } from "@/lib/day-of";

/**
 * Claims on the phone (ENG-252 the customer's side, ENG-253 the shop's report;
 * API-CONTRACT OE-K and Shared objects, Claim). A claim is about money and
 * evidence, so every screen shows what the server says: who raised it, the
 * amount, the deadline, what was decided and why. The deadlines are counted
 * against the server's clock. The words are the plan's (N11 to N14); there is
 * no drawn frame for the customer's side, and SH-11 draws the shop's report.
 */

// ---- The claim, as the server sends it ------------------------------------------------------------

export interface ClaimEffect {
  /** `refund`, `deposit_deduction`, `payout_deduction`, `mark`. */
  kind: string;
  amount: string | null;
  /** Ready to show: "Refunded to the customer". */
  text: string;
}

export interface ClaimReply {
  text: string;
  evidence: string[];
  at: string;
}

export interface Claim {
  id: number;
  booking: {
    number: string;
    product_title: string;
    first_day: string;
    last_day: string;
    customer: { first_name: string; last_initial: string };
    deposit: string | null;
  };
  /** `not_as_described`, `fault`, `damage`, `not_returned`, `owner_absent_at_return`. */
  kind: string;
  against: "shop" | "customer";
  raised_by_role: "customer" | "owner" | "system";
  statement: string;
  evidence: string[];
  amount_claimed: string | null;
  reply: ClaimReply | null;
  can_reply: boolean;
  reply_due_at: string | null;
  decide_by: string | null;
  status: "open" | "decided";
  /** `""`, `upheld`, `not_upheld`, `resolved`. */
  decision: string;
  decided_amount: string | null;
  decision_note: string;
  effects: ClaimEffect[];
  /** A decided claim's money waits for something: a fault report decided before the item is back (P4-10). */
  money_pending: boolean;
  /** `not_returned` only: when the deposit goes to the owner if the item is still out (P4-10). */
  forfeit_at: string | null;
  /**
   * `fault` only: when the item must be back. The report plus `FAULT_RETURN_HOURS`, and on a rental that was extended the
   * due time of the last booking of the chain when that is later (T-33). Null on every other kind.
   */
  return_by: string | null;
  /**
   * The bookings that took the item on after this claim's booking, first to last (the last is where the item is now);
   * `[]` when none did. Null for an answer from before the field: the chain is then read from the bookings.
   */
  extensions: string[] | null;
  /** Which side the caller is on: `raised` it, it is `against` the caller, or the caller is the `other` party of a claim Renit raised (P5-4). */
  my_side: "raised" | "against" | "other" | null;
  /** The server's clock when the answer was made: `reply_due_at`, `return_by` and `forfeit_at` are counted against it (P5-4). */
  server_time: string | null;
  created_at: string;
  decided_at: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const orNull = (value: unknown) => (typeof value === "string" && value ? value : null);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

function readEffect(value: unknown): ClaimEffect | null {
  if (!isRecord(value) || typeof value.text !== "string") return null;
  return { kind: text(value.kind), amount: orNull(value.amount), text: value.text };
}

/**
 * A claim read the careful way: something that is not a claim is null, and a field
 * that is missing becomes its empty value, so a screen never draws what was not sent.
 */
export function readClaim(value: unknown): Claim | null {
  if (!isRecord(value) || typeof value.id !== "number" || typeof value.kind !== "string") return null;
  const booking = isRecord(value.booking) ? value.booking : {};
  const customer = isRecord(booking.customer) ? booking.customer : {};
  const reply = isRecord(value.reply) && typeof value.reply.text === "string" ? value.reply : null;
  return {
    id: value.id,
    booking: {
      number: text(booking.number),
      product_title: text(booking.product_title),
      first_day: text(booking.first_day),
      last_day: text(booking.last_day),
      customer: { first_name: text(customer.first_name), last_initial: text(customer.last_initial) },
      deposit: orNull(booking.deposit),
    },
    kind: value.kind,
    against: value.against === "customer" ? "customer" : "shop",
    raised_by_role: value.raised_by_role === "owner" || value.raised_by_role === "system" ? value.raised_by_role : "customer",
    statement: text(value.statement),
    evidence: strings(value.evidence),
    amount_claimed: orNull(value.amount_claimed),
    reply: reply ? { text: text(reply.text), evidence: strings(reply.evidence), at: text(reply.at) } : null,
    can_reply: value.can_reply === true,
    reply_due_at: orNull(value.reply_due_at),
    decide_by: orNull(value.decide_by),
    status: value.status === "decided" ? "decided" : "open",
    decision: text(value.decision),
    decided_amount: orNull(value.decided_amount),
    decision_note: text(value.decision_note),
    effects: Array.isArray(value.effects) ? value.effects.map(readEffect).filter((e): e is ClaimEffect => e !== null) : [],
    money_pending: value.money_pending === true,
    forfeit_at: orNull(value.forfeit_at),
    return_by: orNull(value.return_by),
    extensions: Array.isArray(value.extensions) ? strings(value.extensions) : null,
    my_side: value.my_side === "raised" || value.my_side === "against" || value.my_side === "other" ? value.my_side : null,
    server_time: orNull(value.server_time),
    created_at: text(value.created_at),
    decided_at: orNull(value.decided_at),
  };
}

// ---- Who, what, when ------------------------------------------------------------------------------

const KIND_LABEL: Record<string, string> = {
  not_as_described: "Not as described",
  fault: "Fault report",
  damage: "Damage",
  not_returned: "Item not returned",
  owner_absent_at_return: "Shop not at the return",
};

export const kindLabel = (kind: string) => KIND_LABEL[kind] ?? "A problem with a booking";

/** The three kinds Renit staff decide, and the side they are against may answer once. */
export const takesDecision = (kind: string) => kind === "not_as_described" || kind === "fault" || kind === "damage";

/** The other side's name for the words: the shop for a customer, the customer for a shop. */
export function otherName(claim: Pick<Claim, "booking">, role: Side): string {
  const { first_name, last_initial } = claim.booking.customer;
  if (role === "customer") return "the shop";
  return first_name ? `${first_name}${last_initial ? ` ${last_initial}.` : ""}` : "the customer";
}

/** Who raised it, exactly as the server says (`raised_by_role`). */
export function raisedByLine(claim: Pick<Claim, "raised_by_role" | "booking">, role: Side | null): string {
  if (claim.raised_by_role === "system") return "Renit raised this.";
  if (role && claim.raised_by_role === role) return "You raised this.";
  const name = claim.raised_by_role === "owner" ? "The shop" : otherName(claim, "owner");
  return `${name[0].toUpperCase()}${name.slice(1)} raised this.`;
}

/**
 * Which side of the booking the caller is on, read from the claim's `my_side` (P5-4) and not from the screen that opened it:
 * `against` is the side the claim is against, `raised` the side that raised it (`raised_by_role`), `other` the one that
 * neither raised it nor answers it (a claim Renit raised). An answer without `my_side` is not guessed at: if the server
 * lets the caller reply (`can_reply`), the caller is the side it is against; otherwise the side is unknown (null), and the
 * claim is shown in the third person, with no reply form.
 */
export function sideOf(claim: Pick<Claim, "my_side" | "against" | "raised_by_role" | "can_reply">): Side | null {
  const against: Side = claim.against === "customer" ? "customer" : "owner";
  const other: Side = against === "customer" ? "owner" : "customer";
  switch (claim.my_side) {
    case "against":
      return against;
    case "raised":
      return claim.raised_by_role === "owner" ? "owner" : claim.raised_by_role === "customer" ? "customer" : null;
    case "other":
      return other;
    default:
      return claim.can_reply ? against : null;
  }
}

/** The claim is against the caller's side. */
export const againstMe = (claim: Pick<Claim, "against">, role: Side) => (role === "customer" ? claim.against === "customer" : claim.against === "shop");

/** "today", "tomorrow", or "on Sat 24 Oct": the India day of an instant, said against `now`. */
function dayWord(iso: string | null | undefined, now: Date): string {
  const day = dayOf(iso);
  if (!day) return "";
  const today = todayIst(now);
  return day === today ? "today" : day === addDays(today, 1) ? "tomorrow" : `on ${dayShort(day)}`;
}

/** "6:00 pm today", "6:00 pm tomorrow", "6:00 pm on Sat 24 Oct": a deadline in words, by the server's day. */
export function deadlineLabel(iso: string | null | undefined, now: Date): string {
  const at = iso ? timeAndDay(iso, now) : null;
  return at ? `${at.time} ${at.day}` : "";
}

/** "RN-24790 · Epson projector · Fri 9 – Sat 10 Oct". */
export function claimBookingLine(claim: Pick<Claim, "booking">): string {
  const b = claim.booking;
  return [b.number, b.product_title, b.first_day && b.last_day ? rangeLabel(b.first_day, b.last_day) : ""].filter(Boolean).join(" · ");
}

/** The time Renit has to decide, in words; says so plainly once it has passed. */
export function decideLine(claim: Pick<Claim, "kind" | "decide_by">, now: Date): string | null {
  if (!takesDecision(claim.kind) || !claim.decide_by) return null;
  if (reached(claim.decide_by, now)) return "Renit's decision is due. The desk is on it.";
  return `Renit decides by the end of ${dayWord(claim.decide_by, now).replace(/^on /, "")}.`;
}

/**
 * The fault report's item goes back first, and the claim says by when (`return_by`, P5-4). Only a claim without that field
 * (an answer from before it) is counted here: the report's time plus the server's FAULT_RETURN_HOURS.
 */
export const FAULT_RETURN_HOURS = 24;

/**
 * The report plus the return hours: the time that decides the part-refund of a report Renit does not uphold (A-32),
 * measured to the item's return even on an extended rental (T-33). The claim does not carry it once its `return_by`
 * follows the chain, so it is counted here from the report's time.
 */
export function faultReportDeadline(claim: Pick<Claim, "kind" | "created_at">): string | null {
  const at = new Date(claim.created_at).getTime();
  return claim.kind === "fault" && Number.isFinite(at) ? new Date(at + FAULT_RETURN_HOURS * 3_600_000).toISOString() : null;
}

/** When the item must be back for a fault report that is not upheld still to give a part-refund (A-32): the server's `return_by`. */
export function faultReturnBy(claim: Pick<Claim, "kind" | "created_at" | "return_by">): string | null {
  if (claim.kind !== "fault") return null;
  return claim.return_by ?? faultReportDeadline(claim);
}

/** The bookings of a chain the "bring it back" line reads: what the claim's booking and its last live extension say. */
type ChainBooking = Pick<BookingCustomer, "number" | "stage" | "exit" | "extensions" | "return_by">;

/**
 * The last booking of the chain a fault report sits on that is still live: the claim's own booking when no extension
 * of it is (an extension that was cancelled or refused takes no item on), else the last live extension, and on from
 * that one. Decision T-33: a fault report on a rental that was extended is settled when the item comes back at the end
 * of the last extension, and the claim's own booking is `closed` once its extension has started, so it cannot say
 * whether the item is out. `read` fetches a booking by its number; a chain is two or three bookings.
 */
export async function chainEnd<B extends ChainBooking>(first: B, read: (number: string) => Promise<B>): Promise<B> {
  let current = first;
  for (let step = 0; step < 8; step += 1) {
    let next: B | null = null;
    for (const number of current.extensions) {
      const extension = await read(number);
      if (!extension.exit) next = extension;
    }
    if (!next) return current;
    current = next;
  }
  return current;
}

/** Where the item is to come back, and whether it still has to: from the claim and the chain's two ends. */
export interface ReturnTarget {
  stillOut: boolean;
  /** When it is due back: the claim's `return_by`, or the last extension's return when the rental was extended. */
  by: string | null;
  /** On an extended rental: the report plus 24 hours, which still decides the refund of a report Renit does not uphold. */
  early: string | null;
  /** The rental was extended: the item goes back at the end of the last extension (T-33). */
  extended: boolean;
}

/**
 * `first` is the claim's own booking and `end` the last live booking of its chain: the booking named last in the claim's
 * `extensions` when the claim has them (its `return_by` already follows the chain), else what `chainEnd` found (the same
 * booking when nothing extends it). Null while the chain is still being read, so nothing is said from the closed booking
 * meanwhile.
 */
export function faultReturnTarget(
  claim: Pick<Claim, "kind" | "created_at" | "return_by" | "extensions">,
  first: ChainBooking | null | undefined,
  end: ChainBooking | null | undefined
): ReturnTarget | null {
  if (!first) return null;
  const out = (b: ChainBooking) => b.stage === "out" && !b.exit;
  const plain = { stillOut: out(first), by: faultReturnBy(claim), early: null, extended: false };
  // The claim says (`extensions`, and a `return_by` that follows the chain), else the bookings do.
  const claimSays = Array.isArray(claim.extensions);
  const extended = claimSays ? (claim.extensions?.length ?? 0) > 0 : first.extensions.length > 0;
  if (!extended) return plain;
  if (!end) return null;
  // Every extension was cancelled or refused: the item is back on its first booking's terms.
  if (end.number === first.number) return plain;
  return {
    stillOut: out(first) || out(end),
    by: claimSays ? (claim.return_by ?? end.return_by) : end.return_by,
    early: faultReportDeadline(claim),
    extended: true,
  };
}

/**
 * What the customer is told about bringing the item back, for a fault report that is
 * open or decided with its money waiting on the return (`money_pending`): the item goes
 * back first (A-32, N14). Only while the chain still says the item is out (`target.stillOut`):
 * once it is back there is nothing to bring. When the rental was extended the line points at the end of the
 * last extension (T-33), not at the 24 hours after the report. Null for anything else.
 */
export function faultReturnLine(
  claim: Pick<Claim, "kind" | "status" | "money_pending">,
  target: ReturnTarget | null,
  now: Date
): string | null {
  if (!target || !target.stillOut || claim.kind !== "fault" || (claim.status === "decided" && !claim.money_pending)) return null;
  if (!target.by) return null;
  const when = deadlineLabel(target.by, now);
  if (reached(target.by, now)) {
    return `The item was due back by ${when}. Bring it back as soon as you can: any refund is paid once it is back.`;
  }
  if (!target.extended) return `The item goes back first: bring it back by ${when}. Any refund is paid once it is back.`;
  // Extended. The report's own time (the 24 hours after it) still decides the refund if Renit does not agree, while it is
  // ahead, undecided, and earlier than the extension's return: only then are there two times to say. When the extension is
  // due inside those hours there is one time, and it is not "the end of the extension" by itself.
  const twoTimes =
    claim.status !== "decided" && target.early !== null && !reached(target.early, now) && new Date(target.by).getTime() > new Date(target.early).getTime();
  if (twoTimes && target.early) {
    return `Bring the item back by ${deadlineLabel(target.early, now)} to keep a refund if Renit does not agree. The latest it can come back is ${when}, the end of your extension. Any refund is paid once it is back.`;
  }
  const inside = target.early !== null && new Date(target.by).getTime() <= new Date(target.early).getTime();
  return inside
    ? `Bring the item back by ${when}. Any refund is paid once it is back.`
    : `The item goes back at the end of your extension: bring it back by ${when}. Any refund is paid once it is back.`;
}

// ---- What the screen says about where the claim stands --------------------------------------------

export interface Banner {
  tone: "brand" | "neutral";
  title: string;
  sub: string | null;
}

const DECISION_TITLE: Record<string, string> = {
  upheld: "Renit upheld this claim",
  not_upheld: "Renit did not uphold this claim",
  resolved: "Resolved by Renit",
};

/**
 * A decided claim whose money waits: the claim says so itself (`money_pending`, P4-10), and the page writes
 * "The money moves when the item is back" from that flag, not from the booking.
 */
export const waitsForReturn = (claim: Pick<Claim, "status" | "money_pending">) => claim.status === "decided" && claim.money_pending;

/**
 * An "item not returned" claim says when the deposit goes to the owner if the item is still out (`forfeit_at`,
 * P4-10), by the same clock as every other deadline. Null for any other kind and once the claim is decided.
 */
export function forfeitLine(claim: Pick<Claim, "kind" | "status" | "forfeit_at">, role: Side | null, now: Date): string | null {
  if (claim.kind !== "not_returned" || claim.status !== "open" || !claim.forfeit_at) return null;
  const when = deadlineLabel(claim.forfeit_at, now);
  // The deposit goes to the shop: "you" only to the shop itself, and in the third person when the side is not known.
  const to = role === "owner" ? "you" : "the shop";
  return reached(claim.forfeit_at, now)
    ? `The deposit was due to go to ${to} at ${when}, if the item was still out.`
    : `If the item is still out at ${when}, ${role === "customer" ? "your" : "the"} deposit goes to ${to}.`;
}

export function statusBanner(claim: Claim, role: Side | null, now: Date): Banner {
  if (claim.status === "open") {
    return takesDecision(claim.kind)
      ? { tone: "brand", title: "Waiting for Renit's decision", sub: decideLine(claim, now) }
      : { tone: "brand", title: "Renit's desk is dealing with this", sub: forfeitLine(claim, role, now) };
  }
  return {
    tone: "neutral",
    title: DECISION_TITLE[claim.decision] ?? "Decided by Renit",
    sub: waitsForReturn(claim) ? "The money moves when the item is back." : null,
  };
}

/** What a claim asked for and what was decided, for a damage claim (the amount is never more than the deposit). */
export function amountLines(claim: Claim): string[] {
  if (claim.kind !== "damage") return [];
  const lines: string[] = [];
  if (claim.amount_claimed) {
    lines.push(
      claim.booking.deposit
        ? `${money(claim.amount_claimed)} asked for, of the ${money(claim.booking.deposit)} deposit`
        : `${money(claim.amount_claimed)} asked for`
    );
  }
  if (claim.status === "decided") {
    lines.push(
      claim.decided_amount && Number(claim.decided_amount) > 0
        ? `${money(claim.decided_amount)} decided`
        : "Nothing is taken from the deposit"
    );
  }
  return lines;
}

const EFFECT_LABEL: Record<string, string> = {
  refund: "Refund",
  deposit_deduction: "From the deposit",
  payout_deduction: "From a payout",
  mark: "On the record",
};

export interface EffectRow {
  key: string;
  /** The server's own words. */
  title: string;
  label: string;
  amount: string | null;
}

/** What the decision did to the money, one row each, with the server's own words. */
export function effectRows(claim: Pick<Claim, "effects">): EffectRow[] {
  return claim.effects.map((effect, index) => ({
    key: `${effect.kind}-${index}`,
    title: effect.text,
    label: EFFECT_LABEL[effect.kind] ?? "Money",
    amount: effect.amount && Number(effect.amount) > 0 ? money(effect.amount) : null,
  }));
}

// ---- The reply, once --------------------------------------------------------------------------------

export type ReplyView =
  /** A reply has been sent: it is shown, and no form is. */
  | { kind: "sent"; reply: ClaimReply }
  /** The side the claim is against may reply, once, until `due`: the customer, or the shop (an owner who is not a merchant has no dashboard, so the phone replies for both). */
  | { kind: "form"; due: string }
  /** The caller's side could have replied and the time has passed. */
  | { kind: "late"; due: string }
  /** The other side may still reply. */
  | { kind: "waiting"; due: string }
  /** Decided and no reply was sent by the side the claim is against. */
  | { kind: "none_sent" }
  | { kind: "none" };

/**
 * What the reply part of the screen is. The server's `can_reply` says whether the
 * caller may; the screen also counts `reply_due_at` against the server's clock, so
 * a form left open past the deadline closes by itself instead of failing with
 * `reply_late` when sent.
 */
export function replyView(claim: Claim, role: Side, now: Date, clockKnown = true): ReplyView {
  if (claim.reply) return { kind: "sent", reply: claim.reply };
  const mine = againstMe(claim, role);
  if (!takesDecision(claim.kind) || !claim.reply_due_at) return { kind: "none" };
  const due = claim.reply_due_at;
  if (claim.status === "decided") return mine ? { kind: "none_sent" } : { kind: "none" };
  // Without a readable server time (the answer had no `Date`), this phone's own clock must not hide a form the server
  // would still take: `can_reply` decides, as it does for every other refusal (review app-5 r2).
  if (clockKnown && reached(due, now)) return mine ? { kind: "late", due } : { kind: "none" };
  if (!mine) return { kind: "waiting", due };
  if (!claim.can_reply) return { kind: "none" };
  return { kind: "form", due };
}

/** The line under a claim on a list of claims, or a booking. */
export function claimRowSub(claim: Claim, role: Side, now: Date, clockKnown = true): string {
  if (claim.status === "decided") return DECISION_TITLE[claim.decision] ?? "Decided by Renit";
  const view = replyView(claim, role, now, clockKnown);
  if (view.kind === "form") return `Waiting for Renit's decision. Reply by ${deadlineLabel(view.due, now)}.`;
  return statusBanner(claim, role, now).title;
}

export function replyHold(reply: string): string | null {
  return reply.trim() ? null : "Write your reply.";
}

/** Why a reply was refused, in plain words. */
export function replyErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "already_replied":
      return "You have already replied. A claim takes one reply.";
    case "claim_decided":
      return "Renit has already decided this claim.";
    case "reply_late":
      return "The time to reply has passed.";
    case "forbidden":
      return "You can't reply to this claim.";
    case "validation_error":
      // The words first; a refused file (not on Renit's storage, too large, another booking's) is said as the server says it.
      return fieldErrors(error).text ?? fieldErrors(error).evidence ?? "Write your reply, then try again.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}

/** One of the two conflicts that mean the reply is already in: read the claim again instead of sending. */
export const replyAlreadyIn = (error: ApiError | null) => error?.code === "already_replied" || error?.code === "claim_decided";

// ---- Evidence --------------------------------------------------------------------------------------

/** A photo or a video, by the end of its address. Evidence from the dashboard may be either. */
export const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url);

// ---- After a send whose answer never came -----------------------------------------------------------

/** The claims a booking holds now that it did not hold before the press: only a new id can be the report that was sent. */
export const newClaimIds = (before: readonly number[] | null | undefined, after: readonly number[] | null | undefined): number[] =>
  (after ?? []).filter((id) => !(before ?? []).includes(id));

/** What was sent, to match a claim against it: a fault or a damage report, by who raised it and its words (and its amount, for damage). */
export interface SentReport {
  kind: "fault" | "damage";
  statement: string;
  /** Whole rupees, for a damage report. */
  amount?: number;
}

/**
 * Whether a claim is the report that was just sent. A new id is not proof enough on its own (the contract does not
 * say `claims` is in any order, and another claim may have been made meanwhile): the kind, the side that raised it, the
 * words and the amount must all be the ones sent.
 */
export function isMyReport(claim: Pick<Claim, "kind" | "raised_by_role" | "statement" | "amount_claimed">, sent: SentReport): boolean {
  if (claim.kind !== sent.kind || claim.statement.trim() !== sent.statement.trim()) return false;
  if (claim.raised_by_role !== (sent.kind === "fault" ? "customer" : "owner")) return false;
  return sent.kind === "fault" || (claim.amount_claimed !== null && Number(claim.amount_claimed) === sent.amount);
}

// ---- The customer's fault report (BK-20, N14) -----------------------------------------------------

/** BK-20's row: "Report it by Sun 25 Oct, 10:42 am, within 24 hours of handover". Null when no time is set. */
export function faultRowSub(booking: Pick<BookingCustomer, "report_fault_until">, now: Date): string {
  const by = deadlineLabel(booking.report_fault_until, now);
  return by ? `Report it by ${by}, within 24 hours of handover` : "Report it within 24 hours of handover";
}

/**
 * Why the fault form is not offered, or null when it is. The server's `can` decides
 * (`report_fault`); the words say which of the three reasons it is, so the person
 * is not left with a screen that simply will not send.
 */
export function faultBlocked(
  booking: Pick<BookingCustomer, "can" | "claim_open" | "report_fault_until" | "stage">,
  now: Date
): string | null {
  if (booking.can.includes("report_fault")) return null;
  if (booking.claim_open) return "A report is already with Renit. Open the booking to see where it stands.";
  if (booking.stage !== "out") return "A fault can be reported while you have the item, within 24 hours of the handover.";
  if (booking.report_fault_until && reached(booking.report_fault_until, now)) {
    return "The 24 hours to report a fault have passed. Use Get help to talk to Renit's desk.";
  }
  return "A fault can't be reported on this booking now.";
}

/** What reporting a fault does, before the customer sends it: the plan's N14, with this booking's money. */
export function faultNotice(booking: Pick<BookingCustomer, "money">): string {
  const m = booking.money;
  return (
    `Renit decides by the end of tomorrow. The item goes back first: bring it back within ${FAULT_RETURN_HOURS} hours of your report. ` +
    `If we agree, you get your rent and the ${money(m.booking_amount)} back once it is back. ` +
    `If we don't, and it was back in time, it counts as cancelling inside 24 hours and one day's rent (${money(m.rate)}) goes to the shop.`
  );
}

/** Why "Send to Renit" is off, or null: the words and at least one photo are both needed (a fault report needs evidence, N14). */
export function faultHold(statement: string, photos: number): string | null {
  if (!statement.trim()) return "Say what does not work.";
  return photos > 0 ? null : "Add at least one photo of the problem.";
}

export function faultErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "too_late":
      return "It is more than 24 hours since the handover, so a fault can't be reported now. Use Get help to talk to Renit's desk.";
    case "claim_exists":
      return "You have already reported a fault on this booking. It is with Renit.";
    case "stage_not_allowed":
      return "This booking has moved on, so a fault can't be reported now.";
    case "validation_error":
      return fieldErrors(error).photos ?? fieldErrors(error).statement ?? "Say what does not work and add a photo, then try again.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}

// ---- The shop's damage report (SH-11, N12) --------------------------------------------------------

/** Whole rupees from what was typed: digits only. Null for nothing typed. */
export function parseRupees(input: string): number | null {
  const digits = input.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

/** The request's `amount`: money is a string with two decimals. */
export const rupeesBody = (rupees: number) => `${rupees}.00`;

/** The most that can be asked for: the deposit less any late fee (the server refuses more with `amount_too_large`). */
export function damageMax(money_: { deposit: string; late_fee?: string | null }): number {
  const left = Number(money_.deposit) - Number(money_.late_fee ?? 0);
  return Number.isFinite(left) && left > 0 ? Math.floor(left) : 0;
}

/** Why "Send to Renit" is off, or null. */
export function damageHold(statement: string, amount: string, photos: number, max: number): string | null {
  if (!statement.trim()) return "Say what happened.";
  const rupees = parseRupees(amount);
  if (rupees === null || rupees <= 0) return "Say how much you are asking for.";
  if (rupees > max) return `The most you can ask for is ${money(max)}: the deposit less any late fee.`;
  return photos > 0 ? null : "Add at least one photo of the damage.";
}

/**
 * Where "report a problem" stands for the shop, read from the server's `can` (P4-10): it holds `report_problem` only
 * while the stage is `returned`, the 24 hours last, there is no damage claim yet, and something is left of the
 * deposit. The phone does not work those out; it only says which one is missing when `can` lacks it.
 *  - `open`: the form is offered. `after_code`: not yet, the customer has still to type the return code.
 *  - `none_left`: nothing is left of the deposit to claim against (A-50): say so, and point to Get help.
 *  - `forfeited`: the item was not back in time and the deposit already came to the shop (`deposit_state` `forfeited`):
 *    `can` has no `report_problem` then, and `report_problem_until` is null (it is only set while the stage is `returned`).
 *  - `reported`: a damage claim is already made. `passed`: the time is over. `unavailable`: none of those.
 *
 * `claimKinds` are the kinds of the booking's claims, once read: only a damage claim stops a second one, so a
 * customer's fault report (also a claim on the booking) does not make the shop's time that has passed read as
 * "already reported". While they are not known the booking's own `claim_open` and `claims` stand in (review app-5 r2 #8).
 */
export type ProblemState = "open" | "after_code" | "none_left" | "forfeited" | "reported" | "passed" | "unavailable";

export function problemState(
  booking: Pick<BookingShop, "can" | "stage" | "exit" | "claim_open" | "claims" | "report_problem_until" | "money">,
  now: Date,
  claimKinds?: readonly string[] | null
): ProblemState {
  if (booking.can.includes("report_problem")) return "open";
  if (booking.exit) return "unavailable";
  if (booking.money?.deposit_state === "forfeited") return "forfeited";
  // What is left of the deposit, as the server counts it (deposit less late fees); none when none was taken.
  if (damageMax(booking.money) <= 0) return "none_left";
  if (booking.stage === "out") return "after_code";
  const claimed = claimKinds ? claimKinds.includes("damage") : booking.claim_open || (booking.claims?.length ?? 0) > 0;
  if (claimed) return "reported";
  if (booking.stage === "closed" || (booking.report_problem_until && reached(booking.report_problem_until, now))) return "passed";
  return "unavailable";
}

/** What to tell the shop about a state that is not `open`: A-50's words for nothing left, and the way on (Get help). Null for `open` and `after_code`. */
export function problemLine(state: ProblemState): string | null {
  switch (state) {
    case "none_left":
      return "Nothing is left of the deposit to claim against, so a problem can't be reported here. Use Get help to tell Renit's desk what is wrong.";
    case "forfeited":
      return "The deposit has already come to you, because the item was not back in time, so there is nothing to claim against. Use Get help if something is wrong.";
    case "reported":
      return "A problem has already been reported on this booking. Its claim is listed on the booking.";
    case "passed":
      return "The time to report a problem has passed. Use Get help to talk to Renit's desk.";
    case "unavailable":
      return "A problem can't be reported on this booking now.";
    default:
      return null;
  }
}

/** Why the damage form is not offered, or null when it is. */
export function damageBlocked(
  booking: Pick<BookingShop, "can" | "stage" | "exit" | "claim_open" | "claims" | "report_problem_until" | "money">,
  now: Date,
  claimKinds?: readonly string[] | null
): string | null {
  const state = problemState(booking, now, claimKinds);
  if (state === "open") return null;
  if (state === "after_code") return "A problem can be reported once the item is back and the customer has typed your code.";
  return problemLine(state);
}

/** SH-11's line under the box: "Up to the deposit of ₹3,000". With late days the deposit is less. */
export function damageMaxLine(money_: { deposit: string; late_fee?: string | null }): string {
  const max = damageMax(money_);
  return Number(money_.late_fee ?? 0) > 0
    ? `Up to ${money(max)}: the deposit of ${money(money_.deposit)} less ${money(money_.late_fee)} for late days`
    : `Up to the deposit of ${money(money_.deposit)}`;
}

/** SH-11's notice. */
export function damageNotice(name: string): string {
  return `Renit decides from the two sets of photos within three working days. ${name} can reply once.`;
}

export function damageErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "too_late":
      return "The 24 hours to report a problem have passed. Use Get help to talk to Renit's desk.";
    case "amount_too_large": {
      const max = typeof error.details?.max === "string" ? Number(error.details.max) : NaN;
      return max > 0
        ? `The most you can ask for is ${money(max)}: the deposit less any late fee.`
        : "Nothing is left of the deposit, so a damage claim can't be made. Use Get help to talk to Renit's desk.";
    }
    case "claim_exists":
      return "You have already reported a problem on this booking. It is with Renit.";
    case "stage_not_allowed":
      return "A problem can be reported once the item is back. This booking is not at that stage.";
    case "validation_error": {
      const fields = fieldErrors(error);
      return fields.amount ?? fields.statement ?? fields.photos ?? "Check the words, the amount and the photos, then try again.";
    }
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}

/** "You have until Tue 27 Oct, 6:40 pm." from `report_problem_until`, said against the server's day. */
export function reportUntilLine(until: string | null | undefined, now: Date): string | null {
  const by = deadlineLabel(until, now);
  return by ? `You have until ${by}.` : null;
}
