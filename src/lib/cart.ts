import type { ApiError } from "@/lib/api-error";
import { clock, rangeLabel } from "@/lib/booking";
import { formatCurrency } from "@/lib/format";
import { pluralize } from "@/lib/pluralize";
import type { RootStackParamList } from "@/lib/types";

/**
 * The customer's cart (cart plan v2 §3.1, §3.2, §3.4): the shape of
 * `GET /api/cart/` and what the screens say about it. rn-api groups the lines by
 * shop and picks every warning; the phone only draws them, so nothing here
 * decides what a line may do beyond reading its warning.
 */

export interface CartProduct {
  name: string;
  title: string;
  cover_image: string | null;
  /** Rupees a day, "500.00"; null for a listing that lost its rate. */
  rate: string | null;
  deposit: string;
}

/** The one warning a line shows; the server picks the one that matters most. */
export type CartLineWarning =
  | { code: "in_checkout"; booking: string }
  | { code: "not_listed" }
  | { code: "you_booked_it"; booking: string; first_day: string; last_day: string }
  | { code: "other_pickup_point"; locality: string }
  | { code: "price_changed"; rate_was: string; deposit_was: string }
  | { code: "pickup_only" };

export type CartCardWarning =
  | { code: "shop_paused" }
  | { code: "one_item_only" }
  | { code: "closed_now"; opens_at: string | null };

export interface CartLine {
  product: CartProduct;
  warning: CartLineWarning | null;
  /** The booking this line is in checkout with, else null. */
  booking: string | null;
  added_at: string | null;
}

export interface CartShop {
  /** The owner's username: the app has no shop id (F24). */
  key: string;
  name: string;
  locality: string;
  delivers: boolean;
  verified: boolean;
}

export interface CartCard {
  shop: CartShop;
  warning: CartCardWarning | null;
  /** In the order they were added, which is the order checkout sends them in. */
  lines: CartLine[];
}

/** Cards most recently changed first. `count` is every line, the badge's number. */
export interface Cart {
  count: number;
  cards: CartCard[];
}

export const EMPTY_CART: Cart = { count: 0, cards: [] };

export function cartLine(cart: Cart | undefined, name: string): CartLine | null {
  for (const card of cart?.cards ?? []) {
    const line = card.lines.find((l) => l.product.name === name);
    if (line) return line;
  }
  return null;
}

/**
 * The cart as the server will answer an add, for the moment before it does:
 * the line at the end of its shop's card, and that card first. Adding a line
 * that is already there changes nothing, as on the server.
 */
export function withLine(cart: Cart, shop: CartShop, product: CartProduct): Cart {
  if (cartLine(cart, product.name)) return cart;
  const line: CartLine = { product, warning: null, booking: null, added_at: null };
  const own = cart.cards.find((card) => card.shop.key === shop.key);
  const card: CartCard = own ? { ...own, lines: [...own.lines, line] } : { shop, warning: null, lines: [line] };
  return { count: cart.count + 1, cards: [card, ...cart.cards.filter((c) => c !== own)] };
}

/** The cart as the server will answer a remove: the line gone, and its card with it when it was the last. */
export function withoutLine(cart: Cart, name: string): Cart {
  if (!cartLine(cart, name)) return cart;
  const cards = cart.cards
    .map((card) => ({ ...card, lines: card.lines.filter((l) => l.product.name !== name) }))
    .filter((card) => card.lines.length > 0);
  return { count: cart.count - 1, cards };
}

/** "5 items from 3 shops", or "1 item from Lens Lane" when there is one shop. */
export function cartSize(cart: Cart): string {
  const items = pluralize(cart.count, "item");
  return cart.cards.length === 1
    ? `${items} from ${cart.cards[0].shop.name}`
    : `${items} from ${pluralize(cart.cards.length, "shop")}`;
}

/** What "Check out" takes: every line but the ones gone from the listings or already in checkout (§3.3). */
export function checkoutLines(card: CartCard): CartLine[] {
  return card.lines.filter((l) => l.warning?.code !== "not_listed" && l.warning?.code !== "in_checkout");
}

/** The deposit of the lines Check out takes, for the card's footer. Display only: the quote is the sum that counts. */
export function cardDeposit(card: CartCard): number {
  return checkoutLines(card).reduce((sum, l) => sum + (Number(l.product.deposit) || 0), 0);
}

export type CartNoteTone = "info" | "warning" | "neutral";

/** A line's warning as its chip says it. `booking` makes the chip open that booking. Null: no chip. */
export function lineNote(line: CartLine, card: CartCard): { text: string; tone: CartNoteTone; booking?: string } | null {
  const w = line.warning;
  switch (w?.code) {
    case "in_checkout":
      return { text: `In checkout · ${w.booking}`, tone: "info", booking: w.booking };
    case "not_listed":
      return { text: "No longer available", tone: "neutral" };
    case "you_booked_it":
      return { text: `You've booked this for ${rangeLabel(w.first_day, w.last_day)} · starts left out at checkout`, tone: "info" };
    case "other_pickup_point":
      return { text: `Collected from ${w.locality || "another place"} · checked out separately`, tone: "neutral" };
    case "price_changed": {
      const parts = [];
      if (Number(w.rate_was) !== Number(line.product.rate)) {
        parts.push(`Now ${formatCurrency(line.product.rate)} a day (was ${formatCurrency(w.rate_was)})`);
      }
      if (Number(w.deposit_was) !== Number(line.product.deposit)) {
        parts.push(`Deposit now ${formatCurrency(line.product.deposit)} (was ${formatCurrency(w.deposit_was)})`);
      }
      return parts.length ? { text: parts.join(" · "), tone: "warning" } : null;
    }
    case "pickup_only":
      return {
        text: card.shop.locality ? `Pickup only · you collect it from ${card.shop.locality}` : "Pickup only",
        tone: "neutral",
      };
    default:
      // A code from a newer server: nothing is better than a guess.
      return null;
  }
}

/** The card's own warning, under the shop's header. `off`: Check out is off while it shows. */
export function cardNote(card: CartCard): { title: string; body: string; tone: "info" | "warning"; off: boolean } | null {
  const shop = card.shop.name;
  const w = card.warning;
  switch (w?.code) {
    case "shop_paused":
      return {
        title: `${shop} isn't taking bookings right now`,
        body: `${card.lines.length === 1 ? "Your item stays" : "Your items stay"} in your cart. ${shop} hasn't said when they'll reopen. Check out turns back on when they do.`,
        tone: "warning",
        off: true,
      };
    case "one_item_only":
      return {
        title: `${shop} takes one item per booking for now`,
        body: `Each item is booked on its own, with its own ₹99 and delivery fee. Or keep them here until ${shop} takes several items.`,
        tone: "warning",
        off: true,
      };
    case "closed_now":
      return {
        title: w.opens_at ? `Closed now · asked when they open at ${clock(w.opens_at)}` : "Closed now · asked when they open",
        body: `You can book now. ${shop} is asked when they open, and you pay the rest once they accept.`,
        tone: "info",
        off: false,
      };
    default:
      return null;
  }
}

/** What a refused or failed add says, and what its toast offers. `refused`: this shop takes no carts now, so Add goes. */
export function addFailure(
  failure: ApiError | null,
  shopName: string
): { severity: "warning" | "error"; title: string; message: string; action: "retry" | "view_cart" | null; refused: boolean } {
  const failed = { severity: "error" as const, title: "Couldn't add to cart", refused: false };
  if (failure?.code === "shop_not_ready") {
    return {
      severity: "warning",
      title: "Can't add this to your cart",
      message: `${shopName} takes one item per booking for now. Book it on its own, with its own ₹99 and delivery fee.`,
      action: null,
      refused: true,
    };
  }
  if (failure?.code === "cart_full") {
    const max = Number(failure.details?.max) || 30;
    return {
      severity: "warning",
      title: "Your cart is full",
      message: `It holds ${max} items. Remove one to add this.`,
      action: "view_cart",
      refused: false,
    };
  }
  if (failure?.code === "own_product") return { ...failed, message: "This is your own listing.", action: null };
  if (failure?.status === 404) return { ...failed, message: "This listing isn't available any more.", action: null };
  if (!failure || failure.status === 0) {
    return { ...failed, message: "You may be offline. Try again when you're back online.", action: "retry" };
  }
  return { ...failed, message: failure.message ?? "Try again in a moment.", action: "retry" };
}

/**
 * Of the customer's open bookings, the accepted one whose rent is due first: the
 * cart's pay strip names it (§3.2). Null when none waits for its rent.
 */
export function waitingForRent<B extends { stage: string; money: { rent_due_at: string | null } }>(bookings: B[]): B | null {
  const due = (b: B) => b.money.rent_due_at ?? "￿";
  return bookings.filter((b) => b.stage === "accepted").sort((a, b) => due(a).localeCompare(due(b)))[0] ?? null;
}

// ---- Dates for checkout (D5) ------------------------------------------------------

type Dates = { first_day: string; last_day: string };

// Memory only, like the return-to target: "the last dates used in this app session".
let booked: Dates | null = null;
let searched: Dates | null = null;

/** The dates of a booking just made; the next checkout starts on them. */
export function rememberDates(first_day: string, last_day: string) {
  booked = { first_day, last_day };
}

/** The dates of the search a listing was opened from; used when nothing was booked yet. */
export function rememberSearchDates(dates: Dates | undefined) {
  if (dates) searched = { ...dates };
}

/** Where a checkout's calendar starts: the last dates booked in this session, else the last searched, else nothing. */
export function checkoutDates(): Partial<Dates> {
  return booked ?? searched ?? {};
}

/** For tests: forget both. */
export function forgetDates() {
  booked = null;
  searched = null;
}

// ---- After Book (§3.4) -----------------------------------------------------------------

type Route = { [K in keyof RootStackParamList]: { name: K; params?: RootStackParamList[K] } }[keyof RootStackParamList];

/**
 * The stack once a booking is made. As before, Rentals under the booking, so
 * Back leaves the checkout behind. A booking made from the cart puts the cart
 * between them while it still has something to check out, so the next card is
 * one Back away. `booked` is the products that went into the booking: the cart
 * read before Book still shows them as free.
 */
export function afterBookRoutes({
  number,
  pay,
  fromCart,
  cart,
  booked,
}: {
  number: string;
  pay: boolean;
  fromCart: boolean;
  cart: Cart | undefined;
  booked: string[];
}): { index: number; routes: Route[] } {
  const rest =
    fromCart &&
    (cart?.cards ?? []).some((card) => checkoutLines(card).some((line) => !booked.includes(line.product.name)));
  const routes: Route[] = [
    { name: "MainTabs", params: { screen: "Rentals" } },
    ...(rest ? [{ name: "Cart" } as Route] : []),
    { name: "Booking", params: { number, pay } },
  ];
  return { index: routes.length - 1, routes };
}
