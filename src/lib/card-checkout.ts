/**
 * A cart card's checkout (cart plan §3.3, D40, D8; screens CT-20 to CT-24, CT-40, CT-43, CT-44): one shop's items, one
 * booking. The dates and review screens draw from these plain functions, so the words, which item is in the way and the
 * days the calendar offers can be tested. As in `booking.ts`, the server works every amount out; nothing here adds
 * money up.
 */
import {
  CartOthers,
  DayRun,
  PriceLine,
  Quote,
  QuoteLine,
  addDays,
  bookedDays,
  dayCount,
  dayShort,
  daysLabel,
  inFlightMax,
  money,
  priceLines,
} from "@/lib/booking";
import { ApiError } from "@/lib/api-error";
import { Plan, minDays, plansOf } from "@/lib/plans";
import { pluralize } from "@/lib/pluralize";

/**
 * D7: the most items one checkout takes in the pilot; the server refuses more. Lines past it start left in the cart.
 * ponytail: a client copy of the server's CHECKOUT_MAX_LINES; when the pilot moves to 10, have the cart answer send it.
 */
export const CHECKOUT_CAP = 6;

/** The lines left in the cart when the dates step opens: those past the cap. */
export const startLeftOut = (names: string[], cap = CHECKOUT_CAP): string[] => names.slice(cap);

/**
 * D40: the card's calendar. `none`: no included item is free that day, so it is greyed and can't be crossed. `some`:
 * some items are taken, the rest free (the "Some items free" dot). One item: its own booked days, nothing partial.
 */
export function cardDays(runs: (DayRun[] | null | undefined)[]): { none: Set<string>; some: Set<string> } {
  const sets = runs.map(bookedDays);
  const count = new Map<string, number>();
  for (const set of sets) set.forEach((day) => count.set(day, (count.get(day) ?? 0) + 1));
  const none = new Set<string>();
  const some = new Set<string>();
  count.forEach((n, day) => (n === sets.length ? none : some).add(day));
  return { none, some };
}

/** D40: the included item with the smallest minimum, which is the card's; none when nothing is included. */
export function shortestOf<T extends { plans?: Plan[] | null; rate?: string | number | null }>(products: T[]): T | undefined {
  return products.reduce<T | undefined>(
    (best, p) => (!best || minDays(plansOf(p)) < minDays(plansOf(best)) ? p : best),
    undefined
  );
}

/** Line reasons that keep Continue and Book off while the item is included. Leaving it in the cart, or other dates, fixes them. */
const LINE_BLOCKS = ["no_unit_free", "too_short", "already_requested", "not_listed"];

/** Line reasons no dates can fix: the item stays in the cart for this checkout until added back, and the next quote decides again (CT-21d, e). */
const LINE_ALONE = ["other_pickup_point", "monthly_book_alone"];

export const lineBlock = (line: QuoteLine | undefined): string | null =>
  line?.blockers.find((code) => LINE_BLOCKS.includes(code)) ?? null;

export const lineAlone = (line: QuoteLine | undefined): string | null =>
  line?.blockers.find((code) => LINE_ALONE.includes(code)) ?? null;

export type ChipTone = "warning" | "info" | "neutral";

export interface LineChip {
  text: string;
  tone: ChipTone;
}

/** What the chip under an item says. `review`: on the price screen an item that is no longer free was just booked (CT-23b). */
export function lineChip(
  code: string,
  ctx: { minDays?: number; number?: string | null; locality?: string | null; review?: boolean } = {}
): LineChip | null {
  switch (code) {
    case "no_unit_free":
      return { text: ctx.review ? "Just booked by someone else" : "Not free on these dates", tone: "warning" };
    case "too_short":
      return { text: ctx.minDays ? `Minimum ${daysLabel(ctx.minDays)}` : "Under its minimum", tone: "warning" };
    case "already_requested":
      return { text: ctx.number ? `You've requested this · ${ctx.number}` : "You've requested this", tone: "warning" };
    case "not_listed":
      return { text: "No longer available", tone: "neutral" };
    case "delivery_not_offered":
      return { text: "Not delivered · Leave in cart to get delivery", tone: "info" };
    case "other_pickup_point":
      return {
        text: ctx.locality ? `Collected from ${ctx.locality} · checked out separately` : "Another pickup point · checked out separately",
        tone: "neutral",
      };
    case "monthly_book_alone":
      return { text: "Billed monthly · book it on its own", tone: "neutral" };
    case "left":
      return { text: "Left in cart", tone: "neutral" };
    case "month_full":
      return { text: "Not free on any day this month", tone: "warning" };
    default:
      return null;
  }
}

export interface BlockedItem {
  title: string;
  code: string;
  minDays?: number;
  number?: string | null;
}

/** The sentence above the bar for the included items in the way (G11, FIXES B2 row 8): the one item named, or a count. */
export function blockedNote(items: BlockedItem[], review = false): string | null {
  if (items.length === 0) return null;
  if (items.length > 1) {
    return review
      ? `${items.length} items can't be booked on these dates. Leave them in your cart to book the rest.`
      : `${items.length} items can't go on these dates. Leave them in your cart or pick other dates.`;
  }
  const { title, code, minDays: min, number } = items[0];
  switch (code) {
    case "no_unit_free":
      return review
        ? `The last ${title} was just booked for these dates.`
        : `The ${title} is booked on these dates. Leave it in your cart or pick other dates.`;
    case "too_short":
      return min
        ? `The ${title} needs at least ${daysLabel(min)}. Leave it in your cart or pick ${daysLabel(min)}.`
        : `These dates are under the ${title}'s minimum. Leave it in your cart or pick more days.`;
    case "already_requested":
      return `You already asked for this ${title} on these dates${number ? ` (${number})` : ""}. Leave it in your cart to go on.`;
    default:
      return `The ${title} is no longer available. Leave it in your cart to go on.`;
  }
}

/** Book now's refusal of one of a card's items, named (CT-23b), while the fresh quote comes; null when it names none. */
export function lineRefusalNote(failure: ApiError | null, titleOf: (name: string) => string): string | null {
  const code = failure?.code;
  const details = failure?.details;
  if (!code || !LINE_BLOCKS.includes(code) || typeof details?.product !== "string") return null;
  const min = Number(details.min_days);
  const number = typeof details.number === "string" ? details.number : null;
  return blockedNote([{ title: titleOf(details.product), code, minDays: min > 0 ? min : undefined, number }], true);
}

/** The note for items checked out on their own (CT-21d, e). */
export function aloneNote(items: { title: string; code: string; locality?: string | null }[]): string | null {
  if (items.length === 0) return null;
  if (items.length > 1) return `${items.length} items are checked out on their own. They stay in your cart.`;
  const { title, code, locality } = items[0];
  return code === "other_pickup_point"
    ? `The ${title} is collected from ${locality || "another place"}, so it is checked out on its own. It stays in your cart.`
    : `The ${title} is billed monthly, so it is booked on its own. It stays in your cart.`;
}

/** The button that fixes it (G11): "Leave it in cart and continue". */
export const fixLabel = (n: number, andContinue = true) =>
  `Leave ${n === 1 ? "it" : `${n} items`} in cart${andContinue ? " and continue" : ""}`;

/** The delivery card's reason when included items are not delivered (CT-21c, D26). */
export function notDeliveredReason(titles: string[]): string {
  return titles.length === 1
    ? `The ${titles[0]} is not delivered. Leave it in your cart to get delivery.`
    : `${titles.length} items are not delivered. Leave them in your cart to get delivery.`;
}

/** Under the card (FIXES B2 row 15): "Your 2 items from Party Props and HomeEase stay in your cart. Each shop is booked on its own." */
export function othersLine(others: CartOthers | null | undefined): string | null {
  if (!others || others.items < 1) return null;
  const shops = Array.isArray(others.shops) ? others.shops.filter(Boolean) : [];
  const count = Array.isArray(others.shops) ? 0 : others.shops;
  const from =
    shops.length > 1
      ? `${shops.slice(0, -1).join(", ")} and ${shops[shops.length - 1]}`
      : shops[0] ?? (count > 1 ? `${count} other shops` : count === 1 ? "another shop" : undefined);
  const items = others.items === 1 ? "Your item" : `Your ${others.items} items`;
  return `${items}${from ? ` from ${from}` : ""} ${others.items === 1 ? "stays" : "stay"} in your cart. Each shop is booked on its own.`;
}

/** The bottom bar's line under the total (FIXES B2 row 16): what is paid when, so the total doesn't read as due now. */
export function barLine(quote: Pick<Quote, "days" | "pay_now"> | undefined, shop: string): string | null {
  return quote ? `${daysLabel(quote.days)} · ${money(quote.pay_now)} to book, the rest after ${shop} accepts` : null;
}

/**
 * CT-40: on the month on screen, no day from `from` to `to` has every included item free. `culprits`: the items taken
 * on every one of those days, which the notice names. Only for two or more items: one item's taken days are greyed.
 */
export function noDayAllFree(
  month: string,
  from: string,
  to: string,
  lines: { name: string; taken: Set<string> }[]
): { none: boolean; culprits: string[] } {
  const no = { none: false, culprits: [] };
  if (lines.length < 2) return no;
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const start = `${month}-01` > from ? `${month}-01` : from;
  const monthEnd = addDays(next, -1);
  const end = monthEnd < to ? monthEnd : to;
  if (start > end) return no;
  const days: string[] = [];
  for (let i = 0, n = dayCount(start, end); i < n; i++) days.push(addDays(start, i));
  if (days.some((day) => lines.every((line) => !line.taken.has(day)))) return no;
  return { none: true, culprits: lines.filter((line) => days.every((day) => line.taken.has(day))).map((l) => l.name) };
}

/** CT-40's notice: the item taken all month named, or the plain fact. */
export function noDayNotice(count: number, culprits: string[]): { title: string; text: string } {
  const title = `No day has all ${count} items free`;
  if (culprits.length === 1) {
    return { title, text: `The ${culprits[0]} is booked every day this month. Leave it in your cart to pick dates for the rest.` };
  }
  return { title, text: "Leave an item in your cart, or look at another month." };
}

/** G5's price panel: "Rent (3 items)", then delivery and Renit's fee as the one-item screen says them. */
export function cardPriceLines(quote: Quote, items: number): PriceLine[] {
  const [rent, handover, fee] = priceLines(quote);
  return [{ ...rent, label: `Rent (${pluralize(items, "item")})` }, handover, fee];
}

/** Step 3's second line (FIXES B2 row 12): "Sony A7 IV camera ₹20,000 · Lens ₹5,000". Null for one item. */
export function madeOf(lines: QuoteLine[] | undefined, titleOf: (name: string) => string): string | null {
  if (!lines || lines.length < 2) return null;
  return lines.map((line) => `${titleOf(line.product)} ${money(line.deposit)}`).join(" · ");
}

/** CT-23a: what moved on each item between the quote shown and the one after `price_changed`. */
export function lineChanges(was: Quote | null, now: Quote): Record<string, string[]> {
  const changes: Record<string, string[]> = {};
  for (const line of now.lines ?? []) {
    const old = was?.lines?.find((l) => l.product === line.product);
    if (!old) continue;
    const said: string[] = [];
    if (Number(old.rate) !== Number(line.rate)) said.push(`Now ${money(line.rate)} a day (was ${money(old.rate)})`);
    if (Number(old.deposit) !== Number(line.deposit)) said.push(`Deposit now ${money(line.deposit)} (was ${money(old.deposit)})`);
    if (said.length) changes[line.product] = said;
  }
  return changes;
}

/** The old amount, when it moved: drawn struck beside the new one (CT-23a). */
export const wasAmount = (was: string | null | undefined, now: string): string | undefined =>
  was != null && Number(was) !== Number(now) ? money(was) : undefined;

/**
 * Book Now on `book_flow=card` (D41) asks with `products:[name]`, so the reasons its one item can't go come in the
 * line. Read back into the quote's own list, the screens say them exactly as they do for `product`.
 */
export function asOneItem(quote: Quote): Quote {
  const line = quote.lines?.[0];
  if (!line || quote.lines!.length !== 1) return quote;
  const own = line.blockers.filter((code) => !quote.blockers.includes(code));
  return own.length ? { ...quote, blockers: [...own, ...quote.blockers] } : quote;
}

/** One UPI payment can't be over ₹1 lakh (D48; the NPCI default). */
export const UPI_LIMIT = 100000;

/** CT-43a: the deposit is its own payment, and over ₹1 lakh it can't go by UPI. Null when the note has nothing to add. */
export function depositOwnPage(quote: Pick<Quote, "deposit" | "pay_after_accept">): { title: string; text: string } | null {
  const deposit = Number(quote.deposit.amount);
  if (!(deposit > 0) || quote.deposit.with_rent || Number(quote.pay_after_accept) + deposit <= UPI_LIMIT) return null;
  const due = quote.deposit.due_on ? `due ${dayShort(quote.deposit.due_on)}` : "due before the handover";
  const card = deposit > UPI_LIMIT ? " It is over ₹1 lakh, so pay it by card or net banking." : "";
  return { title: "The deposit has its own page", text: `The deposit is a separate payment, ${due}.${card}` };
}

/** The refusals of the whole card that CT-44 draws at the top of the price screen. */
export const CARD_REFUSALS = ["one_item_only", "too_many_in_flight", "already_requested"];

/** CT-44: Book now refused for the whole card. The notice at the top; nothing was booked. */
export function refusalNotice(
  code: string,
  ctx: { shop: string; amount: string; details?: Record<string, unknown> | null; titleOf: (name: string) => string }
): { title: string; text: string } | null {
  const details = ctx.details ?? {};
  switch (code) {
    case "one_item_only":
      return {
        title: `${ctx.shop} takes one item per booking for now`,
        text: `Nothing was booked and no money was taken. Each item is booked on its own, with its own ${ctx.amount} and delivery fee. Your items stay in your cart.`,
      };
    case "too_many_in_flight": {
      const n = inFlightMax(details);
      return {
        title: `You have ${n} open requests`,
        text: `Nothing was booked. Finish or cancel one of your ${n} open requests first. Your items stay in your cart.`,
      };
    }
    case "already_requested": {
      const title = typeof details.product === "string" ? ctx.titleOf(details.product) : null;
      const number = typeof details.number === "string" ? details.number : null;
      return {
        title: title ? `You've already requested the ${title}` : "You've already requested an item",
        text: `Nothing was booked. ${number ? `Your request ${number}` : "An earlier request"} is for this ${title ?? "item"} on these dates. Leave it in your cart to book the rest.`,
      };
    }
    default:
      return null;
  }
}

/** The way on after a CT-44 refusal: back to the cart, or to the open requests. */
export const refusalButton = (code: string): string | null =>
  code === "one_item_only" ? "Back to your cart" : code === "too_many_in_flight" ? "See your open requests" : null;
