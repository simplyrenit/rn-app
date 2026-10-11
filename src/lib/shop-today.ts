import type { ApiError } from "@/lib/api-error";
import {
  TimeWindow,
  addDays,
  clock,
  dayOf,
  dayShort,
  money,
  rangeLabel,
  todayIst,
  windowLabel,
} from "@/lib/booking";
import { OpenState, dayLabel, istWhen } from "@/lib/shop";
import type { Ring } from "@/lib/shop-ring";

/**
 * The shop's Today and the quick block on the phone (SH-04, SH-05; API-CONTRACT
 * OE-F `GET /api/shop/today/` and the quick block endpoints). Plain functions, so
 * every word and every rule can be tested.
 */

// ---- The feed ------------------------------------------------------------------------

export type BlockReason = "walk_in" | "repair" | "other";

/** `POST /api/shop/blocks/` and friends. */
export interface Block {
  id: number;
  product: { name: string; title: string; shop_code: string };
  quantity: number;
  first_day: string;
  last_day: string;
  reason: BlockReason;
  /** `quick`, or `listing` (the phone's "unavailable dates"). */
  source: string;
  returned_at: string | null;
  /** A walk-in block past its last day that nobody has marked returned: "Is it back?". */
  waiting_back: boolean;
  created_at: string;
}

interface TodayPerson {
  customer_first_name: string;
  customer_last_initial: string;
}

export interface GoingOut extends TodayPerson {
  number: string;
  product_title: string;
  delivery_mode: "pickup" | "owner_delivery";
  stage: string;
  /** Null until the customer has picked an arrival window. */
  window: TimeWindow | null;
  deposit_state: string;
}

export interface ComingBack extends TodayPerson {
  number: string;
  product_title: string;
  stage: string;
  return_by: string | null;
  late_days: number;
  deposit_state: string;
}

/** One thing that needs the shop. `kind` is open-ended: an unknown one is still shown as its `text`. */
export interface NeedsYou {
  kind: string;
  text: string;
  booking?: string;
  late_booking?: string | null;
  late_block?: number | null;
  day?: string;
  block?: Block | null;
  claim?: number;
  reply_due_at?: string;
  count?: number;
}

export interface WaitingToRing {
  ring_at: string;
  count: number;
  bookings: Ring[];
}

export interface TodayFeed {
  date: string;
  open: OpenState;
  ringing: Ring[];
  waiting_to_ring: WaitingToRing[];
  going_out: GoingOut[];
  coming_back: ComingBack[];
  needs_you: NeedsYou[];
}

/** True when there is nothing at all to show under the button: a quiet day. */
export function isQuiet(feed: TodayFeed): boolean {
  return (
    feed.ringing.length === 0 &&
    feed.waiting_to_ring.length === 0 &&
    feed.going_out.length === 0 &&
    feed.coming_back.length === 0 &&
    feed.needs_you.length === 0
  );
}

// ---- The Open switch ------------------------------------------------------------------

export interface OpenLine {
  /** Under the switch: "Open until 8:00 pm". */
  line: string;
  /** Under the header, in a note, when the shop is closed for a reason it can act on. */
  hint: string | null;
}

/**
 * What the Open switch says. The server's `reason` decides; two missed requests
 * in a row is the one the shop must be told about plainly, with the way out: the
 * switch is the button to open again (`POST /api/shop/open/`).
 */
export function openLine(open: OpenState, closedUntil: string | null, now: Date = new Date()): OpenLine {
  if (open.is_open) {
    return { line: open.closes_at ? `Open until ${clock(open.closes_at)}` : "Open", hint: null };
  }
  switch (open.reason) {
    case "missed_requests":
      return {
        line: "Closed after two missed requests",
        hint: "Two requests in a row were not answered, so new bookings no longer ring you. Switch Open on to take them again.",
      };
    case "manual":
      return { line: "Closed by you", hint: null };
    case "closed_until": {
      const day = dayLabel(closedUntil);
      return { line: day ? `Closed until ${day}` : "Closed for a holiday", hint: null };
    }
    case "no_hours":
      return { line: "Set your handover hours to open", hint: null };
    default:
      return {
        line: open.opens_at ? `Closed · opens ${istWhen(open.opens_at, now)}` : "Closed outside your hours",
        hint: null,
      };
  }
}

// ---- Today's lists ----------------------------------------------------------------------

type Tone = "success" | "warning" | "danger" | "neutral";

export interface RowPill {
  label: string;
  tone: Tone;
}

/** The deposit, in one small word. `none`: the item has no deposit, so there is nothing to say. */
export function depositPill(state: string): RowPill | null {
  switch (state) {
    case "paid":
      return { label: "Deposit paid", tone: "success" };
    case "due":
      return { label: "Deposit due", tone: "warning" };
    case "not_due":
      return { label: "Deposit not asked yet", tone: "neutral" };
    case "carried":
      return { label: "Deposit carried", tone: "neutral" };
    case "settled":
      return { label: "Deposit settled", tone: "neutral" };
    case "forfeited":
      return { label: "Deposit kept", tone: "warning" };
    default:
      return null;
  }
}

const who = (p: TodayPerson) => `${p.customer_first_name} ${p.customer_last_initial}.`.replace(" .", "");

export interface TodayRow {
  number: string;
  title: string;
  sub: string;
  pill: RowPill | null;
}

/** "Epson projector · Kabir A." over "Arrives 10:00 – 11:00 am". */
export function goingOutRow(item: GoingOut): TodayRow {
  const verb = item.delivery_mode === "pickup" ? "Arrives" : "Deliver";
  return {
    number: item.number,
    title: `${item.product_title} · ${who(item)}`,
    sub: item.window ? `${verb} ${windowLabel(item.window)}` : "No arrival time picked yet",
    pill: depositPill(item.deposit_state),
  };
}

/** The day an instant falls on, said as a person would after "was due": yesterday, or the date. */
function dayWord(iso: string, now: Date): string {
  const day = dayOf(iso);
  if (!day) return "";
  const today = todayIst(now);
  if (day === today) return "today";
  if (day === addDays(today, -1)) return "yesterday";
  if (day === addDays(today, 1)) return "tomorrow";
  return `on ${dayShort(day)}`;
}

/** "Sony PS5 · Isha T." over "Was due yesterday, 8:00 pm", with "1 day late". */
export function comingBackRow(item: ComingBack, now: Date = new Date()): TodayRow {
  const late = item.late_days > 0;
  const by = item.return_by;
  return {
    number: item.number,
    title: `${item.product_title} · ${who(item)}`,
    sub: !by
      ? "Due today"
      : late
      ? `Was due ${dayWord(by, now)}, ${clock(by)}`
      : `Back by ${clock(by)}`,
    pill: late
      ? { label: item.late_days === 1 ? "1 day late" : `${item.late_days} days late`, tone: "danger" }
      : { label: "Due today", tone: "neutral" },
  };
}

/** "Ringing tomorrow 10 am: 3 bookings": bookings made while the shop was closed. */
export function waitingLine(group: Pick<WaitingToRing, "ring_at" | "count">, now: Date = new Date()): string {
  const n = group.count;
  return `Ringing ${istWhen(group.ring_at, now)}: ${n} ${n === 1 ? "booking" : "bookings"}`;
}

/** A ringing booking, as a card on Today: what it is, and what it earns. */
export function ringingRow(ring: Ring): { title: string; sub: string; earn: string } {
  return {
    title: ring.product.title,
    sub: `${rangeLabel(ring.first_day, ring.last_day)} · ${ring.customer.first_name}`,
    earn: money(ring.you_earn),
  };
}

// ---- Needs you ----------------------------------------------------------------------------

export type NeedsIcon = "warning" | "clock" | "info";

export type NeedsAction =
  /** Opens a booking. */
  | { kind: "booking"; number: string }
  /** "Is it back?": Returned and Extend on a walk-in block. */
  | { kind: "block_back"; block: Block }
  /** My products, where flagged listings and prices to confirm are. */
  | { kind: "products" }
  /** The handover hours screen. */
  | { kind: "hours" };

export interface NeedsRow {
  key: string;
  icon: NeedsIcon;
  text: string;
  action: NeedsAction | null;
}

/**
 * What a "Needs you" item offers. The text is the server's, ready to show. An
 * item with nothing to tap on the phone (a claim, an address to confirm: both
 * are the dashboard's) is shown as its text alone, and a kind this build does
 * not know is shown the same way.
 */
export function needsRow(item: NeedsYou, index: number): NeedsRow {
  const key = `${item.kind}-${item.booking ?? item.block?.id ?? item.claim ?? index}`;
  switch (item.kind) {
    case "late_no_unit":
      return { key, icon: "warning", text: item.text, action: item.booking ? { kind: "booking", number: item.booking } : null };
    case "window_request":
      return { key, icon: "clock", text: item.text, action: item.booking ? { kind: "booking", number: item.booking } : null };
    case "block_back":
      return { key, icon: "clock", text: item.text, action: item.block ? { kind: "block_back", block: item.block } : null };
    case "flagged_products":
    case "rates_to_confirm":
      return { key, icon: "warning", text: item.text, action: { kind: "products" } };
    case "no_hours":
      return { key, icon: "warning", text: item.text, action: { kind: "hours" } };
    default:
      return { key, icon: "info", text: item.text, action: null };
  }
}

// ---- The quick block (SH-05) ------------------------------------------------------------------

export const BLOCK_REASONS: readonly { key: BlockReason; label: string }[] = [
  { key: "walk_in", label: "Walk-in rental" },
  { key: "repair", label: "Repair" },
  { key: "other", label: "Other" },
];

export interface BlockProduct {
  name: string;
  title: string;
  /** Units the shop has of it. */
  quantity: number;
}

export interface QuickBlockForm {
  product: BlockProduct | null;
  quantity: number;
  /** The last day of the block, `YYYY-MM-DD`. It always starts today. */
  lastDay: string;
  reason: BlockReason;
}

/** "Rented at the counter": one unit, today, a walk-in. The shop picks the item. */
export function startForm(now: Date = new Date()): QuickBlockForm {
  return { product: null, quantity: 1, lastDay: todayIst(now), reason: "walk_in" };
}

/** "1 of 2 is free to block". Null while the number is not known. */
export function freeText(free: number | null | undefined, quantity: number | null | undefined): string | null {
  if (free === null || free === undefined || quantity === null || quantity === undefined) return null;
  return `${free} of ${quantity} ${free === 1 ? "is" : "are"} free to block`;
}

/** The quantity kept inside what is free (and at least 1, which the server asks for). */
export function clampQuantity(quantity: number, free: number | null | undefined): number {
  const most = free === null || free === undefined ? Number.POSITIVE_INFINITY : Math.max(free, 1);
  return Math.min(Math.max(1, Math.floor(quantity)), most);
}

/** The line under "Until": what happens at the end of the block. */
export function reasonNote(reason: BlockReason): string {
  return reason === "walk_in"
    ? "On its last day we'll ask if it's back, and hold the unit until you answer."
    : "It ends by itself after its last day.";
}

export const blockLabel = (quantity: number) => (quantity === 1 ? "Block 1 unit" : `Block ${quantity} units`);

/** "Thu 15 Oct". */
export const untilLabel = (day: string) => dayShort(day);

/** Why the button is off, or null. `free` is the server's count for these days. */
export function blockHold(form: QuickBlockForm, free: number | null | undefined, now: Date = new Date()): string | null {
  if (!form.product) return "Pick the item first.";
  if (form.lastDay < todayIst(now)) return "Pick today or a later day.";
  if (free === 0) return "No unit is free on these days.";
  return null;
}

export type BlockCall =
  | { path: "counter"; body: { product: string; last_day: string } }
  | {
      path: "block";
      body: { product: string; quantity: number; first_day: string; last_day: string; reason: BlockReason };
    };

/**
 * Which call to make. "Rented at the counter" is the server's one-tap call: one
 * unit, from today, a walk-in. Anything else (more units, a repair, another
 * reason) is the general block. Both start today: the phone has no "from".
 */
export function blockCall(form: QuickBlockForm, now: Date = new Date()): BlockCall | null {
  if (!form.product) return null;
  if (form.reason === "walk_in" && form.quantity === 1) {
    return { path: "counter", body: { product: form.product.name, last_day: form.lastDay } };
  }
  return {
    path: "block",
    body: {
      product: form.product.name,
      quantity: form.quantity,
      first_day: todayIst(now),
      last_day: form.lastDay,
      reason: form.reason,
    },
  };
}

/** The earliest day "Extend" offers: the day after the block's last day, and never in the past. */
export function extendFrom(block: Pick<Block, "last_day">, now: Date = new Date()): string {
  const today = todayIst(now);
  return addDays(block.last_day > today ? block.last_day : today, 1);
}

/** What a refused block or block change says. `only_n_free` carries how many are free. */
export function blockErrorText(error: ApiError | null): string {
  if (!error || error.status === 0) return "We couldn't reach Renit. Check your connection and try again.";
  switch (error.code) {
    case "only_n_free": {
      const free = error.details?.free;
      return typeof free === "number"
        ? free === 0
          ? "No unit is free on those days."
          : `Only ${free} ${free === 1 ? "is" : "are"} free on those days.`
        : "Fewer units are free than that.";
    }
    case "validation_error":
      return "Check the day and the number of units, then try again.";
    case "not_found":
      return "That block is no longer there.";
    case "not_owner":
    case "not_shop_owner":
    case "forbidden":
      return "This account can't change the calendar.";
    default:
      return "Something went wrong on our side. Try again.";
  }
}
