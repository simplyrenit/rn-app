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
export function raisedByLine(claim: Pick<Claim, "raised_by_role" | "booking">, role: Side): string {
  if (claim.raised_by_role === "system") return "Renit raised this.";
  if (claim.raised_by_role === role) return "You raised this.";
  const name = claim.raised_by_role === "owner" ? "The shop" : otherName(claim, "owner");
  return `${name[0].toUpperCase()}${name.slice(1)} raised this.`;
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

/** The fault report's item goes back first; the claim carries no return time, so it is the report's time plus this. */
// ponytail: the setting is FAULT_RETURN_HOURS on the server (24); the claim does not carry the time. Read `return_by` from the claim if it ever does.
export const FAULT_RETURN_HOURS = 24;

/** When the item must be back for a fault report that is not upheld still to give a part-refund (A-32): the report plus 24 hours. */
export function faultReturnBy(claim: Pick<Claim, "kind" | "created_at">): string | null {
  const at = new Date(claim.created_at).getTime();
  if (claim.kind !== "fault" || !Number.isFinite(at)) return null;
  return new Date(at + FAULT_RETURN_HOURS * 3_600_000).toISOString();
}

/**
 * What the customer is told about bringing the item back, for a fault report that is
 * open or decided with its money waiting on the return: the item goes back first (A-32,
 * N14). Null for anything else, and once the money has run.
 */
export function faultReturnLine(claim: Pick<Claim, "kind" | "created_at" | "status" | "effects">, now: Date): string | null {
  const by = faultReturnBy(claim);
  if (!by || (claim.status === "decided" && !waitsForReturn(claim))) return null;
  const when = deadlineLabel(by, now);
  return reached(by, now)
    ? `The item was due back by ${when}. Bring it back as soon as you can: any refund is paid once it is back.`
    : `The item goes back first: bring it back by ${when}. Any refund is paid once it is back.`;
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
 * A fault claim is decided and its money waits for the item to come back (the
 * claim shows "waiting for the return", API OE-K staff decision). The claim has no
 * flag for it, so it is read from what is there: decided, and no effect written yet.
 */
export const waitsForReturn = (claim: Pick<Claim, "kind" | "status" | "effects">) =>
  claim.kind === "fault" && claim.status === "decided" && claim.effects.length === 0;

export function statusBanner(claim: Claim, now: Date): Banner {
  if (claim.status === "open") {
    return takesDecision(claim.kind)
      ? { tone: "brand", title: "Waiting for Renit's decision", sub: decideLine(claim, now) }
      : { tone: "brand", title: "Renit's desk is dealing with this", sub: null };
  }
  return {
    tone: "neutral",
    title: DECISION_TITLE[claim.decision] ?? "Decided by Renit",
    sub: waitsForReturn(claim) ? "The money moves once the item is back." : null,
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
  /** The customer may reply, once, until `due`. */
  | { kind: "form"; due: string }
  /** The shop may reply, on the dashboard (replying on the phone is not built: ENG-253's scope). */
  | { kind: "dashboard"; due: string }
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
export function replyView(claim: Claim, role: Side, now: Date): ReplyView {
  if (claim.reply) return { kind: "sent", reply: claim.reply };
  const mine = againstMe(claim, role);
  if (!takesDecision(claim.kind) || !claim.reply_due_at) return { kind: "none" };
  const due = claim.reply_due_at;
  if (claim.status === "decided") return mine ? { kind: "none_sent" } : { kind: "none" };
  if (reached(due, now)) return mine ? { kind: "late", due } : { kind: "none" };
  if (!mine) return { kind: "waiting", due };
  if (!claim.can_reply) return { kind: "none" };
  return role === "customer" ? { kind: "form", due } : { kind: "dashboard", due };
}

/** The line under a claim on a list of claims, or a booking. */
export function claimRowSub(claim: Claim, role: Side, now: Date): string {
  if (claim.status === "decided") return DECISION_TITLE[claim.decision] ?? "Decided by Renit";
  const view = replyView(claim, role, now);
  if (view.kind === "form" || view.kind === "dashboard") return `Waiting for Renit's decision. Reply by ${deadlineLabel(view.due, now)}.`;
  return statusBanner(claim, now).title;
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
      return fieldErrors(error).text ?? "Write your reply, then try again.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}

/** One of the two conflicts that mean the reply is already in: read the claim again instead of sending. */
export const replyAlreadyIn = (error: ApiError | null) => error?.code === "already_replied" || error?.code === "claim_decided";

// ---- Evidence --------------------------------------------------------------------------------------

/** A photo or a video, by the end of its address. Evidence from the dashboard may be either. */
export const isVideoUrl = (url: string) => /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url);

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
 * Why the damage form is not offered, or null when it is. `can` has `report_problem`
 * only once the item is back, while the 24 hours last, and while something is left of
 * the deposit (A-50): when it does not, the words say which, and point to Get help
 * where nothing can be claimed.
 */
export function damageBlocked(
  booking: Pick<BookingShop, "can" | "stage" | "claim_open" | "report_problem_until" | "money">,
  now: Date
): string | null {
  if (booking.can.includes("report_problem")) return null;
  if (booking.claim_open) return "A problem is already with Renit on this booking. Open the booking to see where it stands.";
  if (booking.stage === "out") return "A problem can be reported once the item is back and the customer has typed your code.";
  if (booking.stage === "returned" && damageMax(booking.money) <= 0) {
    return "Nothing is left of the deposit, so a damage claim can't be made. Use Get help to talk to Renit's desk.";
  }
  if (booking.report_problem_until && reached(booking.report_problem_until, now)) {
    return "The 24 hours to report a problem have passed. Use Get help to talk to Renit's desk.";
  }
  return "A problem can't be reported on this booking now.";
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
