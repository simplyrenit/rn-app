/**
 * Live booking, the customer's side (API-CONTRACT OE-C; ARCHITECTURE 4 and 10).
 * The contract's objects as types, and the plain functions the screens draw from,
 * so the words, the sums on screen and the choice of screen can be tested.
 *
 * Money is a string of rupees ("1830.00"), a day is `YYYY-MM-DD` in India, an
 * instant is UTC and is shown in India time. The server works every amount out;
 * nothing here adds money up, it only says what the server sent.
 */
import { ApiError } from "@/lib/api-error";
import { formatCurrency } from "@/lib/format";
import { DayHours, Hours, hoursRows, istDay, kmText } from "@/lib/shop";

export type DeliveryMode = "pickup" | "owner_delivery";

/** A run of days, both ends included. */
export interface DayRun {
  start_date: string;
  end_date: string;
}

/** `shop` on a public product (API-CONTRACT, Product for customers). */
export interface ProductShop {
  name: string;
  locality: string;
  hours: Hours;
  is_open: boolean;
  opens_at: string | null;
  min_notice_hours: number;
  delivers: boolean;
  delivery_base_fee: string;
  delivery_per_km: string;
  delivery_max_km: string;
}

/** What a booking screen needs to name the thing being booked. Small, so it can ride in route params. */
export interface BookItem {
  name: string;
  title: string;
  cover_image: string | null;
  shop_name: string;
}

/** `POST /api/bookings/quote/`. */
export interface Quote {
  product: string;
  first_day: string;
  last_day: string;
  days: number;
  delivery_mode: DeliveryMode;
  rate: string;
  rent: string;
  delivery: {
    status: "not_asked" | "ok" | "too_far" | "not_offered";
    fee: string;
    distance_km: string | null;
    offer_pickup: boolean;
  };
  fee_shown: string;
  fee_charged: string;
  total: string;
  pay_now: string;
  pay_after_accept: string;
  deposit: { amount: string; with_rent: boolean; due_on: string | null; refundable: boolean };
  units_free: number;
  shop: {
    is_open: boolean;
    opens_at: string | null;
    book_for_morning: boolean;
    hours_first_day: DayHours | null;
  };
  /** Null when signed out. */
  id_check: { needed: "none" | "id" | "id_and_match"; passed: boolean } | null;
  terms: { version: string; url: string; accepted: boolean } | null;
  can_book: boolean;
  blockers: string[];
}

export type PaymentPurpose = "booking_amount" | "rent" | "rent_and_deposit" | "deposit";

/** What the app needs to take one payment (API-CONTRACT, PaymentStart). */
export interface PaymentStart {
  payment_id: string;
  purpose: PaymentPurpose;
  amount: string;
  deposit_part: string;
  checkout_url: string;
  expires_at: string;
  return_url: string;
}

/** One payment or refund on a booking (N16). */
export interface MoneyRow {
  id: string;
  kind: "payment" | "refund";
  what: PaymentPurpose;
  amount: string;
  /** Payment: created, failed, paid, expired, cancelled. Refund: pending, processed, failed. */
  status: string;
  /** How it was paid, or where the refund is going. */
  text: string | null;
  expected_days_min: number | null;
  expected_days_max: number | null;
  expected_by: string | null;
  at: string;
}

export type BookingStage =
  | "ringing"
  | "accepted"
  | "confirmed"
  | "ready"
  | "out"
  | "returned"
  | "closed";

export type RingState =
  | ""
  | "awaiting_payment"
  | "waiting_to_open"
  | "ringing"
  | "calling"
  | "ringing_again";

export type BookingExit =
  | ""
  | "refused"
  | "no_answer"
  | "cancelled_by_customer"
  | "lapsed_unpaid"
  | "cancelled_by_owner"
  | "no_show";

export interface TimeWindow {
  start: string;
  end: string;
}

/** A booking as its customer sees it (API-CONTRACT, BookingCustomer). */
export interface BookingCustomer {
  number: string;
  stage: BookingStage;
  ring_state: RingState;
  exit: BookingExit;
  exit_reason: string;
  is_open: boolean;
  product: { name: string; title: string; cover_image: string | null };
  shop: {
    name: string;
    locality: string;
    hours_first_day: DayHours | null;
    hours_last_day: DayHours | null;
    opens_at: string | null;
    address: string | null;
    coordinates: { lat: number; long: number } | null;
  };
  first_day: string;
  last_day: string;
  days: number;
  delivery_mode: DeliveryMode;
  distance_km: string | null;
  delivery_address: unknown;
  money: {
    rate: string;
    rent: string;
    delivery_fee: string;
    fee_shown: string;
    fee_charged: string;
    total: string;
    booking_amount: string;
    /** unpaid, paid, moved, refund_requested, refunded, kept */
    booking_amount_state: string;
    pay_after_accept: string;
    rent_due_at: string | null;
    rent_paid: boolean;
    deposit: string;
    deposit_with_rent: boolean;
    /** none, not_due, due, paid, carried, settled, forfeited */
    deposit_state: string;
    deposit_ask_at: string | null;
    deposit_due_at: string | null;
    deposit_refund_due_at: string | null;
    late_days: number;
    late_fee: string;
    damage_deduction: string;
  };
  pay_now: { purpose: PaymentPurpose; amount: string; deposit_part: string; due_at: string | null } | null;
  payments: MoneyRow[];
  pick_deadline_at: string | null;
  cancels_left_today: number;
  window: TimeWindow | null;
  window_request: { by: "owner" | "customer"; start: string; end: string; asked_at: string } | null;
  return_by: string | null;
  id_match_required: boolean;
  can: string[];
  timeline: { event: string; label: string; at: string; by: string }[];
  created_at: string;
}

// ---- Days and times ---------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

/** A day as UTC midnight: for counting and weekdays only, never shown through a time zone. */
function dayMs(day: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(day ?? "");
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : NaN;
}

const msDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(day: string, n: number): string {
  return msDay(dayMs(day) + n * DAY_MS);
}

/** Rental days, both ends counted: a rental day is a calendar day. */
export function dayCount(firstDay: string, lastDay: string): number {
  return Math.round((dayMs(lastDay) - dayMs(firstDay)) / DAY_MS) + 1;
}

export const daysLabel = (n: number) => (n === 1 ? "1 day" : `${n} days`);

/** Today in India: the first day anyone can book. */
export const todayIst = (now: Date = new Date()) => istDay(now);

/** "2026-10-24" → "Sat 24 Oct". */
export function dayShort(day: string): string {
  const d = new Date(dayMs(day));
  if (Number.isNaN(d.getTime())) return "";
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "2026-10-24" → "Sat 24 October", the arrival window's heading. */
export function dayLong(day: string): string {
  const d = new Date(dayMs(day));
  if (Number.isNaN(d.getTime())) return "";
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]}`;
}

/**
 * "Sat 24 – Mon 26 Oct", "Sat 31 Oct – Mon 2 Nov", and one day as "Sat 24 Oct".
 * The month is said once when both ends share it, as the frames do.
 */
export function rangeLabel(firstDay: string, lastDay: string, withYear = false): string {
  const first = new Date(dayMs(firstDay));
  const last = new Date(dayMs(lastDay));
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return "";
  const year = withYear ? ` ${last.getUTCFullYear()}` : "";
  if (firstDay === lastDay) return `${dayShort(firstDay)}${year}`;
  const sameMonth =
    first.getUTCMonth() === last.getUTCMonth() && first.getUTCFullYear() === last.getUTCFullYear();
  const start = sameMonth ? `${WEEKDAYS[first.getUTCDay()]} ${first.getUTCDate()}` : dayShort(firstDay);
  return `${start} – ${dayShort(lastDay)}${year}`;
}

/** An instant as a clock time in India: "10:13 am". Always with minutes, as the frames write it. */
export function clock(iso: string | null | undefined): string {
  const at = new Date(iso ?? "");
  if (Number.isNaN(at.getTime())) return "";
  const ist = new Date(at.getTime() + IST_OFFSET_MS);
  const hour = ist.getUTCHours();
  return `${hour % 12 || 12}:${pad(ist.getUTCMinutes())} ${hour < 12 ? "am" : "pm"}`;
}

/** The India day an instant falls on. */
export function dayOf(iso: string | null | undefined): string | null {
  const at = new Date(iso ?? "");
  return Number.isNaN(at.getTime()) ? null : istDay(at);
}

/**
 * An instant as a time and the day said the way a person would: "today",
 * "tomorrow", or "on Tue 13 Oct". Two parts, because the frames order them both
 * ways ("at 10:00 am tomorrow", "tomorrow at 10:00 am").
 */
export function timeAndDay(iso: string, now: Date = new Date()): { time: string; day: string } | null {
  const day = dayOf(iso);
  if (!day) return null;
  const ahead = Math.round((dayMs(day) - dayMs(todayIst(now))) / DAY_MS);
  return {
    time: clock(iso),
    day: ahead === 0 ? "today" : ahead === 1 ? "tomorrow" : `on ${dayShort(day)}`,
  };
}

export const money = (value: string | number | null | undefined) => formatCurrency(value);

/** How the item changes hands, as the summary line says it: "Self pickup", "Delivery to Home". */
export function howLabel(mode: DeliveryMode, addressName?: string | null): string {
  if (mode === "pickup") return "Self pickup";
  return addressName ? `Delivery to ${addressName}` : "Delivery";
}

/** A booking's dates as the summary line: "Sat 24 – Mon 26 Oct 2026 · 3 days". */
export function datesLine(booking: { first_day: string; last_day: string; days: number }): string {
  return `${rangeLabel(booking.first_day, booking.last_day, true)} · ${daysLabel(booking.days)}`;
}

const isPositive = (value: string | null | undefined) => Number(value) > 0;

// ---- Picking dates (BK-02) ----------------------------------------------------------

/** Every day inside the runs: the days with no unit free. */
export function bookedDays(runs: DayRun[] | null | undefined): Set<string> {
  const days = new Set<string>();
  for (const run of runs ?? []) {
    const first = dayMs(run.start_date);
    const last = dayMs(run.end_date);
    if (Number.isNaN(first) || Number.isNaN(last)) continue;
    // A run is at most the 180 days the server looks ahead; the cap is against bad data.
    for (let ms = first, n = 0; ms <= last && n < 400; ms += DAY_MS, n++) days.add(msDay(ms));
  }
  return days;
}

/** True when no day from first to last is in `taken`. */
export function rangeIsFree(firstDay: string, lastDay: string, taken: Set<string>): boolean {
  for (let ms = dayMs(firstDay); ms <= dayMs(lastDay); ms += DAY_MS) {
    if (taken.has(msDay(ms))) return false;
  }
  return true;
}

export interface PickedDays {
  first: string;
  /** Null until a second day is tapped; the rental is then that one day. */
  last: string | null;
}

/**
 * What a tap on the calendar does. The first tap is a one-day rental; a later
 * day extends it; anything else (a day before the start, or a third tap) starts
 * again. `blocked` is true when the stretch would cross a day that is taken: the
 * tapped day then becomes the new start.
 */
export function tapDay(
  picked: PickedDays | null,
  day: string,
  taken: Set<string>
): { picked: PickedDays; blocked: boolean } {
  if (!picked || picked.last || day < picked.first) return { picked: { first: day, last: null }, blocked: false };
  if (!rangeIsFree(picked.first, day, taken)) return { picked: { first: day, last: null }, blocked: true };
  return { picked: { first: picked.first, last: day }, blocked: false };
}

/**
 * The searched range as days. Search keeps it as ISO instants made from the
 * calendar's own day (UTC midnight), so the first ten characters are the day
 * that was tapped. A range that has started in the past is dropped.
 */
export function searchedDays(
  range: { startDate?: string | null; endDate?: string | null } | null | undefined,
  now: Date = new Date()
): { first_day: string; last_day: string } | undefined {
  const first = (range?.startDate ?? "").slice(0, 10);
  const last = (range?.endDate ?? "").slice(0, 10);
  if (Number.isNaN(dayMs(first)) || Number.isNaN(dayMs(last))) return undefined;
  if (last < first || first < todayIst(now)) return undefined;
  return { first_day: first, last_day: last };
}

/** The delivery choice on BK-02: "Delivery to Home · ₹170 · 8 km". */
export function deliveryOption(
  quote: Pick<Quote, "delivery"> | null | undefined,
  addressName: string
): { title: string; sub: string | null; ok: boolean } {
  const to = `Delivery to ${addressName}`;
  if (!quote) return { title: to, sub: null, ok: true };
  const { status, fee, distance_km } = quote.delivery;
  if (status === "too_far") {
    return { title: `${to} · too far`, sub: "The shop does not deliver that far. You can pick it up.", ok: false };
  }
  if (status === "not_offered") {
    return { title: "Delivery", sub: "This item is not delivered. You can pick it up.", ok: false };
  }
  const parts = [to, money(fee), distance_km ? kmText(distance_km) : null].filter(Boolean);
  return { title: parts.join(" · "), sub: null, ok: true };
}

// ---- The product page (BK-01) ---------------------------------------------------------

/** The shop's name; a listing from a server without `shop` falls back to its owner. */
export function shopNameOf(product: {
  shop?: { name?: string } | null;
  owner?: { business_name?: string; first_name?: string; last_name?: string } | null;
}): string {
  return (
    product.shop?.name ||
    product.owner?.business_name ||
    [product.owner?.first_name, product.owner?.last_name].filter(Boolean).join(" ") ||
    "the owner"
  );
}

/** "Handover 10 am – 8 pm", with the days when the week is not all the same. */
export function handoverLine(hours: Hours | null | undefined): string | null {
  const rows = hoursRows(hours);
  const open = rows.filter((row) => row.value !== "Closed");
  if (open.length === 0) return null;
  if (open.length === 1) {
    return rows.length === 1
      ? `Handover ${open[0].value}`
      : `Handover ${open[0].value} · ${open[0].label}`;
  }
  return `Handover ${open.map((row) => `${row.label} ${row.value}`).join(", ")}`;
}

/** "Self pickup or delivery from ₹50". A product marked not delivered is pickup only. */
export function getItLine(shop: ProductShop | null | undefined, notDelivered?: boolean): string {
  return shop?.delivers && !notDelivered
    ? `Self pickup or delivery from ${money(shop.delivery_base_fee)}`
    : "Self pickup";
}

export interface LiveCopy {
  kind: "live" | "morning";
  title: string;
  body: string;
  /** The bar's button. */
  button: string;
}

/**
 * What the product page says about booking, or null when the listing cannot be
 * booked now (the contract: neither flag set, no Book now). No number of minutes,
 * ever: the promise is that the owner is asked now.
 */
export function liveCopy(
  product: { live_booking?: boolean; book_for_morning?: boolean; shop?: ProductShop | null },
  now: Date = new Date()
): LiveCopy | null {
  if (product.live_booking) {
    return {
      kind: "live",
      title: "Live booking",
      body: "The owner is asked now and answers while you wait",
      button: "Book now",
    };
  }
  if (product.book_for_morning) {
    const opens = product.shop?.opens_at ? timeAndDay(product.shop.opens_at, now) : null;
    return {
      kind: "morning",
      title: "Closed now",
      body: opens
        ? `The owner is closed and will be asked when they open, at ${opens.time} ${opens.day}.`
        : "The owner is closed and will be asked when they open.",
      button: "Book for the morning",
    };
  }
  return null;
}

// ---- The price before Book now (BK-03, BK-11) -----------------------------------------

export interface PriceLine {
  label: string;
  amount: string;
  /** Shown crossed out before the amount: Renit's fee, charged at zero. */
  struck?: string;
}

/** The three lines above the total. The fee is always shown, crossed out when less is charged. */
export function priceLines(quote: Quote): PriceLine[] {
  const fee: PriceLine = { label: "Renit's fee", amount: money(quote.fee_charged) };
  if (Number(quote.fee_shown) !== Number(quote.fee_charged)) fee.struck = money(quote.fee_shown);
  return [
    { label: `Rent · ${daysLabel(quote.days)} × ${money(quote.rate)}`, amount: money(quote.rent) },
    { label: "Delivery", amount: money(quote.delivery.fee) },
    fee,
  ];
}

/** "Total rent" as the frame says; plain "Total" once a delivery fee is in it. */
export const totalLabel = (quote: Quote) => (isPositive(quote.delivery.fee) ? "Total" : "Total rent");

/** True when the shop is closed and will be asked at its next opening. */
export const isForMorning = (quote: Pick<Quote, "shop">) => !quote.shop.is_open && quote.shop.book_for_morning;

/**
 * The plan's rent rule (N3), as BK-03 writes it. It is the one stated length of
 * time the customer reads, and it is about their own payment, never about how
 * long the owner takes.
 */
const RENT_WINDOW = "Within 30 minutes";

export interface PayStep {
  title: string;
  sub: string;
  amount: string;
}

/** "What you pay, and when". `moved`: the ₹99 of an earlier request moves here (N2). */
export function paySteps(quote: Quote, moved = false, now: Date = new Date()): PayStep[] {
  const steps: PayStep[] = [
    {
      title: "Now",
      sub: moved ? "Already paid · it moves to this booking" : "Counts toward the rent",
      amount: money(quote.pay_now),
    },
  ];
  if (isPositive(quote.pay_after_accept)) {
    const opens = isForMorning(quote) && quote.shop.opens_at ? timeAndDay(quote.shop.opens_at, now) : null;
    steps.push({
      title: "After the owner accepts",
      sub: opens ? `They are asked ${opens.day} at ${opens.time}` : RENT_WINDOW,
      amount: money(quote.pay_after_accept),
    });
  }
  if (isPositive(quote.deposit.amount)) {
    steps.push({
      title: "Deposit",
      sub: quote.deposit.with_rent
        ? "Refundable · paid with the rent"
        : quote.deposit.due_on
          ? `Refundable · due ${dayShort(quote.deposit.due_on)}`
          : "Refundable",
      amount: money(quote.deposit.amount),
    });
  }
  return steps;
}

/** The plain lines under the sums: cancelling, late days, early return. */
export function plainLines(quote: Quote): string[] {
  const handover = quote.delivery_mode === "owner_delivery" ? "delivery" : "pickup";
  const amount = money(quote.pay_now);
  const morning = isForMorning(quote);
  return [
    ...(morning ? [`Changed your mind? Cancel any time before they open and the ${amount} comes back.`] : []),
    morning
      ? `Cancel free until 24 hours before ${handover}. After they open, the ${amount} is not returned.`
      : `Cancel free until 24 hours before ${handover}. The ${amount} is not returned.`,
    "Each late day costs one day's rent.",
    "Returning early gives no refund.",
  ];
}

/** The closed notice of BK-11: the bold start and the rest. */
export function morningNotice(
  quote: Pick<Quote, "shop">,
  shopName: string,
  now: Date = new Date()
): { lead: string; rest: string } | null {
  if (!isForMorning(quote)) return null;
  const opens = quote.shop.opens_at ? timeAndDay(quote.shop.opens_at, now) : null;
  return {
    lead: `${shopName} is closed now.`,
    rest: opens
      ? `They will be asked at ${opens.time} ${opens.day}, and we'll tell you the moment they answer.`
      : "They will be asked when they open, and we'll tell you the moment they answer.",
  };
}

/** "Book now · Pay ₹99"; nothing to pay when the ₹99 moves. */
export function bookLabel(quote: Quote, moved = false): string {
  const verb = isForMorning(quote) ? "Book for the morning" : "Book now";
  return moved ? verb : `${verb} · Pay ${money(quote.pay_now)}`;
}

// ---- The terms tick (ENG-175) -------------------------------------------------------------

/**
 * Whether the tick stands. It is remembered with the version it was given for,
 * so when the terms change under an open screen the box is empty again by
 * itself. It always starts empty: the customer agrees for each booking, and the
 * server stores that agreement with the booking.
 */
export function termsTicked(terms: Quote["terms"], tickedFor: string | null): boolean {
  return terms !== null && tickedFor !== null && tickedFor === terms.version;
}

// ---- The ID check (ENG-176) ---------------------------------------------------------------

export interface IdCheckCopy {
  state: "needed" | "passed";
  title: string;
  body: string | null;
}

const SAME_ID = "Bring the same ID to the handover. The owner checks that it matches.";

/**
 * What the price screen says about the ID check, or null when the item needs
 * none (or the customer is signed out and the quote cannot say).
 *
 * "Needed" comes from any of three places: the quote's `id_check`, its
 * `blockers`, or Book now answering `403 id_check_needed`, whose `details.needed`
 * is passed as `refused`. No rupee figure is written: where the line falls is
 * the server's setting.
 */
export function idCheckCopy(
  quote: Pick<Quote, "id_check" | "blockers">,
  refused: string | null = null
): IdCheckCopy | null {
  const level = refused ?? quote.id_check?.needed ?? "none";
  const notPassed =
    refused !== null ||
    quote.blockers.includes("id_check_needed") ||
    (quote.id_check !== null && quote.id_check.needed !== "none" && !quote.id_check.passed);
  if (notPassed) {
    return {
      state: "needed",
      title: "This item needs an ID check",
      body:
        level === "id_and_match"
          ? `Renit checks your ID once, before you book an item like this. ${SAME_ID}`
          : "Renit checks your ID once, before you book an item like this. It then covers every booking.",
    };
  }
  if (quote.id_check && quote.id_check.needed !== "none") {
    return { state: "passed", title: "ID check passed", body: level === "id_and_match" ? SAME_ID : null };
  }
  return null;
}

// ---- Why Book now would fail ------------------------------------------------------------

/** Blockers with their own place on the screen (the tick, the ID check card). */
const OWN_PLACE = new Set(["terms_not_accepted", "id_check_needed"]);

/** Blockers that picking other dates or another way to get it can fix. */
const FIXED_BY_DATES = new Set([
  "own_product",
  "no_unit_free",
  "closed_that_day",
  "closed_on_return_day",
  "notice_too_short",
  "owner_cannot_accept",
  "too_far",
  "delivery_not_offered",
]);

/** A blocker or a Book now error code in plain words; null for one this list does not know. */
export function blockerText(code: string, details?: Record<string, unknown> | null): string | null {
  switch (code) {
    case "own_product":
      return "This is your own listing.";
    case "no_unit_free":
      return "These dates are no longer free. Pick other dates.";
    case "closed_that_day":
      return "The shop is closed on the first day. Pick another start date.";
    case "closed_on_return_day":
      return "The shop is closed on the last day. Pick another return date.";
    case "notice_too_short": {
      const hours = Number(details?.min_notice_hours);
      return Number.isFinite(hours) && hours > 0
        ? `The shop needs at least ${hours === 1 ? "1 hour" : `${hours} hours`} of notice. Pick a later start date.`
        : "This is too soon for the shop. Pick a later start date.";
    }
    case "owner_cannot_accept":
      return "This owner can't take bookings right now.";
    case "too_far":
      return "You are too far for this shop to deliver. Choose self pickup.";
    case "delivery_not_offered":
      return "This item is not delivered. Choose self pickup.";
    case "phone_required":
      return "Add a phone number to your account to book. The pay page needs it.";
    case "linked_account":
      return "You can't book from this owner: your accounts share a phone number, a device or a bank account.";
    default:
      return null;
  }
}

/** The first thing in the way that the dates screen can fix, in the server's order. */
export function datesBlocker(quote: Quote | null | undefined): string | null {
  const code = quote?.blockers.find((b) => FIXED_BY_DATES.has(b));
  return code ? blockerText(code) : null;
}

/** The first thing in the way on the price screen, leaving out the tick and the ID check. */
export function reviewBlocker(quote: Quote | null | undefined): { code: string; text: string } | null {
  for (const code of quote?.blockers ?? []) {
    if (OWN_PLACE.has(code)) continue;
    const text = blockerText(code);
    if (text) return { code, text };
  }
  return null;
}

/** What to say when Book now is refused. */
export function bookErrorText(error: ApiError | null): string {
  const known = error?.code ? blockerText(error.code, error.details) : null;
  if (known) return known;
  switch (error?.code) {
    case "id_check_needed":
      return "This item needs an ID check before you can book it.";
    case "terms_not_accepted":
      return "The rental terms have changed. Read them and tick the box again.";
    case "price_changed":
      return "The price changed. Check the new total, then book again.";
    case "move_not_allowed":
      return "Your earlier payment can no longer move to this booking. It is being refunded. Book again to pay now.";
    case "payments_unavailable":
      return "Payments are not working for a moment. Nothing was booked. Try again.";
    case "rate_limited":
      return "Too many tries. Wait a minute, then try again.";
    default:
      return error?.message ?? "We couldn't book this. Check your connection and try again.";
  }
}

// ---- The payment hand-off's words ---------------------------------------------------------

/** Where a payment stands on screen. `ended`: its pay page has run out or was closed. */
export type PayPhase = "idle" | "working" | "failed" | "pending" | "ended";

/** PAYMENTS-DESIGN 5.2 steps 8 and 9, in its words. */
export function payPhaseText(phase: PayPhase): string | null {
  switch (phase) {
    case "working":
      return "Checking your payment…";
    case "failed":
      return "The payment did not go through.";
    case "pending":
      return "We are still waiting for your bank. We will tell you as soon as it is through.";
    case "ended":
      return "This payment has ended.";
    default:
      return null;
  }
}

/** The button's words once a payment has been tried. */
export function payButtonLabel(phase: PayPhase, first: string): string {
  if (phase === "failed") return "Try again";
  if (phase === "pending") return "Open the pay page again";
  return first;
}

