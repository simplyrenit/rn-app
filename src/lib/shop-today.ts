import { type ApiError, fieldErrors } from "@/lib/api-error";
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
import { byRenit, type DeliveredBy } from "@/lib/delivery";
import { packByText } from "@/lib/shop-courier";

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
  /** B1: `renit` when Renit's courier carries it; absent is the shop. */
  delivered_by?: DeliveredBy | null;
  /** B1, a courier booking: when the shop must have packed. Absent from a server that does not send it yet. */
  pack_by?: string | null;
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
  /** B1: a courier's return leg ("" for the shop's own). Absent from a server before ENG-333. */
  return_state?: string;
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

/**
 * "Now" for the words on Today ("today", "yesterday", "tomorrow"): midday in India on
 * the server's own date for the feed (`date`), so a phone with a wrong clock still says
 * the right day (API-CONTRACT P3-17). Only the day is used from it.
 */
export function feedNow(feed: Pick<TodayFeed, "date"> | null | undefined, phoneNow: Date = new Date()): Date {
  const anchor = new Date(`${feed?.date ?? ""}T12:00:00+05:30`);
  return Number.isNaN(anchor.getTime()) ? phoneNow : anchor;
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

/** "Epson projector · Kabir A." over "Arrives 10:00 – 11:00 am"; B1's courier "Pack by 3:15 pm". */
export function goingOutRow(item: GoingOut, now: Date = new Date()): TodayRow {
  const courier = byRenit(item);
  const verb = courier ? "Courier collects" : item.delivery_mode === "pickup" ? "Arrives" : "Deliver";
  return {
    number: item.number,
    title: `${item.product_title} · ${who(item)}`,
    sub:
      courier && item.pack_by
        ? packByText(item.pack_by, now)
        : item.window
          ? `${verb} ${windowLabel(item.window)}`
          : "No arrival time picked yet",
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
  const title = `${item.product_title} · ${who(item)}`;
  // B1: Renit's rider has it, or brought it: not "due" any more, whatever the last day (ENG-333).
  if (item.return_state === "at_shop") {
    // Not "Record it": the feed has no record flag, and the row stays until the desk finishes the return.
    return { number: item.number, title, sub: "Back at your shop", pill: { label: "Back", tone: "success" } };
  }
  if (item.return_state === "picked_up") {
    return { number: item.number, title, sub: "With the rider, on its way to you", pill: { label: "On its way", tone: "neutral" } };
  }
  const late = item.late_days > 0;
  const by = item.return_by;
  return {
    number: item.number,
    title,
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

export type NeedsIcon = "warning" | "clock" | "info" | "camera";

export type NeedsAction =
  /** Opens a booking. */
  | { kind: "booking"; number: string }
  /** Opens a claim against the shop (a fault report), where it replies once. */
  | { kind: "claim"; id: number }
  /** "Is it back?": Returned and Extend on a walk-in block. */
  | { kind: "block_back"; block: Block }
  /** My products, where flagged listings and prices to confirm are. */
  | { kind: "products" }
  /** The handover hours screen. */
  | { kind: "hours" }
  /** The Shop address screen. */
  | { kind: "address" }
  /** "42 drafts need photos": the photo walk-through (ENG-192). */
  | { kind: "photos" };

export interface NeedsRow {
  key: string;
  icon: NeedsIcon;
  text: string;
  action: NeedsAction | null;
}

/**
 * What a "Needs you" item offers. The text is the server's, ready to show. An
 * item with nothing to tap on the phone is shown as its text alone, and a kind
 * this build does not know is shown the same way.
 */
export function needsRow(item: NeedsYou, index: number): NeedsRow {
  const key = `${item.kind}-${item.booking ?? item.block?.id ?? item.claim ?? index}`;
  switch (item.kind) {
    case "late_no_unit":
      return { key, icon: "warning", text: item.text, action: item.booking ? { kind: "booking", number: item.booking } : null };
    case "window_request":
      return { key, icon: "clock", text: item.text, action: item.booking ? { kind: "booking", number: item.booking } : null };
    case "claim_deadline":
      return { key, icon: "info", text: item.text, action: item.claim ? { kind: "claim", id: item.claim } : null };
    case "block_back":
      return { key, icon: "clock", text: item.text, action: item.block ? { kind: "block_back", block: item.block } : null };
    case "flagged_products":
    case "rates_to_confirm":
      return { key, icon: "warning", text: item.text, action: { kind: "products" } };
    case "no_hours":
      return { key, icon: "warning", text: item.text, action: { kind: "hours" } };
    case "address_unconfirmed":
      return { key, icon: "warning", text: item.text, action: { kind: "address" } };
    case "drafts_need_photos":
      return { key, icon: "camera", text: item.text, action: { kind: "photos" } };
    default:
      return { key, icon: "info", text: item.text, action: null };
  }
}

// ---- The quick block (SH-05) ------------------------------------------------------------------

/** What the item picker needs of a product. */
export interface PickerProduct {
  name: string;
  title: string;
  shop_code: string;
  quantity: number;
  status: string;
}

/** The statuses a unit can be blocked on: a live listing, or one the shop has paused. */
const BLOCKABLE = ["live", "paused"];

/**
 * One of the owner's own listings (`GET /api/my/products/`) as the picker's row, or null
 * when it cannot be blocked (a draft, one in the check, flagged, archived). A server that
 * sends no `status` or `quantity` is read as live, and as one unit.
 */
export function pickerProductFrom(raw: unknown): PickerProduct | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.name !== "string" || typeof p.title !== "string") return null;
  const status = typeof p.status === "string" ? p.status : "live";
  if (!BLOCKABLE.includes(status)) return null;
  return {
    name: p.name,
    title: p.title,
    shop_code: typeof p.shop_code === "string" ? p.shop_code : "",
    quantity: typeof p.quantity === "number" && p.quantity > 0 ? p.quantity : 1,
    status,
  };
}

/** The picker's search: the title or the owner's code, any case, anywhere in the text; by title. */
export function filterPicker(products: readonly PickerProduct[], q: string): PickerProduct[] {
  const needle = q.trim().toLowerCase();
  return products
    .filter((p) => !needle || p.title.toLowerCase().includes(needle) || p.shop_code.toLowerCase().includes(needle))
    .sort((a, b) => a.title.localeCompare(b.title));
}

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

/**
 * What is said after "Returned" (lane F: the block ends today if it ran longer). A block that has not ended yet
 * (its last day is today or later, as when it began today) keeps today's unit taken, so the unit is free again from
 * tomorrow, not from today; one already past its last day has nothing left to hold. `block` is the server's answer
 * (its `last_day` as it is now) and `today` is the server's day.
 */
export function returnedNotice(block: Pick<Block, "product" | "last_day">, today: string): { title: string; message: string } {
  return {
    title: `${block.product.title} is back`,
    message: block.last_day >= today ? "Today's unit stays blocked. It can be booked again from tomorrow." : "It can be booked again.",
  };
}

/** The open blocks the shop made itself (a quick block), soonest first: the ones it can take off. A listing's own dates are edited in the listing. */
export function removableBlocks(blocks: readonly Block[] | null | undefined): Block[] {
  return (blocks ?? []).filter((b) => b.source === "quick").sort((a, b) => a.first_day.localeCompare(b.first_day) || a.id - b.id);
}

const REASON_LABEL: Record<string, string> = { walk_in: "Rented at the counter", repair: "Repair", other: "Other" };

/** "2 units · Rented at the counter · from today until Thu 15 Oct". */
export function blockRowLine(block: Block, today: string): string {
  const units = block.quantity === 1 ? "1 unit" : `${block.quantity} units`;
  const from = block.first_day <= today ? "from today" : `from ${dayShort(block.first_day)}`;
  const reason = REASON_LABEL[block.reason] ?? "Blocked";
  const span = block.waiting_back ? `ended ${dayShort(block.last_day)}, waiting for you` : `${from} until ${dayShort(block.last_day)}`;
  return [units, reason, span].join(" · ");
}

/**
 * What the confirm sheet says before a block is taken off. A block that has begun can be removed too (a block made by
 * mistake): it is taken off as if it had never been made, so every day it held, today's included, is open again.
 */
export function removeBlockCopy(block: Block, today: string): { title: string; body: string; confirm: string } {
  const began = block.first_day <= today;
  return {
    title: "Take this block off?",
    body: `${block.product.title}: ${blockRowLine(block, today)}. ${
      began
        ? "It has begun. Taking it off is for a block made by mistake: it goes as if it had never been made, and every day it held, today included, can be booked again straight away."
        : "It goes as if it had never been made, and its days can be booked again."
    }`,
    confirm: "Take it off",
  };
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
      // The server's own sentence for the field: "This product is paused, so nobody can book it. Resume it to block
      // days.", "A block can reach at most 365 days ahead.", the day before the first. The fixed line is for a
      // refusal that names no field.
      return Object.values(fieldErrors(error))[0] ?? "Check the day and the number of units, then try again.";
    case "block_ended":
      // 409 on extending a block already marked Returned (on another phone): the server's own sentence.
      return error.message ?? "This block has ended. Make a new one.";
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
