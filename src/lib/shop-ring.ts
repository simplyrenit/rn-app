import type { ApiError } from "@/lib/api-error";
import { DeliveryMode, RingState, clock, daysLabel, momentLabel, money, rangeLabel } from "@/lib/booking";
import { correctedNow } from "@/lib/server-clock";
import type { OpenState } from "@/lib/shop";
import type { AnsweredVia, BookingShop } from "@/lib/shop-booking";

/**
 * The shop's ring (SH-01 to SH-03; API-CONTRACT OE-F, Shared objects › Ring).
 *
 * Plain functions, so every word and every decision about what the screen shows
 * can be tested. The screen holds no verdict of its own: the server says whether
 * a request is still ringing and what became of it, and `ringView` only picks
 * which of those answers to draw.
 */

export interface Ring {
  number: string;
  product: { name: string; title: string; cover_image: string | null };
  first_day: string;
  last_day: string;
  days: number;
  delivery_mode: DeliveryMode;
  customer: {
    first_name: string;
    last_initial: string;
    /** Null while no real ID check stands behind the answer (T-41): no ID line is drawn then. */
    id_checked: boolean | null;
    rentals_completed: number;
    area: string;
    distance_km: string | null;
  };
  units: { in_use: number; quantity: number };
  /** What the shop earns: rent plus delivery, less Renit's fee (charged at zero at launch). */
  you_earn: string;
  fee_shown: string;
  fee_charged: string;
  ring_state: RingState;
  ring_at: string;
  /** Null while the request waits for the shop to open. */
  ring_ends_at: string | null;
}

export type RingOutcome = "accepted" | "refused" | "cancelled" | "no_answer";

/** A ring that ended in the last five minutes, so a device that was ringing can say what happened. */
export interface RecentRing {
  number: string;
  outcome: RingOutcome;
  /** Null when nobody answered (`no_answer`, `cancelled`). */
  answered_via: AnsweredVia | null;
  device_name: string | null;
  answered_at: string | null;
  ended_at: string;
  /** True when the session that answered is the one asking (P3-9): "You accepted". */
  this_device: boolean;
  /** The session that answered; null when nobody did. */
  session_id: number | null;
}

/** `GET /api/shop/live/`. */
export interface LiveAnswer {
  server_time: string;
  poll_after_ms: number;
  open: OpenState;
  ringing: Ring[];
  waiting_to_ring: { ring_at: string; count: number; bookings: Ring[] }[];
  recent: RecentRing[];
  needs_you_count: number;
}

// ---- A push's ring --------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isText = (value: unknown): value is string => typeof value === "string" && value !== "";

/** The fields the screen cannot draw without; the rest are read defensively. */
function isRing(value: unknown): value is Ring {
  if (!isRecord(value)) return false;
  const { product, customer, units } = value;
  return (
    isText(value.number) &&
    isRecord(product) &&
    isText(product.title) &&
    isText(value.first_day) &&
    isText(value.last_day) &&
    isRecord(customer) &&
    isText(customer.first_name) &&
    isRecord(units) &&
    typeof units.in_use === "number" &&
    typeof units.quantity === "number" &&
    isText(value.you_earn)
  );
}

/**
 * The Ring a `ring` push carries in `data.ring`. A phone may hand it over as an
 * object or as JSON text, depending on the platform and on how Expo wrapped it.
 * Anything that is not a whole Ring is null: the screen then reads the live
 * answer for the number instead of drawing half a request.
 */
export function parseRing(raw: unknown): Ring | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isRing(value) ? value : null;
}

// ---- The request, in words -------------------------------------------------------

/** "Sat 24 – Mon 26 Oct · 3 days". */
export function ringDates(ring: Pick<Ring, "first_day" | "last_day" | "days">): string {
  return `${rangeLabel(ring.first_day, ring.last_day)} · ${daysLabel(ring.days)}`;
}

/** "Self pickup · Andheri East · 3.2 km". Never an address or a phone number: the ring carries none. */
export function ringWhere(ring: Pick<Ring, "delivery_mode" | "customer">): string {
  const km = ring.customer.distance_km;
  return [
    ring.delivery_mode === "pickup" ? "Self pickup" : "Delivery",
    ring.customer.area || null,
    km ? `${km} km` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** "Aarav M.". The last initial may be missing. */
export function customerName(customer: Pick<Ring["customer"], "first_name" | "last_initial">): string {
  return customer.last_initial ? `${customer.first_name} ${customer.last_initial}.` : customer.first_name;
}

/**
 * "ID checked · 3 rentals completed". The ID words only where the server says a real check was run (`id_checked` true or
 * false); with `null` (no real check stands behind the answer, T-41) or no value at all, the line is the rentals alone and
 * nothing says anything about an ID.
 */
export function customerLine(customer: Pick<Ring["customer"], "rentals_completed"> & { id_checked?: boolean | null }): string {
  const n = customer.rentals_completed;
  const rentals = n === 0 ? "No rentals completed yet" : `${n} ${n === 1 ? "rental" : "rentals"} completed`;
  if (customer.id_checked === true) return `ID checked · ${rentals}`;
  if (customer.id_checked === false) return `ID not checked yet · ${rentals}`;
  return rentals;
}

/** "2 of 5 in use on these dates": the units already promised on the fullest of these days. */
export function unitsLine(units: Ring["units"]): string {
  return `${units.in_use} of ${units.quantity} in use on these dates`;
}

/** Dots for the units, filled for those in use. A shop with more than ten of an item gets the words only. */
export function unitDots(units: Ring["units"], max = 10): boolean[] | null {
  if (units.quantity < 1 || units.quantity > max) return null;
  return Array.from({ length: units.quantity }, (_, i) => i < units.in_use);
}

/** Renit's fee as the frames draw it: the fee that was shown, crossed out, and what is charged. */
export function feeText(ring: Pick<Ring, "fee_shown" | "fee_charged">): { struck: string | null; charged: string } {
  const shown = Number(ring.fee_shown);
  return {
    struck: Number.isFinite(shown) && shown > 0 && shown !== Number(ring.fee_charged) ? money(ring.fee_shown) : null,
    charged: money(ring.fee_charged),
  };
}

// ---- What became of a request ---------------------------------------------------

/** A system refusal's reason (ARCHITECTURE 4.2). */
export type SystemReason = "no_unit" | "cannot_accept" | "too_late";

export interface RingEnding {
  outcome: RingOutcome;
  /** Where it was answered: "the dashboard", "Owner's phone", "this phone". Null when nobody did. */
  where: string | null;
  /** When it was answered, or ended. */
  at: string | null;
  /** The request was ended for the shop (no unit left, it opened too late), not answered by a person. */
  system: boolean;
  reason: SystemReason | null;
  /** Why Accept is not open to this shop yet: `bank_account`, `id_check`. */
  missing: string[];
  /** After "Can't do it": what became of the dates the shop asked to block. */
  block: "blocked" | "none_free" | "not_asked" | null;
  /** This phone's own session gave the answer: "You accepted", not "Accepted on another device". */
  thisDevice: boolean;
  /** An accepted request: by when the customer has been asked to pay the rent ("4:31 pm"), if known. */
  rentBy: string | null;
}

const ENDING: RingEnding = {
  outcome: "refused",
  where: null,
  at: null,
  system: false,
  reason: null,
  missing: [],
  block: null,
  thisDevice: false,
  rentBy: null,
};

/** Where an answer came from, in words. `this_device` beats the name, which may be this phone's own. */
export function whereText(via: AnsweredVia | null, deviceName: string | null, thisDevice = false): string | null {
  if (thisDevice) return "this phone";
  switch (via) {
    case "dashboard":
      return deviceName ? `the dashboard (${deviceName})` : "the dashboard";
    case "phone":
      return deviceName || "another phone";
    case "admin":
      // Renit's staff answered from the admin (P3-6): the server names who ("Renit staff (Meera)").
      return deviceName || "Renit";
    default:
      return null;
  }
}

/** This phone's own answer, from what the server sent back. */
export function hereEnding(
  outcome: "accepted" | "refused",
  at: string | null,
  block: RingEnding["block"] = null,
  rentBy: string | null = null
): RingEnding {
  return { ...ENDING, outcome, where: "this phone", at, block, thisDevice: true, rentBy };
}

/** A `recent` entry of the live answer. */
export function endingFromRecent(recent: RecentRing): RingEnding {
  return {
    ...ENDING,
    outcome: recent.outcome,
    where: whereText(recent.answered_via, recent.device_name, recent.this_device),
    at: recent.answered_at ?? recent.ended_at,
    system: recent.answered_via === "system",
    thisDevice: recent.this_device,
  };
}

const OUTCOMES: readonly string[] = ["accepted", "refused", "cancelled", "no_answer"];

/** What a `ring_ended` push carries in `data` (API-CONTRACT, Push notifications). */
export interface RingEndPush {
  outcome: RingOutcome;
  answered_via: AnsweredVia | null;
  device_name: string | null;
  answered_at: string | null;
  /** The session that answered. The push cannot know which phone reads it, so a phone compares this with its own. */
  session_id: number | null;
}

/** The fields of a `ring_ended` push. A push that says nothing of the outcome is not read as one. */
export function parseRingEnd(data: unknown): RingEndPush | null {
  if (!isRecord(data) || typeof data.outcome !== "string" || !OUTCOMES.includes(data.outcome)) return null;
  const text = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  const sid = typeof data.session_id === "string" && data.session_id !== "" ? Number(data.session_id) : data.session_id;
  return {
    outcome: data.outcome as RingOutcome,
    answered_via: text(data.answered_via) as AnsweredVia | null,
    device_name: text(data.device_name),
    answered_at: text(data.answered_at),
    session_id: typeof sid === "number" && Number.isInteger(sid) ? sid : null,
  };
}

/**
 * A `ring_ended` push as an ending, for a ring screen that is open: it is told at
 * once, without waiting for the next read of the live answer. The push's `session_id`
 * is compared with this phone's own (`ownSession`, from its sign-in) to say "You
 * accepted" or "Accepted on …". With either unknown nothing is claimed for this phone.
 */
export function endingFromPush(push: RingEndPush, ownSession: number | null): RingEnding {
  const thisDevice = ownSession !== null && push.session_id !== null && push.session_id === ownSession;
  return {
    ...ENDING,
    outcome: push.outcome,
    where: whereText(push.answered_via, push.device_name, thisDevice),
    at: push.answered_at,
    system: push.answered_via === "system",
    thisDevice,
  };
}

/**
 * "4:31 pm": by when the customer has been asked to pay the rent (`money.rent_due_at`,
 * set at Accept; API-CONTRACT P3-13), with the day when it is not today. Today is the
 * server's today: the phone's clock is corrected by the booking's `server_time` (P3-17).
 * Null before the accept. No number of minutes is written: the deadline says it.
 */
export function rentByLabel(
  booking: Pick<BookingShop, "money" | "server_time">,
  receivedAt: number = Date.now()
): string | null {
  const due = booking.money.rent_due_at;
  if (!due) return null;
  return momentLabel(due, correctedNow(booking.server_time, receivedAt)) || null;
}

const isSystemReason = (value: unknown): value is SystemReason =>
  value === "no_unit" || value === "cannot_accept" || value === "too_late";

/**
 * A finished request read from the booking itself: an old push tapped long after
 * the five minutes `recent` remembers. Null when the booking is still ringing or
 * waiting for the shop to open (it is simply not ringing now). `receivedAt` is when
 * the booking was read, for the clock the pay-by time is worked out on.
 */
export function endingFromBooking(booking: BookingShop, receivedAt: number = Date.now()): RingEnding | null {
  const answered = booking.answered;
  const where = answered ? whereText(answered.via, answered.device_name, answered.this_device) : null;
  const mine = Boolean(answered?.this_device);
  switch (booking.exit) {
    case "refused":
      return {
        ...ENDING,
        outcome: "refused",
        where,
        at: answered?.at ?? null,
        system: answered?.via === "system",
        reason: isSystemReason(booking.exit_reason) ? booking.exit_reason : null,
        thisDevice: mine,
      };
    case "no_answer":
      return { ...ENDING, outcome: "no_answer" };
    case "cancelled_by_customer":
      // Cancelled while it rang is the ring's ending; cancelled after the accept is a booking that went on.
      if (!answered) return { ...ENDING, outcome: "cancelled" };
      break;
  }
  if (answered) {
    return { ...ENDING, outcome: "accepted", where, at: answered.at, thisDevice: mine, rentBy: rentByLabel(booking, receivedAt) };
  }
  return null;
}

/**
 * What a refused tap means, when the refusal is itself an ending: the answer to
 * Accept or Can't do it that says the request is over. Null for every other
 * failure (the connection, a server fault), which leave the request ringing.
 */
export function endingFromError(error: ApiError | null): RingEnding | null {
  if (!error) return null;
  const details = error.details ?? {};
  switch (error.code) {
    case "ring_ended": {
      const outcome = details.outcome;
      const via = typeof details.answered_via === "string" ? (details.answered_via as AnsweredVia) : null;
      return {
        ...ENDING,
        outcome:
          outcome === "accepted" || outcome === "refused" || outcome === "cancelled" || outcome === "no_answer"
            ? outcome
            : "no_answer",
        where: whereText(via, typeof details.device_name === "string" ? details.device_name : null),
        at: typeof details.answered_at === "string" ? details.answered_at : null,
        system: via === "system",
      };
    }
    case "no_unit_free":
      // The request was ended in the same step, by the system: no mark, no missed request.
      return { ...ENDING, system: true, reason: "no_unit" };
    case "cannot_accept": {
      const missing = Array.isArray(details.missing) ? details.missing.filter((m) => typeof m === "string") : [];
      return { ...ENDING, system: true, reason: "cannot_accept", missing: missing as string[] };
    }
    default:
      return null;
  }
}

const MISSING_WORDS: Record<string, string> = {
  bank_account: "a verified bank account",
  id_check: "a passed ID check",
};

/** "a verified bank account and a passed ID check". */
export function missingText(missing: string[]): string {
  const words = missing.map((m) => MISSING_WORDS[m] ?? m.replace(/_/g, " "));
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : words[0] ?? "";
}

export interface EndingCopy {
  title: string;
  sub: string;
}

/**
 * The words for a request that is over, for another device's answer (SH-03) and
 * for the ones nobody answered. `here` is this phone's own answer: "You accepted",
 * decided by the server (`this_device`) or by comparing the push's `session_id`
 * with this phone's own (P3-14), never by the device's name.
 */
export function endingCopy(ending: RingEnding, firstName: string | null, here: boolean = ending.thisDevice): EndingCopy {
  const who = firstName || "The customer";
  const at = clock(ending.at);
  const when = at ? ` at ${at}` : "";

  if (ending.system) {
    const sub =
      ending.reason === "cannot_accept"
        ? `Renit can't pass bookings to you until you have ${missingText(ending.missing) || "finished setting up"}. This isn't counted against you.`
        : ending.reason === "too_late"
        ? "The shop opened too late for these dates. This isn't counted against you."
        : ending.reason === "no_unit"
        ? "No unit is free any more: the last one went to another booking. This isn't counted against you."
        : "Renit ended it. This isn't counted against you.";
    return { title: "This request has ended", sub };
  }

  switch (ending.outcome) {
    case "accepted":
      return {
        title: here ? "You accepted this booking" : `Accepted on ${ending.where ?? "another device"}${when}`,
        sub: ending.rentBy
          ? `${who} has been asked to pay the rent by ${ending.rentBy}.`
          : `${who} has been asked to pay the rent.`,
      };
    case "refused": {
      const sub =
        ending.block === "blocked"
          ? `${who} has been told. The dates are blocked for one unit. A refusal carries no penalty.`
          : ending.block === "none_free"
          ? `${who} has been told. No unit was free to block, so nothing was blocked. A refusal carries no penalty.`
          : `${who} has been told. A refusal carries no penalty.`;
      return {
        title: here ? "You said you can't do it" : `Refused on ${ending.where ?? "another device"}${when}`,
        sub,
      };
    }
    case "cancelled":
      return { title: "This request has ended", sub: `${who} cancelled it.` };
    default:
      return { title: "This request has ended", sub: "It wasn't answered in time." };
  }
}

// ---- The ring screen's state --------------------------------------------------------

export type RingView =
  /** Accept and Can't do it are open. */
  | { kind: "ringing"; ring: Ring }
  /** This phone's own answer. */
  | { kind: "here"; ending: RingEnding }
  /** Someone else's answer, or no answer. */
  | { kind: "ended"; ending: RingEnding }
  /** Neither ringing nor remembered: the booking itself is read. */
  | { kind: "unknown" }
  | { kind: "loading" }
  | { kind: "failed" };

/**
 * What to draw. In order of trust: this phone's own answer, then what the server
 * said to a tap, then the live answer (the ring if it is still ringing, its ending
 * if it ended in the last five minutes), and only without any live answer yet the
 * ring the push carried. That last one lets the owner answer at once on a tap
 * from a closed app; it is safe because the server checks every tap.
 */
export function ringView(input: {
  number: string;
  pushed: Ring | null;
  live: LiveAnswer | null | undefined;
  liveFailed: boolean;
  here: RingEnding | null;
  ended: RingEnding | null;
}): RingView {
  if (input.here) return { kind: "here", ending: input.here };
  if (input.ended) return { kind: "ended", ending: input.ended };
  if (input.live) {
    const ring = input.live.ringing.find((r) => r.number === input.number);
    if (ring) return { kind: "ringing", ring };
    const recent = input.live.recent.find((r) => r.number === input.number);
    if (recent) return { kind: "ended", ending: endingFromRecent(recent) };
    return { kind: "unknown" };
  }
  if (input.pushed) return { kind: "ringing", ring: input.pushed };
  return input.liveFailed ? { kind: "failed" } : { kind: "loading" };
}

/**
 * Whether the booking itself must be read to draw this view. Always for `unknown`
 * (the request is neither ringing nor remembered by the live answer): whether or not
 * a ring was carried in, the carried ring is old news then, and only the booking says
 * what became of the request (review round 1, finding 1). Also for an ended view with
 * no ring to draw the card from, and for an accepted one still without its pay-by time.
 */
export function shouldReadBooking(view: RingView, hasRing: boolean): boolean {
  switch (view.kind) {
    case "unknown":
      return true;
    case "ended":
    case "here":
      return !hasRing || (view.ending.outcome === "accepted" && !view.ending.system && !view.ending.rentBy);
    default:
      return false;
  }
}

/**
 * The requests whose ring screen is still waiting for an answer: it is in its ringing view,
 * or a tap is in flight. The ring screen says so (`markAnswering`); nothing else reads it but
 * `ringTakesScreen`.
 */
const answering = new Set<string>();

export function markAnswering(number: string, on: boolean): void {
  if (on) answering.add(number);
  else answering.delete(number);
}

/**
 * Whether a ring that arrives with the app open may take the screen over. Not while the ring
 * on top is still waiting for an answer: the owner may be about to tap Accept there, and the
 * same button sits in the same place on the next ring (review round 1, finding 6). The new
 * request waits as "1 more request" on that screen. A ring screen that has nothing left to
 * answer ("You accepted", "This request has ended", loading, failed) is not held: the next
 * request opens over it (review round 2, finding 1). With no number to say which ring it is,
 * the screen is treated as waiting, as it was.
 */
export function ringTakesScreen(
  currentRoute: string | null | undefined,
  number?: string | null,
  waiting: ReadonlySet<string> = answering
): boolean {
  if (currentRoute !== "ShopRing") return true;
  return number != null && !waiting.has(number);
}

/** The other requests that are ringing now, for "1 more request is waiting" on the one on screen. */
export function otherRings(live: LiveAnswer | null | undefined, number: string): Ring[] {
  return (live?.ringing ?? []).filter((r) => r.number !== number);
}

export function moreText(count: number): string {
  return count === 1 ? "1 more request is waiting" : `${count} more requests are waiting`;
}

/**
 * Whether the live answer is still worth reading for this request: until it is
 * seen, and while it is ringing. Once it has ended or dropped out of the ring
 * the screen has what it came for (an unknown one is settled by the booking itself).
 */
export function liveStillMatters(live: LiveAnswer | undefined, number: string): boolean {
  return !live || live.ringing.some((r) => r.number === number);
}

/** What the answered and ended views show of the request: the card of SH-03. */
export interface RingSummary {
  title: string;
  image: string | null;
  /** "Sat 24 – Mon 26 Oct". */
  range: string;
  /** "Sat 24 – Mon 26 Oct · 3 days". */
  dates: string;
  /** "Self pickup · Aarav M.". */
  how: string;
  firstName: string;
  earn: string;
}

export function summaryOfRing(ring: Ring): RingSummary {
  return {
    title: ring.product.title,
    image: ring.product.cover_image,
    range: rangeLabel(ring.first_day, ring.last_day),
    dates: ringDates(ring),
    how: `${ring.delivery_mode === "pickup" ? "Self pickup" : "Delivery"} · ${customerName(ring.customer)}`,
    firstName: ring.customer.first_name,
    earn: money(ring.you_earn),
  };
}

export function summaryOfBooking(booking: BookingShop): RingSummary {
  return {
    title: booking.product.title,
    image: booking.product.cover_image,
    range: rangeLabel(booking.first_day, booking.last_day),
    dates: ringDates(booking),
    how: `${booking.delivery_mode === "pickup" ? "Self pickup" : "Delivery"} · ${customerName(booking.customer)}`,
    firstName: booking.customer.first_name,
    earn: money(booking.money.you_earn),
  };
}

// ---- Can't do it ------------------------------------------------------------------

export type RefuseReason = "not_available" | "other";

/** The body of `POST …/refuse/`. `block_dates` is read only with `not_available`. */
export function refuseBody(reason: RefuseReason, block: boolean): { reason: RefuseReason; block_dates: boolean } {
  return { reason, block_dates: reason === "not_available" && block };
}

/** What became of the block after a refusal: `block` is null when no unit was free to take. */
export function blockResult(asked: boolean, block: unknown): RingEnding["block"] {
  if (!asked) return "not_asked";
  return block ? "blocked" : "none_free";
}

/** The line under a tap that did not go through and did not end the request. */
export function answerErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "rate_limited":
      return "Too many taps. Wait a moment and try again.";
    case "not_owner":
    case "not_shop_owner":
    case "forbidden":
      return "This account can't answer bookings.";
    default:
      return "Something went wrong on our side. Try again.";
  }
}

/** Whether a failed tap may still have reached the server: no answer at all, or a server fault. */
export function outcomeUnknown(error: ApiError | null): boolean {
  return !error || error.status === 0 || error.status >= 500;
}
