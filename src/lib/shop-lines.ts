import type { ApiError } from "@/lib/api-error";
import { money, rangeLabel } from "@/lib/booking";
import type { Capture, CaptureDraft, ShotList } from "@/lib/capture";
import { pluralize } from "@/lib/pluralize";

/**
 * The items of a shop's booking (cart plan v2 §4, D18, D31, D46, D51): the ring's ticks, the booking's line table,
 * the cancel sheet's "Which item can't you give?", and each item's record at the handover and the return.
 *
 * Plain functions over the server's objects, so every word and every sum can be tested. A booking of one item never
 * reaches them: its screens are as they were before lines.
 */

/** `refused`: unticked at Accept, one unit of it blocked for the dates. `no_unit`: it lost its unit to another booking. */
export type LineState = "live" | "refused" | "no_unit";

/**
 * One item of a booking as its shop sees it (rn-api `_line`). The Ring and BookingShop carry `owner_earns` and `units`;
 * Today rows and payouts leave `units` out (ENG-332).
 */
export interface ShopLine {
  id: number;
  n: number;
  /** "RN-21345·2" (D38). */
  ref: string;
  product: { name: string | null; title: string; cover_image: string | null };
  rent: string;
  deposit: string;
  /** The line's rent less Renit's fee: what the shop earns from it. The delivery fee is the booking's. */
  owner_earns?: string;
  /** Units in use on the fullest of the days, this booking left out. */
  units?: { in_use: number; quantity: number };
  state: LineState | string;
}

export interface WithLines {
  /** Absent from a server before lines. */
  lines?: ShopLine[] | null;
}

/** A booking of several items: more than one line in any state (D18). Its Accept takes ticks and its record names each item. */
export const isBasket = (b: WithLines | null | undefined): boolean => (b?.lines?.length ?? 0) > 1;

export const liveLines = (b: WithLines | null | undefined): ShopLine[] => (b?.lines ?? []).filter((l) => l.state === "live");

/** "3 items" on Today, the lists and the ring card: the live items (FIXES B5 row 11). Null with fewer than two. */
export function itemsChip(b: WithLines | null | undefined): string | null {
  const n = liveLines(b).length;
  return isBasket(b) && n > 1 ? pluralize(n, "item") : null;
}

const paise = (value: string | number | null | undefined) => Math.round(Number(value ?? 0) * 100) || 0;
const rupees = (p: number) => money(p / 100);
const earnsOf = (line: ShopLine) => paise(line.owner_earns ?? line.rent);

/** "the camera and the lens": item names in a sentence. */
export function namesText(lines: readonly Pick<ShopLine, "product">[]): string {
  const names = lines.map((l) => l.product.title || "an item");
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "";
}

// ---- The ring (MR-01 to MR-03b) ------------------------------------------------------------------

/** "1 of 2 free" (Figma ruling G7): the units the other bookings leave on the fullest of these days. */
export function unitsFree(units: { in_use: number; quantity: number } | null | undefined): string | null {
  if (!units || units.quantity < 1) return null;
  return `${Math.max(0, units.quantity - units.in_use)} of ${units.quantity} free`;
}

/**
 * The items Accept would take: the live ones the owner left ticked. A line the server took while it rang (`no_unit`, the
 * sweep) or that lost an Accept race (`lost`) can't be ticked.
 */
export function tickedIds(lines: readonly ShopLine[], unticked: ReadonlySet<number>, lost: ReadonlySet<number>): number[] {
  return lines.filter((l) => l.state === "live" && !unticked.has(l.id) && !lost.has(l.id)).map((l) => l.id);
}

/** "Accept all 3", "Accept 2 of 3": counted against every item asked for. */
export function acceptLabel(ticked: number, asked: number): string {
  if (asked < 2) return "Accept";
  return ticked >= asked ? `Accept all ${asked}` : `Accept ${ticked} of ${asked}`;
}

export interface RingMoney {
  /** "Rent (2 items)". */
  rentLabel: string;
  rent: string;
  /** The delivery fee the shop earns; null when there is none. */
  delivery: string | null;
  earn: string;
}

/**
 * "You earn" as the ticks stand (G6): the ticked items' earns, as the server sends them, plus the delivery fee, which is
 * the booking's. The ring carries no delivery fee of its own: it is what the server's `you_earn` has beyond its live items.
 */
export function ringMoney(ring: WithLines & { you_earn: string }, ticked: readonly number[]): RingMoney {
  const live = liveLines(ring);
  const delivery = Math.max(0, paise(ring.you_earn) - live.reduce((sum, l) => sum + earnsOf(l), 0));
  const picked = live.filter((l) => ticked.includes(l.id));
  const rent = picked.reduce((sum, l) => sum + earnsOf(l), 0);
  return {
    rentLabel: `Rent (${pluralize(picked.length, "item")})`,
    rent: rupees(rent),
    delivery: delivery > 0 ? rupees(delivery) : null,
    earn: rupees(rent + delivery),
  };
}

/**
 * The Accept body (D18, D24). A booking of several items names the ticked ones; an extension of one takes every item,
 * with no ticks (409 `all_items` otherwise); one item, as before, sends nothing.
 */
export function acceptBody(ring: WithLines & { extends?: string | null }, ticked: readonly number[]): { lines?: number[] } {
  return isBasket(ring) && !ring.extends ? { lines: [...ticked] } : {};
}

/** The words above Accept: what the customer is told either way. */
export function acceptNote(firstName: string, ticked: number, live: number): string {
  return ticked < live
    ? `${firstName} sees what you can give and pays for ${pluralize(ticked, "item")}, or cancels.`
    : `Can't do any refunds ${firstName} in full. Nothing is marked on your shop.`;
}

/**
 * An Accept race (D9): a ticked item lost its unit to another booking. 409 `no_unit_free` names those lines in
 * `details.lines` and the booking keeps ringing. Null for anything else, and for a `no_unit_free` without lines (nothing
 * would be left, so the request ended).
 */
export function raceLost(error: ApiError | null | undefined): number[] | null {
  const ids = error?.code === "no_unit_free" ? error.details?.lines : null;
  if (!Array.isArray(ids)) return null;
  const lost = ids.filter((id): id is number => typeof id === "number");
  return lost.length > 0 ? lost : null;
}

/** MR-03's notice: which items were just booked, and what is left to do. */
export function raceCopy(lost: readonly ShopLine[], left: number): { title: string; body: string } {
  const one = lost.length === 1;
  return {
    title: `${namesText(lost)} ${one ? "was" : "were"} just booked`,
    body: `Another booking took the last ${one ? "one" : "ones"} on these dates, so we unticked ${one ? "it" : "them"}. ${
      left > 0 ? `Accept the other ${left}, or say you can't do any.` : "Say you can't do any."
    }`,
  };
}

/** The untick sheet's reasons (MR-02). Each means `not_available` to the server and stays on this phone (as rn-web). */
export const UNTICK_REASONS = ["Rented outside Renit", "In repair or service", "Other"] as const;
export type UntickReason = (typeof UNTICK_REASONS)[number];

/** MR-02: "We'll block Manfrotto tripod for these dates" and what that means. */
export function untickCopy(line: Pick<ShopLine, "product">, range: string): { title: string; body: string } {
  return {
    title: `We'll block ${line.product.title} for these dates`,
    body: `One stays blocked ${range}, so no one books it on Renit then. Unticking is free: nothing is marked on your shop.`,
  };
}

/** A ring line's meta under its title: "Rented outside Renit · blocked Sat 24 – Mon 26" for one unticked here. */
export function untickedMeta(reason: string | null | undefined, range: string): string {
  return reason ? `${reason} · blocked ${range}` : `Blocked ${range}`;
}

/**
 * An answered basket, as the booking now holds it (MR-03b): "Accepted 2 of 3. Manfrotto tripod unticked · blocked
 * Sat 24 – Mon 26." Null for one item, and while nothing was left out.
 */
export function answeredLines(b: WithLines & { first_day: string; last_day: string }): string | null {
  if (!isBasket(b)) return null;
  const lines = b.lines ?? [];
  const live = liveLines(b).length;
  const off = lines.filter((l) => l.state === "refused");
  const gone = lines.filter((l) => l.state === "no_unit");
  if (off.length === 0 && gone.length === 0) return null;
  return [
    `Accepted ${live} of ${lines.length}.`,
    off.length > 0 ? `${namesText(off)} unticked · blocked ${rangeLabel(b.first_day, b.last_day)}.` : null,
    gone.length > 0 ? `${namesText(gone)} no longer free.` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The ring's header line: "New booking · 3 items". */
export const ringEyebrow = (b: WithLines) => (isBasket(b) ? `New booking · ${pluralize(b.lines?.length ?? 0, "item")}` : "New booking");

// ---- The booking's line table (MR-07) and the cancel sheet (MR-08) -----------------------------

export type ChipTone = "success" | "neutral" | "danger";

export interface LineRow {
  id: number;
  title: string;
  ref: string;
  /** What the shop earns from it. */
  earn: string;
  /** "Deposit share ₹20,000". */
  deposit: string;
  /** Not in the booking any more: its money is struck through (G12, no dimming). */
  off: boolean;
  chip: { label: string; tone: ChipTone } | null;
  meta: string | null;
}

/** One chip vocabulary for every owner screen (FIXES-r1 §3). */
export function lineChip(state: string, accepted: boolean): LineRow["chip"] {
  if (state === "refused") return { label: "Not available · dates blocked", tone: "neutral" };
  if (state === "no_unit") return { label: "No longer free", tone: "danger" };
  return accepted ? { label: "Accepted", tone: "success" } : null;
}

export function lineRows(b: WithLines & { stage: string; first_day: string; last_day: string }): LineRow[] {
  const accepted = b.stage !== "ringing";
  return (b.lines ?? []).map((l) => ({
    id: l.id,
    title: l.product.title,
    ref: l.ref,
    earn: rupees(earnsOf(l)),
    deposit: `Deposit share ${money(l.deposit)}`,
    off: l.state !== "live",
    chip: lineChip(l.state, accepted),
    meta: l.state === "refused" ? `Blocked ${rangeLabel(b.first_day, b.last_day)}` : null,
  }));
}

/** "Aarav M. · 2 items": who, and how many items are still in the booking. */
export const itemsLine = (name: string, b: WithLines) => `${name} · ${pluralize(liveLines(b).length, "item")}`;

/** The cancel sheet's choice (D46): a live line, or "It's not one item" (`null`). */
export function cancelBody(line: number | null): { confirm: true; line?: number } {
  return line === null ? { confirm: true } : { confirm: true, line };
}

/** What the whole cancel leaves the customer, once an item is named. */
export function cancelAfter(firstName: string, b: WithLines, line: number | null): string | null {
  const named = liveLines(b).find((l) => l.id === line);
  if (!named) return null;
  const rest = liveLines(b).filter((l) => l.id !== line);
  return rest.length > 0 ? `${firstName} can book ${namesText(rest)} again without ${named.product.title}.` : null;
}

// ---- Each item's record at the handover and the return (MR-06b, MR-09, MR-10) -----------------

export type ShotState = "done" | "uploading" | "failed" | "missing";
export type RecordWord = "not_started" | "in_progress" | "recorded";

export interface ItemShot {
  key: string;
  /** Without the item's name: "Rear glass". */
  label: string;
  state: ShotState;
}

export interface ItemPart {
  /** The checklist item as the server names it ("Tripod: Bag"). */
  item: string;
  label: string;
  ticked: boolean;
}

export interface BasketItem {
  id: number;
  title: string;
  ref: string;
  shots: ItemShot[];
  /** Shots on the server or up on the bucket. */
  done: number;
  parts: ItemPart[];
  /** The shop's return: ticked Received, here or on another phone. */
  received: boolean;
  word: RecordWord;
}

const bare = (label: string, title: string) => (label.startsWith(`${title}: `) ? label.slice(title.length + 2) : label);

/**
 * Each live item's part of a basket's record, from the server's merged list (T11), the record on this phone and the
 * server's copy of it (both phones' shots). A shot is done once the server has it or it is up on the bucket; it is
 * uploading while it is only on this phone, and failed when its upload is waiting to be tried again.
 */
export function basketItems(
  list: ShotList | null | undefined,
  draft: CaptureDraft | null | undefined,
  capture: Capture | null | undefined
): BasketItem[] {
  const onServer = new Set((capture?.shots ?? []).map((s) => s.key));
  const failing = Boolean(draft?.error?.retry);
  return (list?.lines ?? []).map((line) => {
    const shots: ItemShot[] = list!.shots
      .filter((s) => s.key.startsWith(line.prefix))
      .map((s) => {
        const file = draft?.shots[s.key];
        const state: ShotState =
          onServer.has(s.key) || file?.url ? "done" : file ? (failing ? "failed" : "uploading") : "missing";
        return { key: s.key, label: bare(s.label, line.title), state };
      });
    // A part this phone ticked or unticked is as it says; any other, as the server has it from either phone.
    const tickOf = (item: string) => {
      const own = draft?.checklist.find((c) => c.item === item);
      const theirs = capture?.checklist.find((c) => c.item === item);
      return Boolean(draft?.touched?.includes(item) || !theirs ? own?.ticked : theirs.ticked);
    };
    const parts = line.included_items.map((item) => ({ item, label: bare(item, line.title), ticked: tickOf(item) }));
    const done = shots.filter((s) => s.state === "done").length;
    const taken = shots.filter((s) => s.state !== "missing").length;
    const ticked = draft?.received ?? [];
    const mine = ticked.includes(line.id) || (draft?.unticked ?? []).includes(line.id);
    return {
      id: line.id,
      title: line.title,
      ref: line.ref,
      shots,
      done,
      parts,
      received: mine ? ticked.includes(line.id) : Boolean(capture?.received?.includes(line.id)),
      word: taken === 0 ? "not_started" : done === shots.length ? "recorded" : "in_progress",
    };
  });
}

/** "Shots in", "1 not sent", "2 to take": an item's state in a word, for the tag beside its name. */
export function itemTag(item: BasketItem): { label: string; tone: "success" | "info" | "danger" | "neutral" } {
  const failed = item.shots.filter((s) => s.state === "failed").length;
  if (failed > 0) return { label: `${failed} not sent`, tone: "danger" };
  if (item.word === "recorded") return { label: "Shots in", tone: "success" };
  if (item.word === "not_started") return { label: "Not started", tone: "neutral" };
  return { label: "In progress", tone: "info" };
}

export interface LeftRow {
  key: string;
  text: string;
  /** `retry`: send again; `take`: open the camera on that shot (`shot`); `tick`: the tick is on this screen. */
  action: "retry" | "take" | "tick" | null;
  shot?: string;
}

/**
 * "Before the code · 4 things left" (MR-09a): every shot the code still waits for, each with its own way on, then the
 * ID tick; at the return, each item not yet ticked Received. The video is not one: the code opens while it uploads (D19).
 */
export function thingsLeft(
  items: readonly BasketItem[],
  opts: { idTick: boolean; firstName: string; received?: boolean }
): LeftRow[] {
  const rows: LeftRow[] = [];
  for (const item of items) {
    if (opts.received && !item.received) {
      rows.push({ key: `${item.id}-received`, text: `${item.title} · not ticked Received`, action: "tick" });
    }
    for (const shot of item.shots) {
      if (shot.state === "done") continue;
      const text = `${item.title} · ${shot.label} · ${
        shot.state === "uploading" ? "uploading" : shot.state === "failed" ? "not sent" : "not taken"
      }`;
      rows.push({
        key: shot.key,
        text,
        action: shot.state === "failed" ? "retry" : shot.state === "missing" ? "take" : null,
        shot: shot.key,
      });
    }
  }
  if (opts.idTick) rows.push({ key: "id", text: `Check ${opts.firstName}'s ID`, action: "tick" });
  return rows;
}

export type VideoWord = "not_started" | "uploading" | "failed" | "in";

/** The one video of the items together: on the server, going up, waiting to be tried again, or not taken. */
export function videoWord(draft: CaptureDraft | null | undefined, capture: Capture | null | undefined): VideoWord {
  if (capture?.video || draft?.video?.url) return "in";
  if (draft?.video) return draft.error?.retry ? "failed" : "uploading";
  return "not_started";
}

/** "Deliver 3 items to Aarav", "Hand 3 items to Aarav", "Take 3 items back". */
export function basketTitle(moment: "handover" | "return", b: WithLines & { delivery_mode: string }, firstName: string): string {
  const items = pluralize(liveLines(b).length, "item");
  if (moment === "return") return `Take ${items} back`;
  return b.delivery_mode === "pickup" ? `Hand ${items} to ${firstName}` : `Deliver ${items} to ${firstName}`;
}
