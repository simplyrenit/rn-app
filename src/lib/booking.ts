/**
 * Live booking, the customer's side (API-CONTRACT OE-C; ARCHITECTURE 4 and 10).
 * The contract's objects as types, and the plain functions the screens draw from,
 * so the words, the sums on screen and the choice of screen can be tested.
 *
 * Money is a string of rupees ("1830.00"), a day is `YYYY-MM-DD` in India, an
 * instant is UTC and is shown in India time. The server works every amount out;
 * nothing here adds money up, it only says what the server sent.
 */
import { SavedAddress, addressLine, addressTitle } from "@/lib/addresses";
import { ApiError } from "@/lib/api-error";
import type { CaptureFlags } from "@/lib/capture";
import { formatCurrency } from "@/lib/format";
import { DayHours, Hours, hoursRows, istDay, kmText, time12 } from "@/lib/shop";

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
  /** How long the customer will have to pay the rest once the owner accepts. The server's setting. */
  rent_pay_minutes: number;
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

/** A saved address as a booking carries it. */
export type BookingAddress = Omit<SavedAddress, "is_default">;

export interface TimeWindow {
  start: string;
  end: string;
}

/** One of the three preset taps on the day (`POST …/status/`), or none yet. */
export type DayStatus = "" | "on_my_way" | "running_late" | "i_am_here";

/** The day of the handover, as either side's booking carries it (the shop's adds `return_code`). */
export interface BookingDay {
  /** The other side's phone, `+91…`. Null except from `call_from` until the handover. */
  call_number: string | null;
  /** When the preset buttons, Call and the handover code open: 2 hours before the window. Null until a window is picked. */
  call_from: string | null;
  my_status: DayStatus;
  their_status: DayStatus;
  /** When "They did not come" opens: the window's end plus 30 minutes. */
  no_show_from: string | null;
  /** Six digits. On the customer's booking only while the stage is `ready`: they show it, the owner types it. */
  handover_code: string | null;
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
  /**
   * Owner delivery only: the address the customer chose at Book now, copied
   * then (the saved-address shape without `is_default`). Null for self pickup.
   */
  delivery_address: BookingAddress | null;
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
    /** How long the customer has to pay the rent once the owner accepts; the deadline is `rent_due_at`. */
    rent_pay_minutes: number;
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
  /**
   * The one payment the customer should make now. `payment` is the pay page of
   * the payment already started and still payable, or null when none is open:
   * the one way any payment is resumed, on any phone. For the booking amount it
   * is never null while `ring_state` is `awaiting_payment`.
   */
  pay_now: {
    purpose: PaymentPurpose;
    amount: string;
    deposit_part: string;
    due_at: string | null;
    payment: PaymentStart | null;
  } | null;
  payments: MoneyRow[];
  pick_deadline_at: string | null;
  /** What Renit really did to reach the owner, so "no answer" says only what is true. */
  tried?: { ring: boolean; second_ring: boolean; staff_call: boolean } | null;
  cancels_left_today: number;
  window: TimeWindow | null;
  window_request: { by: "owner" | "customer"; start: string; end: string; asked_at: string } | null;
  return_by: string | null;
  /** The handover time plus 24 hours while the stage is `out`, else null. */
  report_fault_until?: string | null;
  id_match_required: boolean;
  day: BookingDay;
  /** Whether each capture has finished uploading. */
  captures: CaptureFlags;
  /** A "Not as described" or fault report waits for Renit's decision. */
  claim_open: boolean;
  claims: number[];
  /** The booking this one extends, and the bookings that extend this one. */
  extends: string | null;
  extensions: string[];
  can: string[];
  timeline: { event: string; label: string; at: string; by: string }[];
  created_at: string;
  /**
   * The server's clock when the answer was made. Every time left on screen is
   * counted against it (`correctedNow`), so a phone with a wrong clock still
   * shows the right time (P3-17).
   */
  server_time?: string;
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

/** The same for a booking, which carries the address it is delivered to. */
export function bookingHow(booking: Pick<BookingCustomer, "delivery_mode" | "delivery_address">): string {
  return howLabel(booking.delivery_mode, booking.delivery_address ? addressTitle(booking.delivery_address) : null);
}

/** Where an owner delivery goes, for the booking screen: "Home" and its one-line address. */
export function deliveryPlace(address: BookingAddress | null | undefined): { title: string; line: string } | null {
  if (!address) return null;
  return { title: addressTitle(address), line: addressLine(address) || address.address };
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
  /** Green: money already paid. */
  amountTone?: "success";
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
 * "Within 30 minutes", as BK-03 writes it, with the server's own number
 * (`rent_pay_minutes`): no client holds the 30. It is the one stated length of
 * time the customer reads, and it is about their own payment, never about how
 * long the owner takes.
 */
function rentWindow(minutes: number | null | undefined): string {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return "Soon after they accept";
  return n === 1 ? "Within 1 minute" : `Within ${n} minutes`;
}

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
      sub: opens ? `They are asked ${opens.day} at ${opens.time}` : rentWindow(quote.rent_pay_minutes),
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

/**
 * Whether a failed Book now is known to have made nothing, so the next tap is a
 * new tap with a new `client_key`. A refusal the server chose (any 4xx, or the
 * 503 the contract gives for rn-pay being down) is final. No answer at all, or
 * a fault on the way (a 500, a gateway's 502 or 504), is not: the booking may
 * exist with its reply lost, so the same key is sent again and the server
 * answers with that first booking instead of making a second.
 */
export function bookRefusalIsFinal(error: ApiError | null): boolean {
  if (!error) return false;
  return (error.status >= 400 && error.status < 500) || error.code === "payments_unavailable";
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

/** Where a payment stands on screen. `ended`: rn-api said its pay page has run out or was closed. */
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
      // Only what is known: the page is over. Whether money moved is the bank's to say.
      return "This payment has ended. If money left your account, it comes back by itself.";
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


// ---- Which screen a booking is on (ENG-173) -------------------------------------------------

/**
 * The views of the `Booking` route. The booking's stage on the server picks one;
 * the phone keeps no stage of its own.
 */
export type BookingView =
  | "pay_booking_amount"
  | "confirming"
  | "outcome"
  | "pay_rent"
  /** `ready`: the day of the handover (BK-14). */
  | "day_of"
  /** `out`: the customer has the item (BK-20). */
  | "active"
  | "details";

/** The request ended before a handover and other dates or owners are on offer (N2, N8). */
export function endedByOwner(booking: Pick<BookingCustomer, "exit" | "exit_reason">): boolean {
  return (
    booking.exit === "refused" ||
    booking.exit === "no_answer" ||
    booking.exit === "cancelled_by_owner" ||
    (booking.exit === "no_show" && booking.exit_reason === "owner")
  );
}

export function bookingView(
  booking: Pick<BookingCustomer, "stage" | "ring_state" | "exit" | "exit_reason">
): BookingView {
  if (endedByOwner(booking)) return "outcome";
  // Any other ending (the customer cancelled, the rent lapsed) is told on the booking screen.
  if (booking.exit) return "details";
  if (booking.stage === "ringing") {
    return booking.ring_state === "awaiting_payment" ? "pay_booking_amount" : "confirming";
  }
  if (booking.stage === "accepted") return "pay_rent";
  if (booking.stage === "ready") return "day_of";
  return booking.stage === "out" ? "active" : "details";
}

/** True while the request is still open: unpaid, waiting for the shop to open, or ringing. */
export function isRinging(booking: Pick<BookingCustomer, "stage" | "exit">): boolean {
  return booking.stage === "ringing" && !booking.exit;
}

/** The contract's rhythm while an answer can arrive at any second. */
export const RING_POLL_MS = 3000;
/** For a state the phone only suspects has changed (its own clock says so; the server's decides). */
export const SLOW_POLL_MS = 15_000;

/**
 * How often the booking screen reads the booking by itself, or false for not at
 * all. Every 3 seconds while the ₹99 is being paid or the owner is being asked,
 * and it stops the moment the ring ends. Slowly on the day of the handover.
 *
 * A request waiting for a closed shop is not read on a timer: nothing can change
 * before `shop.opens_at` except the customer's own cancel, so the screen reads
 * once at that time instead. If the phone's clock says the shop should have
 * opened and the server still says waiting, it is read slowly until they agree.
 */
export function pollEveryMs(
  booking: Pick<BookingCustomer, "stage" | "exit" | "ring_state" | "shop"> & { day?: Pick<BookingDay, "call_from"> | null },
  now: Date = new Date()
): number | false {
  // On the day, from the time the buttons open: the other side's tap, or the owner
  // typing the code, changes this screen while the two people stand together. A
  // push says so too; this is for the phone that did not get it.
  if (booking.stage === "ready" && !booking.exit) {
    const from = new Date(booking.day?.call_from ?? "").getTime();
    return Number.isFinite(from) && now.getTime() >= from ? SLOW_POLL_MS : false;
  }
  if (!isRinging(booking)) return false;
  if (booking.ring_state !== "waiting_to_open") return RING_POLL_MS;
  const opens = new Date(booking.shop.opens_at ?? "").getTime();
  return Number.isFinite(opens) && now.getTime() < opens ? false : SLOW_POLL_MS;
}

export interface RingStep {
  label: string;
  sub?: string;
  state: "done" | "active" | "todo";
}

export interface RingCopy {
  icon: "bell" | "phone" | "clock";
  title: string;
  steps: RingStep[];
  body: string;
}

/**
 * The confirming screen (BK-04, BK-05), from `ring_state`. It shows what is
 * happening and never how long is left: no countdown and no number of minutes.
 */
export function ringCopy(
  booking: Pick<BookingCustomer, "ring_state" | "shop" | "money">,
  now: Date = new Date()
): RingCopy {
  const shop = booking.shop.name;
  const usual = "This usually takes a few minutes. You can leave the app and we'll tell you the moment they answer.";
  switch (booking.ring_state) {
    case "waiting_to_open": {
      const opens = booking.shop.opens_at ? timeAndDay(booking.shop.opens_at, now) : null;
      return {
        icon: "clock",
        title: `${shop} is closed now`,
        steps: [
          {
            label: opens ? `Asked at ${opens.time} ${opens.day}` : "Asked when they open",
            sub: "The owner is closed and will be asked when they open.",
            state: "active",
          },
          { label: "Ringing the owner", state: "todo" },
        ],
        body: `We'll tell you the moment they answer. You can cancel any time before they open and the ${money(
          booking.money.booking_amount
        )} comes back.`,
      };
    }
    case "calling":
      return {
        icon: "phone",
        title: `Asking ${shop}`,
        steps: [
          { label: "Ringing the owner", state: "done" },
          { label: "Calling the owner", sub: "Renit is phoning the shop for you.", state: "active" },
        ],
        body: usual,
      };
    case "ringing_again":
      return {
        icon: "bell",
        title: `Asking ${shop}`,
        steps: [
          { label: "Ringing the owner", state: "done" },
          { label: "Ringing again", state: "active" },
        ],
        body: usual,
      };
    default:
      return {
        icon: "bell",
        title: `Asking ${shop}`,
        steps: [
          { label: "Ringing the owner", state: "active" },
          { label: "Calling the owner", state: "todo" },
        ],
        body: usual,
      };
  }
}

// ---- Cancelling (A-33) ------------------------------------------------------------------------

export interface CancelMoney {
  what: PaymentPurpose;
  amount: string;
  text: string | null;
  expected_days_min?: number | null;
  expected_days_max?: number | null;
}

/** `GET /api/bookings/{number}/cancel/`: what cancelling would cost, before it is done. */
export interface CancelOutcome {
  case: "ringing" | "after_accept" | "free" | "inside_24h";
  back: CancelMoney[];
  kept: CancelMoney[];
  to_owner: string;
  free_until: string | null;
}

const daysText = (min?: number | null, max?: number | null) =>
  min && max ? ` Expect it in ${min === max ? min : `${min} to ${max}`} working days.` : "";

/** The cancel sheet: its heading, each thing that happens to the money, and the button. */
export function cancelCopy(outcome: CancelOutcome): { title: string; lines: string[]; confirm: string } {
  const ringing = outcome.case === "ringing";
  const lines = [
    ...outcome.back.map(
      (row) =>
        `${money(row.amount)} goes back${row.text ? ` to ${row.text}` : " the way you paid"}.${daysText(
          row.expected_days_min,
          row.expected_days_max
        )}`
    ),
    ...outcome.kept.map((row) => row.text || `${money(row.amount)} is not returned.`),
    ...(isPositive(outcome.to_owner) ? [`${money(outcome.to_owner)} goes to the owner.`] : []),
  ];
  return {
    title: ringing ? "Cancel this request?" : "Cancel this booking?",
    lines: lines.length ? lines : ["Nothing has been paid, so there is nothing to refund."],
    confirm: ringing ? "Cancel request" : "Cancel booking",
  };
}

/** What to say when the cancel call is refused. */
export function cancelErrorText(error: ApiError | null): string {
  switch (error?.code) {
    case "outcome_changed":
      return "This changed while you were deciding. Nothing was cancelled. Check what cancelling does now.";
    case "cancel_limit": {
      const perDay = Number(error.details?.per_day);
      return `You have cancelled ${Number.isFinite(perDay) && perDay > 0 ? perDay : "too many"} requests today, so this one can't be cancelled while it rings.`;
    }
    case "claim_open":
      return "A report on this booking is with Renit. You can cancel once it is decided.";
    case "stage_not_allowed":
      return "This booking can no longer be cancelled.";
    default:
      return error?.message ?? "We couldn't cancel this. Check your connection and try again.";
  }
}

// ---- Refused, no answer, cancelled by the owner (BK-09, BK-10) --------------------------------

/**
 * What Renit did to reach the owner, said only as far as it is true (the
 * contract's rule for `tried`): always "We rang the owner"; "twice" when they
 * were rung a second time; "and phoned the shop" only when a member of staff
 * marked that they phoned.
 */
export function triedText(tried: BookingCustomer["tried"]): string {
  return `We rang the owner${tried?.second_ring ? " twice" : ""}${tried?.staff_call ? " and phoned the shop" : ""}.`;
}

export interface OutcomeCopy {
  icon: "calendar" | "clock";
  title: string;
  body: string;
}

/**
 * The plain reason a request ended. Always about the item and the dates, never
 * about the customer.
 */
export function outcomeCopy(
  booking: Pick<
    BookingCustomer,
    "exit" | "exit_reason" | "shop" | "product" | "first_day" | "last_day" | "tried"
  >
): OutcomeCopy {
  const shop = booking.shop.name;
  const range = rangeLabel(booking.first_day, booking.last_day);
  if (booking.exit === "no_answer") {
    return {
      icon: "clock",
      title: `${shop} did not answer in time`,
      body: `${triedText(booking.tried)} Nobody answered, so this request has ended.`,
    };
  }
  if (booking.exit === "cancelled_by_owner") {
    return {
      icon: "calendar",
      title: `${shop} cancelled this booking`,
      body: "Everything you paid is going back to you.",
    };
  }
  if (booking.exit === "no_show") {
    return {
      icon: "clock",
      title: `${shop} did not come`,
      body: "Everything you paid is going back to you.",
    };
  }
  const reason: Record<string, string> = {
    not_available: `The owner told us the ${booking.product.title} is not available on ${range}.`,
    no_unit: `The last one was booked by someone else for ${range} a moment ago.`,
    cannot_accept: "The owner can't take bookings right now.",
    too_late: `The shop opened too late for a rental starting ${dayShort(booking.first_day)}.`,
  };
  return {
    icon: "calendar",
    title: `${shop} can't do these dates`,
    body: reason[booking.exit_reason] ?? `The owner can't do ${range}.`,
  };
}

/** Where a payment was made, for "it goes back to …": the first payment of this kind. */
function paidWith(booking: Pick<BookingCustomer, "payments">, what: PaymentPurpose): string | null {
  return booking.payments.find((row) => row.kind === "payment" && row.what === what)?.text ?? null;
}

/**
 * The "Your ₹99" card after a refusal or silence (N2): it moves with the
 * customer if they pick another option in time, else it goes back. `moves` is
 * the alternatives' own answer; unknown while they load.
 */
export function bookingAmountCopy(
  booking: Pick<BookingCustomer, "money" | "payments" | "pick_deadline_at" | "exit">,
  moves: boolean | undefined
): { title: string; body: string } {
  const amount = money(booking.money.booking_amount);
  const source = paidWith(booking, "booking_amount");
  const to = source ? `to ${source}` : "the way you paid";
  const refund = booking.payments.find((row) => row.kind === "refund" && row.what === "booking_amount");
  const days =
    daysText(refund?.expected_days_min, refund?.expected_days_max) || " Refunds take 5 to 7 working days.";
  const title = `Your ${amount}`;
  switch (booking.money.booking_amount_state) {
    case "paid":
      if (booking.exit !== "refused" && booking.exit !== "no_answer") {
        return { title, body: `It is going back ${to}.${days}` };
      }
      return moves === false || !booking.pick_deadline_at
        ? { title, body: `It goes back ${to}.${days}` }
        : {
            title,
            body: `It moves with you if you pick one of these. Pick nothing by ${clock(
              booking.pick_deadline_at
            )} and it goes back ${to}.${days}`,
          };
    case "refund_requested":
      return { title, body: `It is going back ${to}.${days}` };
    case "refunded":
      return { title, body: `It was refunded ${to}.` };
    case "moved":
      return { title, body: "It moved to your new booking." };
    case "kept":
      return { title, body: "It was not returned." };
    default:
      return { title, body: "Nothing was paid." };
  }
}

// ---- Pay the rent (BK-06, ENG-174) -------------------------------------------------------------

/** "by 10:13 am", and the day when it is not today. The server's own time: no length of time is written. */
function byWhen(iso: string | null | undefined, now: Date): string {
  const when = iso ? timeAndDay(iso, now) : null;
  if (!when) return "";
  return when.day === "today" ? ` by ${when.time}` : ` by ${when.time} ${when.day}`;
}

export interface PayRentCopy {
  title: string;
  sub: string;
  lines: PriceLine[];
  total: PriceLine;
  /** About the deposit: due later, or paid with the rent. */
  note: string | null;
  small: string;
  button: string;
}

/** What one payment takes: the three things the customer is shown before the pay page opens. */
export interface Charge {
  purpose: PaymentPurpose;
  amount: string;
  deposit_part: string;
}

/**
 * The rent payment as the screen shows it. From the open payment itself when
 * one has been started (then the button and the pay page cannot differ), else
 * from the booking's `pay_now`.
 */
export function rentCharge(booking: Pick<BookingCustomer, "pay_now" | "money">): Charge {
  const from = booking.pay_now?.payment ?? booking.pay_now;
  return {
    purpose: from?.purpose ?? (booking.money.deposit_with_rent ? "rent_and_deposit" : "rent"),
    amount: from?.amount ?? booking.money.pay_after_accept,
    deposit_part: from?.deposit_part ?? "0.00",
  };
}

/**
 * True when the payment rn-api just answered with is the one the button named.
 * The server decides at that call whether the deposit joins the rent (A-13:
 * the first day's opening is now under 24 hours away), so the answer can be for
 * more than the screen said a moment ago. Then the pay page is not opened: the
 * screen shows the new sum and asks for the tap again.
 */
export function sameCharge(shown: Charge, payment: Charge): boolean {
  return (
    shown.purpose === payment.purpose &&
    Number(shown.amount) === Number(payment.amount) &&
    Number(shown.deposit_part) === Number(payment.deposit_part)
  );
}

/**
 * The time left to pay, "12:34", counting down to `rent_due_at`; null once it
 * has passed or when there is none. For the eye only: it runs on the phone's
 * clock, so it never stops a payment. The server decides the lapse.
 */
export function timeLeft(dueAt: string | null | undefined, now: Date = new Date()): string | null {
  const left = Math.floor((new Date(dueAt ?? "").getTime() - now.getTime()) / 1000);
  if (!Number.isFinite(left) || left <= 0) return null;
  const hours = Math.floor(left / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  const seconds = pad(left % 60);
  return hours > 0 ? `${hours}:${pad(minutes)}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * The screen after the owner accepts: what is left to pay, and by when.
 * `charge` is what the button will name: the booking's own, unless rn-api has
 * just answered a tap with a different payment, which then takes its place.
 */
export function payRentCopy(
  booking: BookingCustomer,
  now: Date = new Date(),
  charge: Charge = rentCharge(booking)
): PayRentCopy {
  const m = booking.money;
  const amount = money(charge.amount);
  const withDeposit = charge.purpose === "rent_and_deposit";
  const depositPart = charge.deposit_part;
  const lines: PriceLine[] = [{ label: "Rent", amount: money(m.rent) }];
  if (isPositive(m.delivery_fee)) lines.push({ label: "Delivery", amount: money(m.delivery_fee) });
  if (isPositive(m.fee_charged)) lines.push({ label: "Renit's fee", amount: money(m.fee_charged) });
  lines.push({ label: "Already paid", amount: money(m.booking_amount), amountTone: "success" });
  if (isPositive(depositPart)) lines.push({ label: "Deposit · refundable", amount: money(depositPart) });

  const askDay = dayOf(m.deposit_ask_at);
  const note = withDeposit
    ? "The handover is less than a day away, so the deposit is paid with the rent. It is refundable."
    : isPositive(m.deposit) && (m.deposit_state === "not_due" || m.deposit_state === "due")
      ? `Deposit ${money(m.deposit)} is due later${askDay ? `, on ${dayShort(askDay)}` : ""}.`
      : null;

  return {
    title: `${booking.shop.name} accepted`,
    sub: `Pay ${amount}${byWhen(booking.pay_now?.due_at ?? m.rent_due_at, now)} to confirm your booking.`,
    lines,
    total: { label: "To pay now", amount },
    note,
    small: `If it isn't paid in time, the booking lapses and the ${money(m.booking_amount)} is kept.`,
    button: `Pay ${amount}`,
  };
}

/** What to say when the rent payment cannot be started. */
export function payRentErrorText(error: ApiError | null): string {
  switch (error?.code) {
    case "stage_not_allowed":
      return "This booking is no longer waiting for the rent.";
    case "payments_unavailable":
      return "Payments are not working for a moment. Nothing was charged. Try again.";
    default:
      return error?.message ?? "We couldn't start the payment. Check your connection and try again.";
  }
}

// ---- The arrival window (BK-07) ------------------------------------------------------------------

/** "10:00 – 11:00 am", and "11:00 am – 12:00 pm" when the hour crosses noon. */
export function windowLabel(window: TimeWindow): string {
  const [start, startHalf] = clock(window.start).split(" ");
  const [end, endHalf] = clock(window.end).split(" ");
  if (!start || !end) return "";
  return startHalf === endHalf ? `${start} – ${end} ${endHalf}` : `${start} ${startHalf} – ${end} ${endHalf}`;
}

/** "Sat 24 Oct, 10:00 – 11:00 am". */
export function windowSummary(window: TimeWindow): string {
  const day = dayOf(window.start);
  return day ? `${dayShort(day)}, ${windowLabel(window)}` : "";
}

/** The picker's heading: the question, then the day and the shop's hours on it. */
export function windowHeading(
  booking: Pick<BookingCustomer, "delivery_mode" | "shop" | "first_day">,
  day: string | null | undefined
): { title: string; sub: string } {
  const hours = booking.shop.hours_first_day;
  const on = dayLong(day || booking.first_day);
  return {
    title: booking.delivery_mode === "pickup" ? "When will you collect it?" : "When should it arrive?",
    sub: hours
      ? `${on} · the shop hands over between ${time12(hours.open)} and ${time12(hours.close)}`
      : on,
  };
}

/** What to say when a window call is refused. */
export function windowErrorText(error: ApiError | null): string {
  switch (error?.code) {
    case "window_outside_hours":
      return "That time is no longer open. Pick another.";
    case "window_already_set":
      return "Your arrival time is already set. You can ask to change it.";
    case "request_open":
      return "A change is already waiting for an answer.";
    case "no_request":
      return "That request is no longer open.";
    case "own_request":
      return "You asked for this change. The shop answers it.";
    case "stage_not_allowed":
      return "The arrival time can no longer be changed for this booking.";
    default:
      return error?.message ?? "We couldn't save that. Check your connection and try again.";
  }
}

/** A request to move the window that is waiting for an answer. */
export function windowRequestCopy(
  booking: Pick<BookingCustomer, "window_request" | "can">
): { title: string; body: string; canAnswer: boolean } | null {
  const request = booking.window_request;
  if (!request) return null;
  const to = windowSummary(request);
  return request.by === "owner"
    ? {
        title: "The shop asked to move your arrival",
        body: `New time: ${to}. Your time stays as it is unless you accept.`,
        canAnswer: booking.can.includes("answer_window_change"),
      }
    : {
        title: "You asked to change your arrival time",
        body: `To ${to}. Your time stays as it is until the shop accepts.`,
        canAnswer: false,
      };
}

// ---- The booking screen (BK-08) ---------------------------------------------------------------------

export interface Banner {
  tone: "success" | "brand" | "warning" | "neutral";
  title: string;
  sub: string | null;
}

/** The top of the booking screen: where the booking stands, in a line or two. */
export function bookingBanner(booking: BookingCustomer): Banner {
  const m = booking.money;
  const arrive = booking.delivery_mode === "pickup" ? "Collect" : "Arrives";
  const windowLine = booking.window ? `${arrive} ${windowSummary(booking.window)}` : "Pick your arrival window.";
  switch (booking.exit) {
    case "cancelled_by_customer":
      if (booking.exit_reason === "booking_amount_unpaid") {
        // Said from what the server shows, never assumed: a payment can land at the
        // bank after the request was dropped, and is then sent back.
        const arrived =
          m.booking_amount_state === "refund_requested" ||
          m.booking_amount_state === "refunded" ||
          booking.payments.some(
            (row) => row.kind === "payment" && row.what === "booking_amount" && row.status === "paid"
          );
        return {
          tone: "neutral",
          title: "Request dropped",
          sub: arrived
            ? `The ${money(m.booking_amount)} arrived after this request had ended, so the owner was not asked. ${
                m.booking_amount_state === "refunded" ? "It has been refunded." : "It is going back to you."
              }`
            : "The payment did not arrive in time, so the owner was not asked. If money left your account, it comes back by itself.",
        };
      }
      if (booking.exit_reason === "before_opening" || booking.exit_reason === "while_ringing") {
        return { tone: "neutral", title: "Request cancelled", sub: "You cancelled before the owner answered." };
      }
      if (booking.exit_reason === "deposit_unpaid") {
        return { tone: "warning", title: "Booking cancelled", sub: "The deposit was not paid in time." };
      }
      if (booking.exit_reason === "claim_not_upheld") {
        return { tone: "neutral", title: "Booking cancelled", sub: "Renit looked at your report and did not uphold it." };
      }
      return { tone: "neutral", title: "Booking cancelled", sub: "You cancelled this booking." };
    case "lapsed_unpaid":
      return {
        tone: "warning",
        title: "Booking lapsed",
        sub:
          m.booking_amount_state === "kept"
            ? `The rent was not paid in time. The ${money(m.booking_amount)} was kept.`
            : "The rent was not paid in time.",
      };
    case "no_show":
      return { tone: "warning", title: "Booking ended", sub: "You did not arrive in your window." };
    case "":
      break;
    default:
      return { tone: "neutral", title: "Booking ended", sub: null };
  }
  switch (booking.stage) {
    case "confirmed":
      return { tone: "success", title: "Booking confirmed", sub: windowLine };
    case "ready":
      return { tone: "success", title: "Ready for handover", sub: windowLine };
    case "out": {
      const day = dayOf(booking.return_by);
      return {
        tone: "brand",
        title: "Rental active",
        sub: day ? `Return by ${dayShort(day)}, ${clock(booking.return_by)}` : null,
      };
    }
    case "returned":
      return {
        tone: "brand",
        title: "Returned",
        sub: isPositive(m.deposit)
          ? "Your deposit comes back within 48 hours, less any late days or agreed damage."
          : null,
      };
    case "closed":
      return { tone: "neutral", title: "Rental complete", sub: null };
    case "accepted":
      return { tone: "brand", title: "Accepted", sub: "Pay the rent to confirm your booking." };
    default:
      return { tone: "neutral", title: "Asking the owner", sub: null };
  }
}

/** A past moment: the time when it was today, else the day and the time. */
export function momentLabel(iso: string, now: Date = new Date()): string {
  const day = dayOf(iso);
  if (!day) return "";
  return day === todayIst(now) ? clock(iso) : `${dayShort(day)}, ${clock(iso)}`;
}

export interface TimelineRow {
  label: string;
  when: string;
  /** `done` has happened; `next` is the one thing to do now; `todo` comes after. */
  state: "done" | "next" | "todo";
}

/**
 * The booking's timeline: what happened (the server's own entries, oldest
 * first), then what is still to come, worked out from where the booking stands.
 * A booking that has ended shows only what happened.
 */
export function timelineRows(booking: BookingCustomer, now: Date = new Date()): TimelineRow[] {
  const done: TimelineRow[] = booking.timeline.map((entry) => ({
    label: entry.label,
    when:
      entry.event === "set_window" && booking.window
        ? windowSummary(booking.window)
        : momentLabel(entry.at, now),
    state: "done",
  }));
  if (booking.exit) return done;

  const m = booking.money;
  const stage = booking.stage;
  const before = (...stages: BookingStage[]) => stages.includes(stage);
  const ahead: Omit<TimelineRow, "state">[] = [];
  if (stage === "confirmed" && !booking.window) ahead.push({ label: "Arrival window", when: "Not picked yet" });
  if (m.deposit_state === "not_due" || m.deposit_state === "due") {
    const day = dayOf(m.deposit_ask_at);
    ahead.push({ label: `Deposit ${money(m.deposit)}`, when: day ? `due ${dayShort(day)}` : "due before handover" });
  }
  if (before("confirmed", "ready")) {
    ahead.push({
      label: booking.delivery_mode === "pickup" ? "Collect it" : "Delivery",
      when: dayShort(booking.first_day),
    });
  }
  if (before("confirmed", "ready", "out")) {
    const day = dayOf(booking.return_by);
    ahead.push({
      label: "Return by",
      when: day ? `${dayShort(day)}, ${clock(booking.return_by)}` : dayShort(booking.last_day),
    });
  }
  if (stage === "returned" && m.deposit_state === "paid") {
    const day = dayOf(m.deposit_refund_due_at);
    ahead.push({ label: "Deposit comes back", when: day ? `by ${dayShort(day)}` : "within 48 hours" });
  }
  return [...done, ...ahead.map((row, index): TimelineRow => ({ ...row, state: index === 0 ? "next" : "todo" }))];
}

export interface MoneyRowView {
  key: string;
  title: string;
  sub: string;
  status: string;
  tone: "success" | "warning" | "danger" | "neutral";
}

const PAID_FOR: Record<PaymentPurpose, string> = {
  booking_amount: "Book now",
  rent: "After the owner accepted",
  rent_and_deposit: "Rent and deposit",
  deposit: "Deposit · refundable",
};

const REFUND_OF: Record<PaymentPurpose, string> = {
  booking_amount: "Booking amount",
  rent: "Rent",
  rent_and_deposit: "Rent and deposit",
  deposit: "Deposit",
};

/**
 * One payment or refund as a row (N16). A refund always says the amount, where
 * it is going and how many days to expect, so nobody thinks Renit kept it.
 */
export function moneyRowView(row: MoneyRow, now: Date = new Date()): MoneyRowView {
  if (row.kind === "refund") {
    const days =
      row.expected_days_min && row.expected_days_max
        ? `${row.expected_days_min === row.expected_days_max ? row.expected_days_min : `${row.expected_days_min} to ${row.expected_days_max}`} working days`
        : null;
    const by = row.expected_by ? `by ${dayShort(row.expected_by)}` : null;
    const status: Pick<MoneyRowView, "status" | "tone"> =
      row.status === "processed"
        ? { status: "Sent", tone: "success" }
        : row.status === "failed"
          ? { status: "Failed · Renit is on it", tone: "danger" }
          : { status: "On its way", tone: "warning" };
    return {
      key: row.id,
      title: `${money(row.amount)} refund`,
      sub: [`${REFUND_OF[row.what] ?? "Refund"} · to ${row.text || "the way you paid"}`, days, by]
        .filter(Boolean)
        .join(" · "),
      ...status,
    };
  }
  // "UPI asha@okhdfcbank" → "UPI": the frame's "Paid · UPI".
  const method = (row.text ?? "").split(" ")[0];
  const status: Pick<MoneyRowView, "status" | "tone"> =
    row.status === "paid"
      ? { status: method ? `Paid · ${method}` : "Paid", tone: "success" }
      : row.status === "created"
        ? { status: "Not paid yet", tone: "warning" }
        : row.status === "failed"
          ? { status: "Failed", tone: "danger" }
          : { status: row.status === "expired" ? "Expired" : "Cancelled", tone: "neutral" };
  return {
    key: row.id,
    title: money(row.amount),
    sub: `${PAID_FOR[row.what] ?? "Payment"} · ${momentLabel(row.at, now)}`,
    ...status,
  };
}

/** Every payment and refund, oldest first, then the deposit while it is still to be paid. */
export function paymentRows(booking: BookingCustomer, now: Date = new Date()): MoneyRowView[] {
  const rows = booking.payments.map((row) => moneyRowView(row, now));
  const m = booking.money;
  if (!booking.exit && (m.deposit_state === "not_due" || m.deposit_state === "due")) {
    const day = dayOf(m.deposit_ask_at);
    rows.push({
      key: "deposit-to-pay",
      title: `Deposit ${money(m.deposit)}`,
      sub: day ? `Refundable · due ${dayShort(day)}` : "Refundable",
      ...(m.deposit_state === "due"
        ? { status: "Due now", tone: "warning" as const }
        : { status: "Due later", tone: "neutral" as const }),
    });
  }
  return rows;
}

const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

/** The line under "Cancel booking": what cancelling costs right now. */
export function cancelHint(outcome: CancelOutcome): string {
  const kept = outcome.kept[0] ? sentence(outcome.kept[0].text || `${money(outcome.kept[0].amount)} is not returned`) : "";
  switch (outcome.case) {
    case "ringing":
      return "The booking amount comes back.";
    case "free": {
      const day = dayOf(outcome.free_until);
      const until = day ? `Free until ${dayShort(day)}, ${clock(outcome.free_until)}.` : "Free to cancel now.";
      return [until, kept].filter(Boolean).join(" ");
    }
    case "inside_24h":
      return isPositive(outcome.to_owner)
        ? `${money(outcome.to_owner)} goes to the owner. The rest is refunded.`
        : "The rest of what you paid is refunded.";
    default:
      return kept || "Nothing is refunded.";
  }
}

// ---- The Rentals tab (BK-12, ENG-177) ----------------------------------------------------------------

/**
 * The two lists the server keeps (`GET /api/bookings/?open=`): Active is every
 * booking with no exit that is not closed, soonest first; Past is the rest.
 * The phone asks for a page of each and never splits a list itself.
 */
export type RentalsList = "open" | "past";

export const RENTALS_LISTS: readonly { key: RentalsList; label: string }[] = [
  { key: "open", label: "Active" },
  { key: "past", label: "Past" },
];

export interface StagePill {
  label: string;
  tone: "brand" | "success" | "warning" | "danger" | "neutral";
}

/** The stage as the card's pill: "Asking the owner", "Accepted", "Confirmed", "Ready". */
export function stagePill(
  booking: Pick<BookingCustomer, "stage" | "ring_state" | "exit" | "exit_reason">
): StagePill {
  switch (booking.exit) {
    case "refused":
      return { label: "Not available", tone: "neutral" };
    case "no_answer":
      return { label: "No answer", tone: "neutral" };
    case "cancelled_by_customer":
      return { label: "Cancelled", tone: "neutral" };
    case "cancelled_by_owner":
      return { label: "Cancelled by owner", tone: "neutral" };
    case "lapsed_unpaid":
      return { label: "Lapsed", tone: "warning" };
    case "no_show":
      // Whose no-show it was matters: the shop not coming is not a mark beside the customer's name.
      return booking.exit_reason === "owner"
        ? { label: "Owner did not come", tone: "neutral" }
        : { label: "No-show", tone: "warning" };
    default:
      break;
  }
  switch (booking.stage) {
    case "ringing":
      if (booking.ring_state === "awaiting_payment") return { label: "Payment pending", tone: "warning" };
      if (booking.ring_state === "waiting_to_open") return { label: "Asked at opening", tone: "warning" };
      return { label: "Asking the owner", tone: "warning" };
    case "accepted":
      return { label: "Accepted", tone: "brand" };
    case "confirmed":
      return { label: "Confirmed", tone: "brand" };
    case "ready":
      return { label: "Ready", tone: "success" };
    case "out":
      return { label: "Active", tone: "success" };
    case "returned":
      return { label: "Returned", tone: "brand" };
    default:
      return { label: "Completed", tone: "neutral" };
  }
}

/** The card's second line: "SoundBox Rentals · Sat 24 – Mon 26 Oct". */
export function rentalSubLine(booking: Pick<BookingCustomer, "shop" | "first_day" | "last_day">): string {
  return `${booking.shop.name} · ${rangeLabel(booking.first_day, booking.last_day)}`;
}

/** The card's foot: the one thing to do or to expect next, or null when there is none. */
export function rentalNextLine(booking: BookingCustomer, now: Date = new Date()): string | null {
  const m = booking.money;
  if (booking.exit) {
    return (booking.exit === "refused" || booking.exit === "no_answer") &&
      m.booking_amount_state === "paid" &&
      booking.pick_deadline_at
      ? `Pick another option by ${clock(booking.pick_deadline_at)}`
      : null;
  }
  const arrive = booking.delivery_mode === "pickup" ? "Collect" : "Arrives";
  switch (booking.stage) {
    case "ringing": {
      if (booking.ring_state === "awaiting_payment") return `Pay ${money(m.booking_amount)} to ask the owner`;
      if (booking.ring_state !== "waiting_to_open") return null;
      const opens = booking.shop.opens_at ? timeAndDay(booking.shop.opens_at, now) : null;
      return opens ? `Asked at ${opens.time} ${opens.day}` : "Asked when they open";
    }
    case "accepted":
      return `Pay ${money(booking.pay_now?.amount ?? m.pay_after_accept)}${byWhen(
        booking.pay_now?.due_at ?? m.rent_due_at,
        now
      )}`;
    case "confirmed": {
      if (!booking.window) return "Pick your arrival window";
      if (m.deposit_state === "not_due" || m.deposit_state === "due") {
        const day = dayOf(m.deposit_ask_at);
        return `Deposit ${money(m.deposit)} due${day ? ` ${dayShort(day)}` : " before handover"}`;
      }
      return `${arrive} ${windowSummary(booking.window)}`;
    }
    case "ready":
      return booking.window ? `${arrive} ${windowSummary(booking.window)}` : null;
    case "out": {
      const day = dayOf(booking.return_by);
      return day ? `Return by ${dayShort(day)}, ${clock(booking.return_by)}` : null;
    }
    case "returned":
      return m.deposit_state === "paid" ? "Deposit comes back within 48 hours" : null;
    default:
      return null;
  }
}

/** What an empty list says. */
export function rentalsEmpty(list: RentalsList): { title: string; body: string } {
  return list === "past"
    ? { title: "No past rentals yet", body: "Finished and cancelled bookings are kept here." }
    : { title: "No rentals yet", body: "Book something and it will wait for you here." };
}
