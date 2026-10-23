import type { BookingDay, BookingExit, BookingStage, DeliveryMode, MonthlyMoney, RingState, TimeWindow } from "@/lib/booking";
import type { CaptureFlags } from "@/lib/capture";
import type { PlanUnit } from "@/lib/plans";
import type { ApiError } from "@/lib/api-error";
import {
  TimelineRow,
  WINDOW_REQUEST_ENDED,
  clock,
  dayOf,
  dayShort,
  daysLabel,
  momentLabel,
  money,
  rangeLabel,
  todayIst,
  windowLabel,
  windowSummary,
} from "@/lib/booking";
import { isMonthly } from "@/lib/billing";
import { DeliveredBy, byRenit } from "@/lib/delivery";
import { kmText } from "@/lib/shop";
import { COURIER_WAY, OwnerCourier, courierOf, packByText } from "@/lib/shop-courier";
import { customerLine, customerName, whereText } from "@/lib/shop-ring";


/**
 * A booking as its shop sees it (API-CONTRACT, Shared objects, BookingShop).
 * Only the fields the phone reads are typed; a client ignores the rest.
 */
export type AnsweredVia = "phone" | "dashboard" | "admin" | "system";

export interface ShopMoney extends MonthlyMoney {
  rate: string;
  /** ENG-281: the plan that priced the booking. Absent from an older server. */
  plan?: { unit: PlanUnit; price: string; min?: number | null };
  rent: string;
  delivery_fee: string;
  fee_shown: string;
  fee_charged: string;
  you_earn: string;
  deposit: string;
  /** `none`, `not_due`, `due`, `paid`, `carried`, `settled`, `forfeited`. */
  deposit_state: string;
  deposit_ask_at: string | null;
  deposit_due_at: string | null;
  /** How long the customer has to pay once the shop accepts; the deadline says it, so it is not written out (P3-13). */
  rent_pay_minutes: number | null;
  /** The deadline, set at Accept; null before it (P3-13). */
  rent_due_at: string | null;
  /** Late days so far (set each night), fixed when the return code is typed; one day's rent each, from the deposit. */
  late_days?: number;
  late_fee?: string;
  damage_deduction?: string;
  /** The rent of an upheld fault report that comes off a later payout, and how much of it has not yet; absent from an older server. */
  clawback?: string;
  clawback_left?: string;
  payout: {
    status: string;
    status_reason: string | null;
    /** Ready to show: "Sent on the day of handover". */
    text: string;
    amount: string;
    due_at: string | null;
    paid_at: string | null;
    more: number;
  } | null;
}

export interface ShopTimelineEntry {
  event: string;
  label: string;
  at: string;
  by: "customer" | "owner" | "system" | "staff";
  text?: string;
}

export interface ShopWindowRequest {
  by: "customer" | "owner";
  start: string;
  end: string;
  asked_at: string;
  /** The slot asked for has begun: nothing can be accepted any more. */
  expired?: boolean;
}

export interface BookingShop {
  number: string;
  stage: BookingStage;
  ring_state: RingState;
  exit: BookingExit;
  exit_reason: string;
  is_open: boolean;
  product: { name: string; title: string; shop_code: string; cover_image: string | null; quantity: number };
  customer: {
    first_name: string;
    last_initial: string;
    /**
     * The customer's full name (T-44): from the stage Ready on, and only on a booking whose handover needs the ID match tick;
     * null otherwise, and absent from an answer from before the field.
     */
    full_name?: string | null;
    /** Null while no real ID check stands behind the answer (T-41): no ID line is drawn then. */
    id_checked: boolean | null;
    rentals_completed: number;
    area: string;
    distance_km: string | null;
    /** One line of text; null until the stage is `ready`. Owner delivery only. */
    address: string | null;
    coordinates?: { lat: number; long: number } | null;
  };
  first_day: string;
  last_day: string;
  days: number;
  delivery_mode: DeliveryMode;
  /** B1: `renit` when Renit's courier carries it both ways (the owner then sees the area only); absent is the shop. */
  delivered_by?: DeliveredBy | null;
  /** B1: the courier legs as the owner reads them; only on a `renit` booking. */
  courier?: OwnerCourier | null;
  units: { in_use: number; quantity: number };
  money: ShopMoney;
  /** Null while ringing. */
  answered: {
    at: string;
    via: AnsweredVia;
    device_name: string | null;
    seconds: number;
    /** The session that answered is the caller's own (P3-9). */
    this_device: boolean;
    session_id: number | null;
  } | null;
  window: TimeWindow | null;
  window_request: ShopWindowRequest | null;
  return_by: string | null;
  /** The owner looks at the customer's ID at the handover and ticks that the name matches. */
  id_match_required?: boolean;
  /**
   * The day of the handover (`call_number` is the customer's phone). The shop's
   * `handover_code` is null until the handover is done: the owner types it and is
   * never shown it first. `return_code` is six digits while the stage is `out`:
   * the owner shows it and the customer types it. It is null until the shop's own
   * return record is complete (the server holds it back, ENG-267).
   */
  day: BookingDay & { return_code: string | null };
  /** Whether each capture has finished uploading. */
  captures: CaptureFlags;
  /** When the handover code and the return code were typed. The timeline has the same two moments. */
  handover_at?: string | null;
  returned_at?: string | null;
  /** The day staff named when they recorded the return later (T-22), else null: the return's day is `returned_at`'s own. */
  came_back_on?: string | null;
  /** `returned_at` plus 24 hours while the stage is `returned`, else null. */
  report_problem_until?: string | null;
  /** A "Not as described" or fault report waits for Renit's decision. */
  claim_open?: boolean;
  claims?: number[];
  can: string[];
  timeline: ShopTimelineEntry[];
  created_at: string;
  /** The server's clock when the answer was made; a wrong phone clock is corrected by it (P3-17). */
  server_time: string;
}

// ---- The shop's bookings list (SH-06) and a booking's page (SH-07) -------------------------------

export type ShopTab = "ringing" | "accepted" | "confirmed" | "ready" | "out" | "returned" | "closed" | "ended";

/** The tabs, in the order of a booking's life; `ended` is every booking that ended early, whatever its stage. */
export const SHOP_TABS: readonly { key: ShopTab; label: string }[] = [
  { key: "ringing", label: "Ringing" },
  { key: "accepted", label: "Accepted" },
  { key: "confirmed", label: "Confirmed" },
  { key: "ready", label: "Ready" },
  { key: "out", label: "Out" },
  { key: "returned", label: "Returned" },
  { key: "closed", label: "Closed" },
  { key: "ended", label: "Ended" },
];

/** `GET /api/shop/bookings/counts/`. */
export type ShopCounts = Record<ShopTab, number>;

/** The tab to open on: the first stage with something in it, else the finished ones. */
export function defaultTab(counts: Partial<ShopCounts> | null | undefined): ShopTab {
  for (const { key } of SHOP_TABS) {
    if (key !== "closed" && key !== "ended" && (counts?.[key] ?? 0) > 0) return key;
  }
  return (counts?.closed ?? 0) > 0 ? "closed" : "confirmed";
}

/**
 * Where to scroll a row of chips so one is fully in view (test run D-select: the default chip, "Confirmed", sat half off the
 * right edge). `offset` is where the row is scrolled to now, `edge` the gutter kept beside the chip. The row is left where it
 * is when the chip is already in view; otherwise it moves by the least that shows it.
 */
export function revealChipAt(chip: { x: number; width: number }, viewport: number, offset: number, edge = 0): number {
  if (viewport <= 0) return offset;
  if (chip.x - edge < offset) return Math.max(0, chip.x - edge);
  if (chip.x + chip.width + edge > offset + viewport) return Math.max(0, chip.x + chip.width + edge - viewport);
  return offset;
}

export interface ShopPill {
  label: string;
  tone: "brand" | "success" | "warning" | "danger" | "neutral";
}

/** The stage in a word, or how it ended. */
export function shopPill(b: Pick<BookingShop, "stage" | "exit" | "exit_reason">): ShopPill {
  switch (b.exit) {
    case "refused":
      return { label: "Refused", tone: "neutral" };
    case "no_answer":
      return { label: "No answer", tone: "neutral" };
    case "cancelled_by_customer":
      return { label: "Cancelled", tone: "neutral" };
    case "cancelled_by_owner":
      return { label: "Cancelled by you", tone: "warning" };
    case "lapsed_unpaid":
      return { label: "Lapsed", tone: "neutral" };
    case "no_show":
      return b.exit_reason === "owner"
        ? { label: "You did not come", tone: "danger" }
        : { label: "Customer did not come", tone: "neutral" };
  }
  switch (b.stage) {
    case "ringing":
      return { label: "Ringing", tone: "brand" };
    case "accepted":
      return { label: "Accepted", tone: "brand" };
    case "confirmed":
      return { label: "Confirmed", tone: "success" };
    case "ready":
      return { label: "Ready", tone: "brand" };
    case "out":
      return { label: "Out", tone: "warning" };
    case "returned":
      return { label: "Returned", tone: "neutral" };
    default:
      return { label: "Closed", tone: "neutral" };
  }
}

/** "Self pickup", "Delivery · 2.8 km"; B1 "Renit courier". */
export function howLine(b: Pick<BookingShop, "delivery_mode" | "customer" | "delivered_by">): string {
  if (byRenit(b)) return COURIER_WAY;
  const km = b.customer.distance_km;
  return b.delivery_mode === "pickup" ? "Self pickup" : km ? `Delivery · ${kmText(km)}` : "Delivery";
}

/**
 * The quiet line a card can carry under its details: what the shop does next.
 * Null when there is nothing to add to the stage pill.
 */
export function cardNote(b: BookingShop, now: Date = new Date()): string | null {
  if (b.exit) return null;
  const today = todayIst(now);
  const courier = courierOf(b);
  // B1: before the seal, what the shop has to do by when; then the courier's window, never "Deliver".
  if (courier?.pack_by && !courier.seal && (b.stage === "confirmed" || b.stage === "ready")) return packByText(courier.pack_by, now);
  if (b.stage === "ready" && b.window) {
    const day = dayOf(b.window.start);
    const when = day === today ? "today" : day ? dayShort(day) : "";
    return `${courier ? "Courier collects" : b.delivery_mode === "pickup" ? "Collects" : "Deliver"} ${when}, ${windowLabel(b.window)}`;
  }
  if (b.stage === "confirmed" && !b.window) return "Waiting for the customer to pick an arrival time";
  if (b.stage === "accepted") {
    const due = b.money.rent_due_at;
    return due ? `Waiting for the customer to pay the rent by ${momentLabel(due, now)}` : "Waiting for the customer to pay the rent";
  }
  if (b.stage === "out" && b.return_by) {
    const day = dayOf(b.return_by);
    return `Back by ${day === today ? "" : `${dayShort(day ?? "")}, `}${clock(b.return_by)}`;
  }
  return null;
}

export interface BookingCard {
  number: string;
  title: string;
  image: string | null;
  dates: string;
  who: string;
  pill: ShopPill;
  note: string | null;
  earn: string;
}

export function bookingCard(b: BookingShop, now: Date = new Date()): BookingCard {
  return {
    number: b.number,
    title: b.product.title,
    image: b.product.cover_image,
    dates: `${rangeLabel(b.first_day, b.last_day)} · ${daysLabel(b.days)}`,
    who: `${customerName(b.customer)} · ${howLine(b)}`,
    pill: shopPill(b),
    note: cardNote(b, now),
    earn: money(b.money.you_earn),
  };
}

/** What the Bookings tab says when a tab has nothing in it. */
export function emptyTab(tab: ShopTab): { title: string; body: string } {
  switch (tab) {
    case "ringing":
      return { title: "Nothing is ringing", body: "New requests ring here and on the dashboard." };
    case "ended":
      return { title: "Nothing ended early", body: "Refused, unanswered and cancelled bookings are listed here." };
    case "closed":
      return { title: "No finished bookings yet", body: "A booking is closed once the item is back and the deposit is settled." };
    default:
      return { title: "No bookings here", body: "They show up here as they reach this stage." };
  }
}

/**
 * A booking's timeline for the shop: what happened (the server's own entries,
 * oldest first), then what is still to come, from where the booking stands. An
 * ended booking shows only what happened.
 */
export function shopTimeline(b: BookingShop, now: Date = new Date()): TimelineRow[] {
  const done: TimelineRow[] = b.timeline.map((entry) => {
    let when = momentLabel(entry.at, now);
    if (entry.event === "set_window" && b.window) when = windowSummary(b.window);
    if (entry.event === "accept" && b.answered) {
      const where = whereText(b.answered.via, b.answered.device_name, b.answered.this_device);
      if (where) when = `${when} on ${where}`;
    }
    return { label: entry.label, when, state: "done" };
  });
  if (b.exit) return done;

  const ahead: Omit<TimelineRow, "state">[] = [];
  const stage = b.stage;
  const before = (...stages: BookingShop["stage"][]) => stages.includes(stage);
  if (stage === "accepted") {
    const due = b.money.rent_due_at;
    ahead.push({ label: "Rent", when: due ? `customer pays by ${momentLabel(due, now)}` : "Waiting for the customer" });
  }
  if (stage === "confirmed" && !b.window) ahead.push({ label: "Arrival window", when: "Not picked yet" });
  if (b.money.deposit_state === "not_due" || b.money.deposit_state === "due") {
    const day = dayOf(b.money.deposit_ask_at);
    ahead.push({ label: "Deposit", when: day ? `due ${dayShort(day)}` : "due before handover" });
  }
  if (before("confirmed", "ready")) {
    ahead.push({ label: byRenit(b) ? "Courier collects" : b.delivery_mode === "pickup" ? "Handover" : "Delivery", when: dayShort(b.first_day) });
  }
  if (before("accepted", "confirmed", "ready", "out")) {
    const day = dayOf(b.return_by);
    ahead.push({ label: "Return", when: day ? `${dayShort(day)}, ${clock(b.return_by)}` : dayShort(b.last_day) });
  }
  return [...done, ...ahead.map((row, i): TimelineRow => ({ ...row, state: i === 0 ? "next" : "todo" }))];
}

export interface CustomerBlock {
  name: string;
  initial: string;
  line: string;
  place: string;
  /** Where the item goes, once it is known (owner delivery, from `ready`). */
  address: string | null;
  note: string | null;
}

/** The Customer card: first name, ID and rentals, the area and distance. Never a phone number or an address before `ready`. */
export function customerBlock(b: BookingShop, now: Date = new Date()): CustomerBlock {
  const km = b.customer.distance_km;
  const from = b.day.call_from;
  let note: string | null = null;
  // ENG-282: an unpaid month is the desk's to chase, not the shop's.
  if (!b.exit && b.stage === "out" && isMonthly(b.money)) note = "Renit's desk follows up on unpaid months.";
  const courier = byRenit(b);
  if (!b.exit && (b.stage === "confirmed" || b.stage === "ready")) {
    note = courier
      ? // B1: the two never meet; the desk line is the only number either side gets (A15).
        "You don't meet the customer: Renit's courier carries it both ways. Call Renit's desk with any question."
      : from
      ? `You can call each other from ${clock(from)}${dayOf(from) === todayIst(now) ? "" : ` on ${dayShort(dayOf(from) ?? "")}`}, before the handover.`
      : "You can call each other shortly before the handover, once an arrival time is picked.";
  }
  return {
    name: customerName(b.customer),
    initial: b.customer.first_name.charAt(0).toUpperCase(),
    line: customerLine(b.customer),
    place: [b.customer.area || null, km ? kmText(km) : null].filter(Boolean).join(" · "),
    // B1: never the customer's address on a courier booking, even from a server that sent one.
    address: !courier && typeof b.customer.address === "string" && b.customer.address ? b.customer.address : null,
    note,
  };
}

export interface MoneyView {
  /** "Rent", or "Rent a month" for monthly billing (ENG-282), with "You earn a month" to match. */
  rentLabel: string;
  earnLabel: string;
  rent: string;
  delivery: string | null;
  fee: { struck: string | null; charged: string };
  earn: string;
  /** "Paid to your bank on the day of handover". */
  payout: string | null;
  /** Under "You earn" (E-110, E-116): what was kept from the deposit for the shop, and a refund that comes off a later payout. */
  notes: string[];
  deposit: { amount: string; sub: string } | null;
}

const DEPOSIT_SUB: Record<string, string> = {
  not_due: "Asked from the customer before the handover",
  due: "Asked from the customer, not paid yet",
  paid: "Held by Renit",
  carried: "Carried over from the first booking",
  settled: "Settled",
  forfeited: "Kept, as the item was not returned",
};

const amountOf = (value: string | undefined) => Math.max(Number(value) || 0, 0);

/**
 * What came out of the deposit for the shop: the damage Renit decided, and the late days once they are fixed at the return
 * (while the item is out the late fee is only today's count). Never more than the deposit.
 */
function keptFromDeposit(b: BookingShop): { damage: number; late: number; notice: number; returned: number } {
  const m = b.money;
  const deposit = amountOf(m.deposit);
  // A forfeited deposit is all kept because the item was not returned.
  if (m.deposit_state === "forfeited") return { damage: 0, late: 0, notice: 0, returned: 0 };
  // In the server's order (D15): the late fee, then an unpaid notice (ENG-282), then the damage, each from what is left.
  const late = b.stage === "out" ? 0 : Math.min(amountOf(m.late_fee), deposit);
  const notice = Math.min(amountOf(m.notice_deduction), deposit - late);
  const damage = Math.min(amountOf(m.damage_deduction), deposit - late - notice);
  return { damage, late, notice, returned: deposit - damage - late - notice };
}

/** The Money card. A deposit of nothing is not drawn. */
export function moneyView(b: BookingShop): MoneyView {
  const m = b.money;
  const shown = Number(m.fee_shown);
  const dep = Number(m.deposit);
  const kept = keptFromDeposit(b);
  const clawback = amountOf(m.clawback);
  const notes = [
    ...(kept.damage > 0 ? [`${money(kept.damage)} kept from the deposit for you, for the damage`] : []),
    ...(kept.late > 0 ? [`${money(kept.late)} kept from the deposit for you, for the late days`] : []),
    // Until the deposit settles the notice can still be paid by its link.
    ...(kept.notice > 0
      ? [
          m.deposit_state === "settled"
            ? `${money(kept.notice)} kept from the deposit for you, for the notice`
            : `${money(kept.notice)} for the notice, from the deposit unless the customer pays it`,
        ]
      : []),
    ...(clawback > 0
      ? [
          amountOf(m.clawback_left) > 0
            ? `${money(clawback)} comes off your payouts for the fault report on this booking`
            : `${money(clawback)} was recovered for the fault report on this booking`,
        ]
      : []),
  ];
  // A settled deposit says what went back and what stayed with the shop, not just "Settled".
  const settledSub =
    m.deposit_state === "settled" && kept.damage + kept.late + kept.notice > 0
      ? [
          ...(kept.returned > 0 ? [`${money(kept.returned)} returned`] : []),
          ...(kept.damage > 0 ? [`${money(kept.damage)} kept for the damage`] : []),
          ...(kept.late > 0 ? [`${money(kept.late)} kept for the late days`] : []),
          ...(kept.notice > 0 ? [`${money(kept.notice)} kept for the notice`] : []),
        ].join(", ")
      : null;
  // Monthly billing (ENG-282): the rent, the fee and what the shop earns are said for one month. The fee is a share of the
  // rent, so a month's is the booking's in the same proportion.
  // A booking that has ended, or come back, is said as a whole, as it settled.
  const running = !b.exit && b.stage !== "returned" && b.stage !== "closed";
  const plan = running && isMonthly(m) && m.plan && Number(m.rent) > 0 ? m.plan : null;
  const perMonth = (value: string) => (plan ? Math.round(((Number(value) * Number(plan.price)) / Number(m.rent)) * 100) / 100 : Number(value));
  const feeShown = perMonth(m.fee_shown);
  const feeCharged = perMonth(m.fee_charged);
  return {
    rentLabel: plan ? "Rent a month" : "Rent",
    earnLabel: plan ? "You earn a month" : "You earn",
    rent: money(plan ? plan.price : m.rent),
    // Per month, the delivery fee (paid with month 1) would not add up to "You earn a month": it is left out.
    // B1: the courier fee is Renit's, never the shop's, whatever the server sends.
    delivery: !plan && !byRenit(b) && Number(m.delivery_fee) > 0 ? money(m.delivery_fee) : null,
    fee: {
      struck: Number.isFinite(shown) && shown > 0 && feeShown !== feeCharged ? money(feeShown) : null,
      charged: money(feeCharged),
    },
    earn: plan ? money(Number(plan.price) - feeCharged) : money(m.you_earn),
    // Each month is paid out on its own, the morning after it is paid, never before it starts (plan §6). A payout that has
    // moved past the plain default (failed, waiting for the bank, held) still says so.
    payout:
      plan && (m.payout?.status ?? "none") === "none"
        ? "Paid to your bank the morning after each month is paid, once it has started."
        : m.payout?.text || null,
    notes,
    deposit:
      m.deposit_state !== "none" && Number.isFinite(dep) && dep > 0
        ? { amount: money(m.deposit), sub: settledSub ?? DEPOSIT_SUB[m.deposit_state] ?? "" }
        : null,
  };
}

/** The customer's open request to move the arrival time, for the shop to answer. */
export function customerRequest(b: Pick<BookingShop, "window_request" | "can" | "customer">): {
  title: string;
  body: string;
  /** The request is over: the card is shown without Accept or Decline. */
  ended: boolean;
} | null {
  const request = b.window_request;
  if (!request || request.by !== "customer") return null;
  const title = `${b.customer.first_name} asked to move the arrival time`;
  if (request.expired) return { title, body: WINDOW_REQUEST_ENDED, ended: true };
  if (!b.can.includes("answer_window_change")) return null;
  return { title, body: `New time: ${windowSummary(request)}. The time stays as it is unless you accept.`, ended: false };
}

/** What the shop itself has asked for and is waiting on. */
export function ownRequest(b: Pick<BookingShop, "window_request">): string | null {
  const request = b.window_request;
  if (request?.by === "owner" && request.expired) return WINDOW_REQUEST_ENDED;
  return request && request.by === "owner" ? `You asked to move it to ${windowSummary(request)}. It stays as it is until they accept.` : null;
}

export interface ShopCancelWarning {
  refund_to_customer: string;
  deposit_back: string;
  marks_last_30_days: number;
  will_pause_listings: boolean;
  /** Ready to show, one line each. */
  text: string[];
}

/** The sheet's words from the server's warning. The server writes the lines; the title and buttons are ours. */
export function cancelWarningCopy(w: ShopCancelWarning): { title: string; lines: string[]; confirm: string } {
  return { title: "Cancel this booking?", lines: w.text, confirm: "Cancel booking" };
}

/** The line under "Cancel booking" before the warning is read. */
export const CANCEL_HINT = "Refunds the customer in full and is marked on your record.";

/** What a refused cancel, time change or answer says. */
export function shopActionErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "stage_not_allowed":
      return "This booking has moved on, so that can't be done now.";
    case "window_outside_hours":
      return "That time is no longer open. Pick another.";
    case "request_open":
      return "A change is already waiting for an answer.";
    case "no_request":
      return "That request is no longer open.";
    case "window_request_expired":
      return WINDOW_REQUEST_ENDED;
    case "own_request":
      return "You asked for this change. The customer answers it.";
    case "claim_open":
      return "A claim is open on this booking, so it can't be cancelled now.";
    case "validation_error":
      return "That wasn't accepted. Try again.";
    default:
      return error.message ?? "Something went wrong on our side. Try again.";
  }
}
