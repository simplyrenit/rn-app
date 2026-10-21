/**
 * Live booking, the customer's side (API-CONTRACT OE-C; ARCHITECTURE 4 and 10).
 * The contract's objects as types, and the plain functions the screens draw from,
 * so the words, the sums on screen and the choice of screen can be tested.
 *
 * Money is a string of rupees ("1830.00"), a day is `YYYY-MM-DD` in India, an
 * instant is UTC and is shown in India time. The server works every amount out;
 * nothing here adds money up, it only says what the server sent.
 */
import { pluralize } from "@/lib/pluralize";
import { SavedAddress, addressLine, addressTitle } from "@/lib/addresses";
import { ApiError, fieldErrors } from "@/lib/api-error";
import type { CaptureFlags } from "@/lib/capture";
import { formatCurrency } from "@/lib/format";
import type { PlanUnit } from "@/lib/plans";
import { ALL_DAY, DayHours, Hours, coversWholeDay, hoursRows, istDay, kmText, time12 } from "@/lib/shop";
import { ListingDelivery, deliveryReason, productHowLine } from "@/lib/delivery";

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

/**
 * ENG-282: how the rent is paid. `monthly`: a month plan of more than 30 days pays month 1 after the accept and each later
 * month by its own link. Every booking before ENG-282, and every other one, is `upfront`. The server decides it.
 */
export type Billing = "upfront" | "monthly";

/**
 * `paid`, `upcoming` (no link yet), `due`, `overdue` (the 3 days' grace), `lapsed` (the grace ran out), `dropped` (never
 * billed), `from_deposit` (a notice not paid by the return day, taken from the deposit).
 */
export type PeriodState = "paid" | "due" | "upcoming" | "overdue" | "lapsed" | "dropped" | "from_deposit";

/**
 * One month of a monthly-billed booking (ENG-282). Across an extension chain `label` runs on ("Month 7"). A `notice`
 * is the month's rent owed for ending early inside the minimum: both its days are the return day. To the shop, `amount` is
 * what it earns for the month, not what the customer pays.
 */
export interface RentPeriod {
  /** The booking the month belongs to: across an extension chain the rows come from several bookings. */
  booking: string;
  /** The month's number on its own booking: with `booking`, what `POST …/periods/{n}/pay/` and `pay_now.period` name. */
  n: number;
  /** Numbered across the chain ("Month 7"), or "Notice month". */
  label: string;
  kind: "rent" | "notice";
  first_day: string;
  last_day: string;
  amount: string;
  /** The month's rent alone: no delivery fee, no Renit fee. Absent from an answer before it. */
  rent?: string;
  state: PeriodState;
  /** The day the pay link is sent (3 days before `first_day`); the day it is due; the last day of the grace. */
  link_on: string | null;
  pay_by: string | null;
  grace_ends: string | null;
  paid_at: string | null;
  linked_at: string | null;
}

/** What both sides' `money` carries for monthly billing (ENG-282). All absent from an older server. */
export interface MonthlyMoney {
  billing?: Billing;
  periods?: RentPeriod[];
  /** Whether the rent payment (month 1, for monthly billing) is paid. */
  rent_paid?: boolean;
  /** What has been paid of the rent so far; to the shop, what it has earned. Null for upfront billing. */
  rent_paid_amount?: string | null;
  /**
   * An unpaid notice month, taken from the deposit when it settles unless it is paid by its link first; "0.00" when none.
   * The server keeps sending the expected amount until then.
   */
  notice_deduction?: string;
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
  /** ENG-281: the plan that priced it (`rate` is one day of it) and the listing's shortest booking. Absent from an older server. */
  plan?: { unit: PlanUnit; price: string; min: number };
  min_days?: number;
  delivery: {
    /** A status this build does not know is read as "not available" (ENG-284 D11). */
    status: "not_asked" | "ok" | "too_far" | "not_offered";
    fee: string;
    distance_km: string | null;
    offer_pickup: boolean;
    /** ENG-284: why `too_far`: beyond the shop's km, or in an area the shop turned off. Absent from an older server. */
    reason?: "distance" | "area_off" | null;
    /** ENG-284: the area turned off, for `area_off`. */
    area?: { pin: string; name: string } | null;
  };
  fee_shown: string;
  fee_charged: string;
  total: string;
  pay_now: string;
  pay_after_accept: string;
  /** How long the customer will have to pay the rest once the owner accepts. The server's setting. */
  rent_pay_minutes: number;
  /** How long the owner has to answer once rung, in minutes. The server's setting; absent from an older server. */
  ring_minutes?: number;
  /**
   * What cancelling costs once the owner has accepted (N7). `grace`: the handover is under `free_hours` from when the owner is
   * rung (now, or the shop's opening for Book for the morning), so the rent can be had back for `grace_minutes` after paying. `day_rent`: what the owner keeps for a cancel inside the free hours. Absent from an older server.
   */
  cancel?: { free_hours: number; grace_minutes: number; grace: boolean; day_rent: string };
  deposit: { amount: string; with_rent: boolean; due_on: string | null; refundable: boolean };
  units_free: number;
  shop: {
    is_open: boolean;
    opens_at: string | null;
    book_for_morning: boolean;
    hours_first_day: DayHours | null;
  };
  /**
   * Null when signed out. `passed` is null while no real ID check stands behind the answer (decision T-41: the stand-in that
   * passes everybody must not read as a check): the screen then draws no ID line at all. The gates are the server's.
   */
  id_check: { needed: "none" | "id" | "id_and_match"; passed: boolean | null } | null;
  terms: { version: string; url: string; accepted: boolean } | null;
  can_book: boolean;
  blockers: string[];
  /** ENG-282: monthly billing pays `first_payment` (month 1, less what Book now paid) after the accept, then a month at a time. */
  billing?: Billing;
  first_payment?: string | null;
  /** One month's rent, owed for ending early inside the minimum: null when the month plan's minimum is under 2 months. */
  notice?: string | null;
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
  /** ENG-282: what a payment was for when the purpose alone does not say ("Month 3 rent", "Notice month"). Absent before it. */
  label?: string | null;
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
  /** When each side last tapped a preset button; null while the button is unset. Absent in an answer from before the fields. */
  my_status_at?: string | null;
  their_status: DayStatus;
  their_status_at?: string | null;
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
  money: MonthlyMoney & {
    rate: string;
    /**
     * ENG-281: the plan that priced the booking; `rate` is one day of it. Absent from an older server. `min` (ENG-282): its
     * minimum, in its unit, which the notice line needs.
     */
    plan?: { unit: PlanUnit; price: string; min?: number | null };
    rent: string;
    delivery_fee: string;
    fee_shown: string;
    fee_charged: string;
    total: string;
    booking_amount: string;
    /** unpaid, paid, moved, refund_requested, refunded, kept */
    booking_amount_state: string;
    /** The working days a refund of the ₹99 takes, by how it was paid; the same table every refund uses. Null when unknown; absent from an older server. */
    booking_amount_refund_days?: { min: number; max: number } | null;
    pay_after_accept: string;
    /** How long the customer has to pay the rent once the owner accepts; the deadline is `rent_due_at`. */
    rent_pay_minutes: number;
    rent_due_at: string | null;
    deposit: string;
    deposit_with_rent: boolean;
    /** none, not_due, due, paid, carried, settled, forfeited */
    deposit_state: string;
    deposit_ask_at: string | null;
    deposit_due_at: string | null;
    deposit_refund_due_at: string | null;
    /** What a booking that ended early pays its owner (a day's rent, and the delivery fee); null while it runs. Absent from an older server. */
    owner_share?: string | null;
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
    /** ENG-282: the month this is (its `n` on this booking), while one is due or overdue; `purpose` is then `rent`. */
    period?: number;
  } | null;
  payments: MoneyRow[];
  pick_deadline_at: string | null;
  /** What Renit really did to reach the owner, so "no answer" says only what is true. */
  tried?: { ring: boolean; second_ring: boolean; staff_call: boolean } | null;
  cancels_left_today: number;
  window: TimeWindow | null;
  window_request: { by: "owner" | "customer"; start: string; end: string; asked_at: string; expired?: boolean } | null;
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
  /** When the handover code and the return code were typed. The timeline has the same two moments. */
  handover_at?: string | null;
  returned_at?: string | null;
  /**
   * The day staff named when they recorded the return later (T-22): "YYYY-MM-DD", or null for a return by the code, whose day
   * is `returned_at`'s own. Late days were counted to it.
   */
  came_back_on?: string | null;
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

/**
 * How far ahead a search or a booking may reach: 180 days (decision T-25; the limit the product page already uses for
 * the days it shows as taken). The server refuses a last day beyond it with 400 `validation_error`.
 * Workaround, no contract field: the number is held here; the date pickers stop at it, and a refusal that still comes
 * is shown in the server's own sentence (`daysRefusal`).
 */
export const BOOKING_DAYS_AHEAD = 180;

/** The last day a booking or a search may start on, from today (ENG-281: the first day, not the last). */
export const lastBookableDay = (today: string): string => addDays(today, BOOKING_DAYS_AHEAD);

/** ENG-281: the longest booking, both ends counted: a year. The server refuses a longer one. */
export const LONGEST_BOOKING_DAYS = 365;

/** The last day a booking that starts on `first` can end on. */
export const lastReturnDay = (first: string): string => addDays(first, LONGEST_BOOKING_DAYS - 1);

/**
 * ENG-281: the return days a booking from `first` cannot have, its minimum not reached: from the day after `first` up to
 * the day before the earliest return. A minimum of 3 days from Sat 24 greys out Sun 25 alone; Mon 26 is the minimum itself.
 */
export function daysInsideMinimum(first: string, minDays: number): string[] {
  const days: string[] = [];
  for (let n = 2; n < minDays; n++) days.push(addDays(first, n - 1));
  return days;
}

/** Days the server takes: the start within 180 days of today, at most a year long. */
export function daysAllowed(first: string, last: string, today: string): boolean {
  return first >= today && last >= first && first <= lastBookableDay(today) && last <= lastReturnDay(first);
}

/**
 * The server's own sentence for days it refused ("You can book up to 180 days ahead.", "Pick days within the next 180
 * days.", "The first day is in the past."): the first message of a 400 `validation_error` on the days, or null for any
 * other failure.
 */
export function daysRefusal(error: ApiError | null | undefined): string | null {
  if (error?.code !== "validation_error") return null;
  const fields = fieldErrors(error);
  return fields.last_day ?? fields.end_date ?? fields.first_day ?? fields.start_date ?? null;
}

/** Today in India: the first day anyone can book. */
export const todayIst = (now: Date = new Date()) => istDay(now);

/** "2026-10-24" → "Sat 24 Oct". */
export function dayShort(day: string): string {
  const d = new Date(dayMs(day));
  if (Number.isNaN(d.getTime())) return "";
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "2026-10-24" → "24 Oct": a month's dates and its pill (ENG-282), where the weekday would crowd the row. */
export function dayMonth(day: string): string {
  const d = new Date(dayMs(day));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
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

/**
 * When the deposit is due, as every screen of a booking says it (test run D-18). Two moments exist: `deposit_ask_at`, 24 hours
 * before the reference time, when Renit asks for it, and `deposit_due_at`, 2 hours before it, the last moment to pay. The
 * reference is the arrival window once one is picked and the shop's opening on the first day before that, and the server
 * recomputes both when the window is set (`_set_window`). So: before a window, the day Renit asks (the design's "due Fri 23
 * Oct"); once a window is picked, the deadline itself, day and time, which is what the "Deposit due" screen says. Null when the
 * answer has neither.
 */
export function depositDueWhen(
  m: { deposit_ask_at: string | null; deposit_due_at: string | null },
  windowPicked: boolean
): string | null {
  const dueDay = dayOf(m.deposit_due_at);
  if (windowPicked && dueDay) return `${dayShort(dueDay)}, ${clock(m.deposit_due_at)}`;
  const askDay = dayOf(m.deposit_ask_at);
  return askDay ? dayShort(askDay) : null;
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
 * What a tap on the calendar does. The first tap is a one-day rental (when the
 * listing allows one day); a later day extends it; anything else (a day before
 * the start, or a third tap) starts again. `blocked` is true when the stretch
 * would cross a day that is taken: the tapped day then becomes the new start.
 * `short` (ENG-281): a return day inside the listing's minimum, refused; the
 * start stays.
 */
export function tapDay(
  picked: PickedDays | null,
  day: string,
  taken: Set<string>,
  minDays = 1
): { picked: PickedDays; blocked: boolean; short?: boolean } {
  if (!picked || picked.last || day < picked.first) return { picked: { first: day, last: null }, blocked: false };
  if (dayCount(picked.first, day) < minDays) return { picked, blocked: false, short: true };
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

/**
 * The delivery choice on BK-02: "Delivery to Home · ₹170 · 8 km", or, when the
 * shop can't deliver there, the plain title and the reason (ENG-284 D11):
 * "SoundBox Rentals doesn't deliver to Vesava (400061). …". Only `ok` is a
 * yes: an unknown status from a newer server is not available.
 */
export function deliveryOption(
  quote: Pick<Quote, "delivery"> | null | undefined,
  addressName: string,
  shop: { name: string; maxKm?: string | number | null } = { name: "The shop" }
): { title: string; reason: string | null; ok: boolean } {
  const to = `Delivery to ${addressName}`;
  if (!quote) return { title: to, reason: null, ok: true };
  const { status, fee, distance_km } = quote.delivery;
  if (status !== "ok") {
    return { title: to, reason: deliveryReason(quote.delivery, shop.name, shop.maxKm), ok: false };
  }
  const parts = [to, money(fee), distance_km ? kmText(distance_km) : null].filter(Boolean);
  return { title: parts.join(" · "), reason: null, ok: true };
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

/** "Handover 10 am – 8 pm", with the days when the week is not all the same. A shop open all day says "all day", not "12 am – 11:59 pm". */
export function handoverLine(hours: Hours | null | undefined): string | null {
  const rows = hoursRows(hours);
  const open = rows.filter((row) => row.value !== "Closed");
  if (open.length === 0) return null;
  const said = (value: string) => (value === ALL_DAY ? "all day" : value);
  if (open.length === 1) {
    return rows.length === 1
      ? `Handover ${said(open[0].value)}`
      : `Handover ${said(open[0].value)} · ${open[0].label}`;
  }
  return `Handover ${open.map((row) => `${row.label} ${said(row.value)}`).join(", ")}`;
}

/**
 * BK-01's price block: "₹610 a day" and, under it, "Deposit ₹3,000 · refundable". The deposit line is left out when there is no
 * deposit to refund (zero, or none given); the rate is left out when the listing has none yet.
 */
export function priceBlock(
  rate: string | number | null | undefined,
  deposit: string | number | null | undefined
): { rate: string; deposit: string | null } | null {
  const rateOk = rate !== null && rate !== undefined && String(rate).trim() !== "" && Number.isFinite(Number(rate));
  if (!rateOk) return null;
  const held = deposit !== null && deposit !== undefined && Number(deposit) > 0;
  return { rate: money(rate), deposit: held ? `Deposit ${money(deposit)} · refundable` : null };
}

/**
 * "Self pickup or delivery from ₹50". A product marked not delivered is pickup
 * only. With an answer for the customer's address (ENG-284 U6), that answer:
 * "Self pickup or delivery to Home ₹110" / "Self pickup · doesn't deliver to Home".
 */
export function getItLine(
  shop: ProductShop | null | undefined,
  notDelivered?: boolean,
  delivery?: ListingDelivery | null,
  addressName?: string | null
): string {
  const forAddress = productHowLine({ shop, not_delivered: notDelivered, delivery }, addressName ?? null);
  if (forAddress) return forAddress;
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

/**
 * The three lines above the total. The fee is always shown, crossed out when
 * less is charged. Self pickup is said as itself, "Self pickup · Free" (ENG-284),
 * not as a ₹0 delivery; an extension keeps its old line.
 */
export function priceLines(quote: Quote, extending = false): PriceLine[] {
  const fee: PriceLine = { label: "Renit's fee", amount: money(quote.fee_charged) };
  if (Number(quote.fee_shown) !== Number(quote.fee_charged)) fee.struck = money(quote.fee_shown);
  const plan = quote.plan;
  // ENG-281: a week or month plan names itself; a day plan reads as it always did.
  const rent =
    plan && plan.unit !== "day"
      ? `Rent · ${daysLabel(quote.days)}, ${plan.unit === "week" ? "weekly" : "monthly"} rate`
      : `Rent · ${daysLabel(quote.days)} × ${money(quote.rate)}`;
  const handover =
    quote.delivery_mode === "pickup" && !extending
      ? { label: "Self pickup", amount: "Free" }
      : // ENG-284: the shop stopped delivering here; "₹0" would read as free delivery.
        quote.delivery_mode === "owner_delivery" && quote.delivery.offer_pickup && !extending
        ? { label: "Delivery", amount: "Not available" }
        : { label: "Delivery", amount: money(quote.delivery.fee) };
  return [{ label: rent, amount: money(quote.rent) }, handover, fee];
}

/** Under the rent of a week or month plan: "₹3,500 a week ÷ 7 = ₹500 a day". Null for a day plan or an older server. */
export function rateLine(quote: Quote): string | null {
  const plan = quote.plan;
  if (!plan || plan.unit === "day") return null;
  const days = plan.unit === "week" ? 7 : 30;
  return `${money(plan.price)} a ${plan.unit} ÷ ${days} = ${money(quote.rate)} a day`;
}

/** "Total rent" as the frame says; plain "Total" once a delivery fee is in it. */
export const totalLabel = (quote: Quote) => (isPositive(quote.delivery.fee) ? "Total" : "Total rent");

/** True when the shop is closed and will be asked at its next opening. */
export const isForMorning = (quote: Pick<Quote, "shop">) => !quote.shop.is_open && quote.shop.book_for_morning;

/**
 * "Within 30 minutes of their yes", as BK-03 writes it, with the server's own number
 * (`rent_pay_minutes`): no client holds the 30. It counts from the accept, which
 * the line says (E-36), and is about the customer's own payment.
 */
function rentWindow(minutes: number | null | undefined): string {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return "Soon after they accept";
  return n === 1 ? "Within 1 minute of their yes" : `Within ${n} minutes of their yes`;
}

/** The one way every screen says when the deposit is paid (E-79): "refundable, due Fri 16 Oct" or "refundable, paid with the rent". */
export function depositTerms(withRent: boolean, due: string | null): string {
  if (withRent) return "refundable, paid with the rent";
  return due ? `refundable, due ${due}` : "refundable, due before the handover";
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export interface PayStep {
  title: string;
  sub: string;
  amount: string;
}

/** ENG-282: billed a month at a time, with month 1's amount to show. */
const monthlyQuote = (quote: Quote) => quote.billing === "monthly" && quote.first_payment != null;

/** What is paid once the owner accepts: the whole rest, or month 1 alone for monthly billing. */
const afterAccept = (quote: Quote) => (monthlyQuote(quote) ? (quote.first_payment as string) : quote.pay_after_accept);

/** "Month 1 now, then ₹1,800 a month": the price panel's line for monthly billing, or null. */
export function monthlyLine(quote: Quote): string | null {
  if (!monthlyQuote(quote) || !quote.plan) return null;
  return `Month 1 now, then ${money(quote.plan.price)} a month`;
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
  if (isPositive(afterAccept(quote))) {
    const opens = isForMorning(quote) && quote.shop.opens_at ? timeAndDay(quote.shop.opens_at, now) : null;
    const when = opens ? `They are asked ${opens.day} at ${opens.time}` : rentWindow(quote.rent_pay_minutes);
    steps.push({
      title: "After the owner accepts",
      sub: monthlyQuote(quote) ? `Month 1 · ${when}` : when,
      amount: money(afterAccept(quote)),
    });
  }
  if (isPositive(quote.deposit.amount)) {
    steps.push({
      title: "Deposit",
      sub: capital(depositTerms(quote.deposit.with_rent, quote.deposit.due_on ? dayShort(quote.deposit.due_on) : null)),
      amount: money(quote.deposit.amount),
    });
  }
  return steps;
}

/** The sum of all of it, under the steps (E-65): what is paid now, after the accept, and the deposit, then the total. */
export function totalLine(quote: Quote, moved = false): string {
  const parts = [`${money(quote.pay_now)} ${moved ? "already paid" : "now"}`];
  const after = afterAccept(quote);
  if (isPositive(after)) parts.push(`${money(after)} after the owner accepts`);
  if (isPositive(quote.deposit.amount)) parts.push(`${money(quote.deposit.amount)} deposit (refundable)`);
  const all = Number(quote.pay_now) + Number(after) + Number(quote.deposit.amount);
  const deposit = isPositive(quote.deposit.amount) ? ", deposit included" : "";
  // Monthly: what the start costs, then each later month by its own link.
  if (monthlyQuote(quote) && quote.plan) {
    return `${parts.join(", ")}. To start${deposit}: ${money(all)}. Then ${money(quote.plan.price)} a month.`;
  }
  // Not "Total": the price panel's Total is the rent without the deposit.
  return `${parts.join(", ")}. In all${deposit}: ${money(all)}.`;
}

/**
 * The plain lines under the sums (D-2, N1 to N7): what Book now does with the ₹99, what cancelling costs, late days, early return.
 * Every amount and length of time is the quote's; an older server's quote without them gets the sentence without the number.
 */
export function plainLines(quote: Quote, moved = false): string[] {
  const handover = quote.delivery_mode === "owner_delivery" ? "delivery" : "pickup";
  const amount = money(quote.pay_now);
  const morning = isForMorning(quote);
  const minutes = Number(quote.ring_minutes);
  const answer = Number.isFinite(minutes) && minutes > 0 ? ` and has up to ${pluralize(minutes, "minute")} to answer` : "";
  const cancel = quote.cancel;
  // Without the server's number: "a day", never a made-up 24.
  const before = cancel ? pluralize(cancel.free_hours, "hour") : "a day";
  const rentToPay = isPositive(quote.pay_after_accept);
  const payMinutes = Number(quote.rent_pay_minutes);
  const payWindow = Number.isFinite(payMinutes) && payMinutes > 0 ? ` within ${pluralize(payMinutes, "minute")} of their yes` : " in time";
  return [
    moved
      ? `Your ${amount} from the earlier request moves to this booking and counts toward the rent.`
      : `${morning ? "Book for the morning" : "Book now"} pays ${amount} now, which counts toward the rent.`,
    `${morning ? "The owner is asked when they open" : "The owner is rung"}${answer}.`,
    `If they say no, do not answer, or you cancel before they answer, the ${amount} comes back in full.`,
    ...(morning ? [`Changed your mind? Cancel any time before they open and the ${amount} comes back.`] : []),
    // N4: the ₹99 is also kept when the rent is not paid after the accept.
    ...(rentToPay ? [`If you do not pay the rent${payWindow}, the booking lapses and Renit keeps the ${amount}.`] : []),
    rentToPay
      ? `Once they accept, cancelling up to ${before} before ${handover} gives the rent back in full. Renit keeps the ${amount}.`
      : `Once they accept, Renit keeps the ${amount} if you cancel up to ${before} before ${handover}.`,
    // With the ₹99 covering it all there is no rent paid, so no day's rent to split.
    ...(rentToPay
      ? [`Inside that time, one day's rent${cancel ? ` (${money(cancel.day_rent)})` : ""} goes to the owner for holding the dates, and the rest comes back.`]
      : []),
    ...(rentToPay && cancel?.grace
      ? [`This ${handover} is under ${pluralize(cancel.free_hours, "hour")} ${morning ? "after the owner is asked" : "away"}, so you have ${pluralize(cancel.grace_minutes, "minute")} after paying the rent to cancel and get the rent back.`]
      : []),
    // ENG-281: on a week or month plan a late day costs that plan's price a day, which is not "one day's rent" of a daily price.
    quote.plan && quote.plan.unit !== "day"
      ? `Each late day costs ${money(quote.rate)}, your plan's price a day.`
      : "Each late day costs one day's rent.",
    earlyReturnLine(quote),
  ];
}

/** "Ending before 6 months costs one month's rent (₹1,800)."; without the minimum, the same with no number. Null when nothing is owed. */
export function noticeLine(min: number | null | undefined, notice: string | number | null | undefined): string | null {
  if (!isPositive(notice == null ? null : String(notice))) return null;
  const before = min && min >= 2 ? `Ending before ${min} months` : "Ending early";
  return `${before} costs one month's rent (${money(notice)}).`;
}

/**
 * The last of the plain lines. ENG-282: with a notice, "Ending before 6 months costs one month's rent (₹1,800)."; billed
 * monthly without one, ending early stops the later months; otherwise, as before, no refund.
 */
function earlyReturnLine(quote: Quote): string {
  const notice = noticeLine(quote.plan?.unit === "month" ? quote.plan.min : null, quote.notice);
  if (notice) return notice;
  if (monthlyQuote(quote)) return "You can end early: the month you are in is not refunded, and the months after are not charged.";
  return "Returning early gives no refund.";
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

/**
 * An item whose handover needs the ID match (`id_check.needed` is `id_and_match`; the booking's `id_match_required`): the owner
 * cannot finish the handover without ticking that the name on the customer's ID is right, so the customer is told to bring one.
 * Said by itself, with no word about a check, whatever `passed` is (decision T-41 took the "ID check passed" card away; the
 * sentence was only ever in it).
 */
export const HANDOVER_ID = "Bring a photo ID in your own name to the handover. The owner checks the name on it.";

/**
 * What the price screen says about the ID check, or null when the item needs
 * none, the customer is signed out and the quote cannot say, or no real check stands behind the answer (`passed` is
 * null, T-41: "ID check passed" must not be said of a stand-in).
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
    // Only a check that was run and not passed asks for one; an unknown (`null`) says nothing (T-41).
    (quote.id_check !== null && quote.id_check.needed !== "none" && quote.id_check.passed === false);
  if (notPassed) {
    return {
      state: "needed",
      title: "This item needs an ID check",
      body:
        level === "id_and_match"
          ? "Renit checks your ID once, before you book an item like this."
          : "Renit checks your ID once, before you book an item like this. It then covers every booking.",
    };
  }
  if (quote.id_check && quote.id_check.needed !== "none" && quote.id_check.passed === true) {
    // The handover sentence is `handoverIdLine`, said by itself under the card.
    return { state: "passed", title: "ID check passed", body: null };
  }
  return null;
}

/**
 * What the price screen says about the ID at the handover, by itself: the sentence for an item that needs the match, whatever
 * `passed` says and whether or not the ID card shows. Null for any other item, and signed out (the quote cannot say); and null
 * when the screen prices an extension (`extending`): there is no handover then, the item is already with the customer.
 */
export function handoverIdLine(quote: Pick<Quote, "id_check">, extending: boolean | string | null = false): string | null {
  return !extending && quote.id_check?.needed === "id_and_match" ? HANDOVER_ID : null;
}

// ---- Why Book now would fail ------------------------------------------------------------

/** Blockers with their own place on the screen (the tick, the ID check card). */
const OWN_PLACE = new Set(["terms_not_accepted", "id_check_needed"]);

/** Blockers that picking other dates or another way to get it can fix. */
const FIXED_BY_DATES = new Set([
  "own_product",
  "too_short",
  "no_unit_free",
  "closed_that_day",
  "closed_on_return_day",
  "notice_too_short",
  "owner_cannot_accept",
  "too_far",
  "area_off",
  "delivery_not_offered",
]);

/** A blocker or a Book now error code in plain words; null for one this list does not know. */
export function blockerText(code: string, details?: Record<string, unknown> | null): string | null {
  switch (code) {
    case "own_product":
      return "This is your own listing.";
    case "too_short": {
      // ENG-281: shorter than every plan's minimum. A quote carries `min_days`; Book now's error says the minimum itself.
      const n = Number(details?.min_days);
      return n > 1 ? `Pick at least ${daysLabel(n)}.` : "These dates are shorter than this listing's minimum rental.";
    }
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
    case "area_off": {
      // ENG-284: Book now's 409 names the area in its own message; a quote's blocker has it in `delivery.area`.
      const area = details?.area as { pin?: string; name?: string } | undefined;
      const where = area?.name && area.pin ? `${area.name} (${area.pin})` : area?.name || area?.pin;
      return where
        ? `This shop doesn't deliver to ${where}. Choose self pickup.`
        : "This shop doesn't deliver to this area. Choose self pickup.";
    }
    case "delivery_not_offered":
      return "This item is not delivered. Choose self pickup.";
    case "phone_required":
      return "Add a phone number to your account to book. The pay page needs it.";
    case "linked_account":
      return "You can't book from this owner: your accounts share a phone number, a device or a bank account.";
    // Only an extension has these (ENG-220, T-30): the quote lists them as codes, and the price screen says each in words.
    case "listing_unavailable":
      return "This item is not taking bookings right now. Ask the owner.";
    case "claim_open":
      return "A report on this booking is waiting for Renit's decision. It cannot be extended until then.";
    case "already_extending":
      return "You have already asked to extend this rental.";
    case "shop_closed":
      return "The shop is closed now. An extension can be asked for while it is open.";
    case "too_late_to_extend":
      return "It is too close to the return time for the shop to answer. Return the item, then book it again.";
    default:
      return null;
  }
}

/** The first thing in the way that the dates screen can fix, in the server's order. */
export function datesBlocker(quote: Quote | null | undefined): string | null {
  const code = quote?.blockers.find((b) => FIXED_BY_DATES.has(b));
  return code ? blockerText(code, { min_days: quote?.min_days, area: quote?.delivery.area }) : null;
}

/** The first thing in the way on the price screen, leaving out the tick and the ID check. */
export function reviewBlocker(quote: Quote | null | undefined): { code: string; text: string } | null {
  for (const code of quote?.blockers ?? []) {
    if (OWN_PLACE.has(code)) continue;
    const text = blockerText(code, { area: quote?.delivery.area });
    if (text) return { code, text };
  }
  return null;
}

/** The refusals only an extension has, each a 409 (`handover/extend.py`). */
const EXTENSION_REFUSALS = new Set(["listing_unavailable", "claim_open", "already_extending", "shop_closed", "too_late_to_extend"]);

/**
 * The server's sentence when the quote itself was refused for an extension, not just held: 409 `too_late_to_extend` for a
 * rental already past its last day (nothing can be priced then), and the like. Its own words, else this app's for the
 * code. Null for any other failure.
 */
export function quoteRefusal(error: ApiError | null | undefined): string | null {
  if (!error || error.status !== 409 || !error.code || !EXTENSION_REFUSALS.has(error.code)) return null;
  return error.message ?? blockerText(error.code, error.details);
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
  // The area turned off between the quote and Book now: the server's sentence names it (ENG-284 D11).
  if (error?.code === "area_off" && error.message) return error.message;
  const known = error?.code ? blockerText(error.code, error.details) : null;
  if (known) return known;
  switch (error?.code) {
    case "id_check_needed":
      return "This item needs an ID check before you can book it.";
    case "terms_not_accepted":
      return "The rental terms have changed. Read them and tick the box again.";
    case "price_changed":
      return "The price changed. Check the new total, then book again.";
    case "validation_error":
      // Days the server will not take (more than 180 days ahead, in the past): its own sentence.
      return daysRefusal(error) ?? error?.message ?? "We couldn't book this. Check the dates and try again.";
    case "move_not_allowed":
      // Whatever the reason (the first booking's ₹99 is gone, its time is over, or it is not the amount this booking
      // asks for at Book now: a booking under ₹99 asks for less), the first payment goes back to the customer by itself
      // and this booking needs a payment of its own.
      return "Your first payment can't move to this booking, so it is refunded to you, and this booking needs its own. Tap Book now again to pay for it.";
    case "days_too_far": {
      // A second guard behind the 180-day check: the last day that can be booked is in `details.until`.
      const until = typeof error.details?.until === "string" ? dayShort(error.details.until) : "";
      return until ? `Bookings can be made up to ${until}. Pick earlier days.` : "Bookings can be made up to 180 days ahead. Pick earlier days.";
    }
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
  /** Of `to_owner`, the delivery fee an owner who had set out keeps; the rest is one day's rent. Absent from an older server. */
  to_owner_delivery?: string;
  free_until: string | null;
}

/**
 * What goes to the owner and why (E-82). `to_owner` is one day's rent, plus the delivery fee when an owner delivering had set out
 * (`to_owner_delivery`); "one day's rent" is said only when the amount is that. An answer that cannot say gets no name for it.
 */
function ownerLine(outcome: CancelOutcome): string {
  const total = money(outcome.to_owner);
  const delivery = outcome.to_owner_delivery;
  if (delivery === undefined) return `${total} goes to the owner for holding the dates.`;
  if (!isPositive(delivery)) {
    return `${total} goes to the owner: one day's rent, for holding the dates. Your booking amount counts toward it.`;
  }
  const rent = Number(outcome.to_owner) - Number(delivery);
  return `${total} goes to the owner: one day's rent (${money(rent)}) and the delivery fee (${money(delivery)}), as they had set out. Your booking amount counts toward it.`;
}

/** What is kept and why (E-78): who keeps it, so "not returned" never stands alone. The server's own words when it sends them. */
const keptLine = (row: CancelMoney) =>
  sentence(row.text || `Renit keeps the ${money(row.amount)}: the owner had already said yes`);

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
    ...outcome.kept.map(keptLine),
    ...(isPositive(outcome.to_owner) ? [ownerLine(outcome)] : []),
  ];
  return {
    title: ringing ? "Cancel this request?" : "Cancel this booking?",
    lines: lines.length ? lines : ["Nothing has been paid, so there is nothing to refund."],
    confirm: ringing ? "Cancel request" : "Cancel booking",
  };
}

/** Where this phone keeps the outcome a cancel carried out, for the cancelled page (D-24; in the query cache, for this run of the app). */
export const cancelledKey = (number: string) => ["cancelled-outcome", number];

/**
 * True while a cancel promised money back and the booking does not show every refund yet. The server makes the refund
 * with a timed job a few seconds after the cancel, so the answer to the cancel itself has no refund row (D-24).
 */
export function refundPending(booking: Pick<BookingCustomer, "payments"> | null | undefined, outcome: CancelOutcome | null | undefined): boolean {
  if (!booking || !outcome) return false;
  const promised = outcome.back.filter((row) => isPositive(row.amount)).length;
  return booking.payments.filter((row) => row.kind === "refund").length < promised;
}

/**
 * What a customer's cancel did with the money, read back from the booking itself, so the cancelled page says the same later
 * and on another phone (D-28): the refund rows are what goes back, to where, in how many working days, and a booking amount in
 * the state `kept` is what is not returned. Null while the booking shows neither (the refund row comes a few seconds after the
 * cancel), so nothing is said that is not known. What goes to the owner when the cancel was inside 24 hours is the
 * booking's `money.owner_share` (a server older than that field gives none, and then none is said).
 */
export function cancelOutcomeOf(booking: Pick<BookingCustomer, "payments" | "money" | "exit_reason">): CancelOutcome | null {
  const back = booking.payments
    .filter((row) => row.kind === "refund" && isPositive(row.amount))
    .map((row) => ({
      what: row.what,
      amount: row.amount,
      text: row.text,
      expected_days_min: row.expected_days_min,
      expected_days_max: row.expected_days_max,
    }));
  const m = booking.money;
  const kept =
    m.booking_amount_state === "kept" && isPositive(m.booking_amount)
      ? [{ what: "booking_amount" as const, amount: m.booking_amount, text: null }]
      : [];
  if (back.length === 0 && kept.length === 0) return null;
  const reason = booking.exit_reason;
  return {
    case: reason === "free" || reason === "inside_24h" || reason === "after_accept" ? reason : "ringing",
    back,
    kept,
    to_owner: m.owner_share ?? "0.00",
    // The owner's share is one day's rent, and the delivery fee on top when they had set out: split it by the day's rent.
    ...(m.owner_share != null
      ? { to_owner_delivery: Math.max(Number(m.owner_share) - Number(m.rate), 0).toFixed(2) }
      : {}),
    free_until: null,
  };
}

/**
 * What the cancelled page says: the cancel itself, then what the server did with the money, in the sheet's own words (what
 * goes back, to where, in how many working days, and what is not returned). `cached` is the outcome of the cancel this phone
 * made in this run of the app; otherwise the words are read back from the booking (`cancelOutcomeOf`), with a line for the
 * owner's day's rent where the booking says the cancel was inside 24 hours and gives no amount for it.
 */
function cancelledSub(first: string, booking: BookingCustomer, cached: CancelOutcome | null | undefined): string {
  const outcome = cached ?? cancelOutcomeOf(booking);
  if (!outcome) return first;
  const owner =
    !cached && booking.exit_reason === "inside_24h" && !isPositive(booking.money.owner_share ?? "0")
      ? ["One day's rent goes to the owner."]
      : [];
  return [first, ...cancelCopy(outcome).lines, ...owner].map(sentence).join(" ");
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
  // The refund row once it exists; before that the server's days for how it was paid, the one table (D-11). Never a figure of ours.
  const known = booking.money.booking_amount_refund_days;
  const days = daysText(refund?.expected_days_min, refund?.expected_days_max) || (known ? daysText(known.min, known.max) : "");
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
      return { title, body: "Renit kept it, because the owner had already said yes." };
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
  // ENG-282: billed monthly, the rent payment is month 1 (its rent, fee and the delivery fee), not the whole booking, so
  // the lines add up to what is charged.
  const month1 =
    m.billing === "monthly"
      ? m.periods?.find((p) => p.booking === booking.number && p.n === 1 && p.kind === "rent") ?? null
      : null;
  const lines: PriceLine[] = month1 ? [{ label: "Month 1", amount: money(month1.amount) }] : [{ label: "Rent", amount: money(m.rent) }];
  if (!month1 && isPositive(m.delivery_fee)) lines.push({ label: "Delivery", amount: money(m.delivery_fee) });
  if (!month1 && isPositive(m.fee_charged)) lines.push({ label: "Renit's fee", amount: money(m.fee_charged) });
  lines.push({ label: "Already paid", amount: money(m.booking_amount), amountTone: "success" });
  if (isPositive(depositPart)) lines.push({ label: "Deposit · refundable", amount: money(depositPart) });

  const dueWhen = depositDueWhen(m, Boolean(booking.window));
  const note = withDeposit
    ? `Deposit ${money(depositPart)}, ${depositTerms(true, null)}.`
    : isPositive(m.deposit) && (m.deposit_state === "not_due" || m.deposit_state === "due")
      ? `Deposit ${money(m.deposit)}, ${depositTerms(false, dueWhen)}.`
      : null;

  return {
    title: `${booking.shop.name} accepted`,
    sub: `Pay ${amount}${byWhen(booking.pay_now?.due_at ?? m.rent_due_at, now)} to confirm your booking.`,
    lines,
    total: { label: "To pay now", amount },
    note,
    small: `If it isn't paid in time, the booking lapses and Renit keeps the ${money(m.booking_amount)}.`,
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
      ? coversWholeDay(hours)
        ? `${on} · the shop hands over all day`
        : `${on} · the shop hands over between ${time12(hours.open)} and ${time12(hours.close)}`
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
    case "window_request_expired":
      return WINDOW_REQUEST_ENDED;
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

/** A request whose slot has begun can never be accepted; the server says `expired`. */
export const WINDOW_REQUEST_ENDED = "This time has passed. The request has ended.";

/** A request to move the window that is waiting for an answer. */
export function windowRequestCopy(
  booking: Pick<BookingCustomer, "window_request" | "can">
): { title: string; body: string; canAnswer: boolean } | null {
  const request = booking.window_request;
  if (!request) return null;
  const to = windowSummary(request);
  const title = request.by === "owner" ? "The shop asked to move your arrival" : "You asked to change your arrival time";
  if (request.expired) return { title, body: WINDOW_REQUEST_ENDED, canAnswer: false };
  return request.by === "owner"
    ? {
        title,
        body: `New time: ${to}. Your time stays as it is unless you accept.`,
        canAnswer: booking.can.includes("answer_window_change"),
      }
    : {
        title,
        body: `To ${to}. Your time stays as it is until the shop accepts.`,
        canAnswer: false,
      };
}

// ---- The deposit after late days ---------------------------------------------------------------------

export interface DepositAfterLate {
  deposit: number;
  /** The late days, fixed when the return code is typed. */
  days: number;
  /** What is kept for them: one day's rent each, never more than the deposit. */
  kept: number;
  /** ENG-282: an unpaid notice month, taken after the late days (the server's order), never more than is left. */
  notice: number;
  /** What comes back, before any damage Renit's staff may still decide. */
  back: number;
}

/** Why part of the deposit is kept: "2 late days", "the notice", "2 late days and the notice". */
export function keptReasons(late: DepositAfterLate): string {
  return [late.kept > 0 ? lateDaysLabel(late.days) : null, late.notice > 0 ? "the notice" : null].filter(Boolean).join(" and ");
}

/** What is kept and for what: "₹1,220 is kept for 2 late days and ₹1,800 for the notice". */
export function keptLineOf(late: DepositAfterLate): string {
  const parts = [
    late.kept > 0 ? `${money(late.kept)} is kept for ${lateDaysLabel(late.days)}` : null,
    late.notice > 0 ? (late.kept > 0 ? `${money(late.notice)} for the notice` : `${money(late.notice)} is kept for the notice`) : null,
  ];
  return parts.filter(Boolean).join(" and ");
}

/**
 * What a deposit comes to once late days are on the booking (N11; ARCHITECTURE
 * 10.3, `deposit_settlement`). The server sends the deposit, the late days and
 * the late fee; what comes back is the one sum this app works out, because no
 * screen may promise the whole deposit when part of it is already spoken for.
 */
export function depositAfterLate(m: {
  deposit: string;
  late_days?: number | null;
  late_fee?: string | null;
  notice_deduction?: string | null;
}): DepositAfterLate {
  const deposit = Math.max(Number(m.deposit) || 0, 0);
  const days = Math.max(Number(m.late_days) || 0, 0);
  const kept = days > 0 ? Math.min(Math.max(Number(m.late_fee) || 0, 0), deposit) : 0;
  const notice = Math.min(Math.max(Number(m.notice_deduction) || 0, 0), deposit - kept);
  return { deposit, days, kept, notice, back: deposit - kept - notice };
}

/** "2 late days", "1 late day". */
export const lateDaysLabel = (days: number) => `${days} late ${days === 1 ? "day" : "days"}`;

// ---- The booking screen (BK-08) ---------------------------------------------------------------------

export interface Banner {
  tone: "success" | "brand" | "warning" | "neutral";
  title: string;
  sub: string | null;
}

/**
 * The top of the booking screen: where the booking stands, in a line or two. `cancelled`: the outcome of the cancel this
 * phone has just made in this run of the app; without it the page reads the same words back from the booking (D-28).
 */
export function bookingBanner(booking: BookingCustomer, cancelled?: CancelOutcome | null): Banner {
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
        return {
          tone: "neutral",
          title: "Request cancelled",
          sub: cancelledSub("You cancelled before the owner answered.", booking, cancelled),
        };
      }
      if (booking.exit_reason === "deposit_unpaid") {
        return { tone: "warning", title: "Booking cancelled", sub: "The deposit was not paid in time." };
      }
      if (booking.exit_reason === "claim_not_upheld") {
        return { tone: "neutral", title: "Booking cancelled", sub: "Renit looked at your report and did not uphold it." };
      }
      return { tone: "neutral", title: "Booking cancelled", sub: cancelledSub("You cancelled this booking.", booking, cancelled) };
    case "lapsed_unpaid":
      return {
        tone: "warning",
        title: "Booking lapsed",
        sub:
          m.booking_amount_state === "kept"
            ? `The rent was not paid in time. Renit kept the ${money(m.booking_amount)}.`
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
      // An extension has no window and no handover of its own: the item is already with the customer.
      if (booking.extends) {
        return {
          tone: "success",
          title: "Extension confirmed",
          sub: `Starts ${dayShort(booking.first_day)}. The item stays with you.`,
        };
      }
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
    case "returned": {
      // The late days are fixed at the return: say what they cost, never the whole deposit (review r1 #3).
      const late = depositAfterLate(m);
      return {
        tone: "brand",
        title: "Returned",
        sub: !isPositive(m.deposit)
          ? null
          : late.kept + late.notice > 0
            ? late.back > 0
              ? `${money(late.back)} of your ${money(late.deposit)} deposit comes back within 48 hours: ${keptLineOf(
                  late
                )}, and any damage Renit agrees comes off too.`
              : `Your ${money(late.deposit)} deposit is kept for ${keptReasons(late)}.`
            : "Your deposit comes back within 48 hours, less any agreed damage.",
      };
    }
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
  // An extension follows a rental the customer already holds: no window to pick, nothing to collect.
  const extension = Boolean(booking.extends);
  if (stage === "confirmed" && !booking.window && !extension) ahead.push({ label: "Arrival window", when: "Not picked yet" });
  if (m.deposit_state === "not_due" || m.deposit_state === "due") {
    const when = depositDueWhen(m, Boolean(booking.window));
    ahead.push({ label: `Deposit ${money(m.deposit)}`, when: when ? `due ${when}` : "due before handover" });
  }
  if (before("confirmed", "ready")) {
    ahead.push(
      extension
        ? { label: "Starts, the item stays with you", when: dayShort(booking.first_day) }
        : { label: booking.delivery_mode === "pickup" ? "Collect it" : "Delivery", when: dayShort(booking.first_day) }
    );
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
    const late = depositAfterLate(m);
    ahead.push({
      label:
        late.kept + late.notice > 0
          ? late.back > 0
            ? `${money(late.back)} of the deposit comes back`
            : `Deposit kept for ${keptReasons(late)}`
          : "Deposit comes back",
      when: day ? `by ${dayShort(day)}` : "within 48 hours",
    });
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
    sub: `${row.label || PAID_FOR[row.what] || "Payment"} · ${momentLabel(row.at, now)}`,
    ...status,
  };
}

/** Every payment and refund, oldest first, then the deposit while it is still to be paid. */
export function paymentRows(booking: BookingCustomer, now: Date = new Date()): MoneyRowView[] {
  const rows = booking.payments.map((row) => moneyRowView(row, now));
  const m = booking.money;
  if (!booking.exit && (m.deposit_state === "not_due" || m.deposit_state === "due")) {
    const when = depositDueWhen(m, Boolean(booking.window));
    rows.push({
      key: "deposit-to-pay",
      title: `Deposit ${money(m.deposit)}`,
      sub: capital(depositTerms(false, when)),
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
  const kept = outcome.kept[0] ? keptLine(outcome.kept[0]) : "";
  switch (outcome.case) {
    case "ringing":
      return "The booking amount comes back in full.";
    case "free": {
      const day = dayOf(outcome.free_until);
      const until = day ? `Rent back in full until ${dayShort(day)}, ${clock(outcome.free_until)}.` : "Rent back in full if you cancel now.";
      return [until, kept].filter(Boolean).join(" ");
    }
    case "inside_24h":
      if (!isPositive(outcome.to_owner)) return "The rest of what you paid is refunded.";
      if (outcome.to_owner_delivery === undefined) return `${money(outcome.to_owner)} goes to the owner. The rest is refunded.`;
      return isPositive(outcome.to_owner_delivery)
        ? `${money(outcome.to_owner)} goes to the owner: one day's rent and the delivery fee, as they had set out. The rest is refunded.`
        : `One day's rent (${money(outcome.to_owner)}) goes to the owner. The rest is refunded.`;
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

/** The booking's number as the customer reads it out to the desk: "Booking RN-20116". */
export const bookingLabel = (number: string): string => `Booking ${number}`;


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
      if (booking.extends) return `Starts ${dayShort(booking.first_day)} · the item stays with you`;
      if (!booking.window) return "Pick your arrival window";
      if (m.deposit_state === "not_due" || m.deposit_state === "due") {
        const when = depositDueWhen(m, true);
        return `Deposit ${money(m.deposit)} due${when ? ` ${when}` : " before handover"}`;
      }
      return `${arrive} ${windowSummary(booking.window)}`;
    }
    case "ready":
      return booking.window ? `${arrive} ${windowSummary(booking.window)}` : null;
    case "out": {
      const day = dayOf(booking.return_by);
      return day ? `Return by ${dayShort(day)}, ${clock(booking.return_by)}` : null;
    }
    case "returned": {
      if (m.deposit_state !== "paid") return null;
      const late = depositAfterLate(m);
      return late.kept + late.notice > 0
        ? `${money(late.back)} of the deposit comes back within 48 hours`
        : "Deposit comes back within 48 hours";
    }
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
