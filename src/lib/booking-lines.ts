import {
  BookingCustomer,
  BookingLine,
  CancelOutcome,
  PayRentCopy,
  clock,
  money,
  timeAndDay,
} from "@/lib/booking";
import type { ActiveCopy } from "@/lib/day-of";
import { pluralize } from "@/lib/pluralize";

/**
 * A booking of several items, as its customer sees it (cart plan v2 §3.3, §3.7; Figma CT-27 to CT-49). One booking is
 * one shop, one window, one deposit and one code; its `lines` are the items. Plain functions over those lines: every one
 * answers null (or leaves the one-item words alone) for a booking of one line, so a booking from before the cart, or from
 * Book Now, reads exactly as it did.
 */

type Lines = Pick<BookingCustomer, "lines">;

/** D18: more than one line in any state. A partial accept that leaves one item is still a basket. */
export const isBasket = (b: Lines) => (b.lines?.length ?? 0) > 1;

export const liveLines = (b: Lines) => (b.lines ?? []).filter((line) => line.state === "live");

/** "Not in this booking": unticked by the shop (`refused`) or lost to another booking before the accept (`no_unit`). */
export const leftOutLines = (b: Lines) => (b.lines ?? []).filter((line) => line.state !== "live");

export const itemsText = (n: number) => pluralize(n, "item");

/** "the camera", "the camera and the lens", "the camera, the lens and the tripod". */
export function theItems(lines: BookingLine[]): string {
  const titles = lines.map((line) => `the ${line.product.title}`);
  return titles.length < 2 ? titles[0] ?? "" : `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;
}

/** "all 3 items", or the one item by name when only one is left. */
const allOf = (lines: BookingLine[]) => (lines.length === 1 ? theItems(lines) : `all ${lines.length} items`);

/** The thumb's "+2" (CT-30a): the live items past the first, which the title's "+ 2 more" already counts. */
export function moreBadge(b: Lines): string | null {
  const more = liveLines(b).length - 1;
  return isBasket(b) && more > 0 ? `+${more}` : null;
}

/** D21, CT-37: "Sony A7 IV ₹20,000 · Lens ₹5,000", each live item's share of the one deposit. Null unless two share it. */
export function madeOf(b: Lines): string | null {
  const shares = liveLines(b).filter((line) => Number(line.deposit) > 0);
  return isBasket(b) && shares.length > 1
    ? shares.map((line) => `${line.product.title} ${money(line.deposit)}`).join(" · ")
    : null;
}

/** G12's chip on an item that is not in the booking, and its tone. */
export const leftOutChip = (line: BookingLine) =>
  line.state === "no_unit"
    ? { label: "No longer free", tone: "danger" as const }
    : { label: "Not available · dates blocked", tone: "neutral" as const };

/** The shop gave fewer items than were asked and the rent is still to pay: a cancel or a lapse gives the ₹99 back (D11). */
export const partlyAccepted = (b: Pick<BookingCustomer, "lines" | "stage" | "exit">) =>
  b.stage === "accepted" && !b.exit && isBasket(b) && leftOutLines(b).length > 0;

/** Whether the rent was paid: the lines left the cart then (D6), which decides what an owner's cancel offers (D46). */
export const rentPaid = (b: Pick<BookingCustomer, "payments">) =>
  b.payments.some(
    (row) => row.kind === "payment" && (row.what === "rent" || row.what === "rent_and_deposit") && row.status === "paid"
  );

/** " by 4:34 pm", with the day when it is not today; "" without a time. */
function by(iso: string | null | undefined, now: Date): string {
  const when = iso ? timeAndDay(iso, now) : null;
  if (!when) return "";
  return when.day === "today" ? ` by ${when.time}` : ` by ${when.time} ${when.day}`;
}

const rentOf = (lines: BookingLine[]) => lines.reduce((total, line) => total + Number(line.rent), 0);

/** The Rentals card's foot after a partial accept (§3.7): "Pay ₹2,501 for 2 of 3 items by 4:34 pm". Null otherwise. */
export function basketNextLine(b: BookingCustomer, now: Date = new Date()): string | null {
  if (!partlyAccepted(b)) return null;
  const amount = money(b.pay_now?.amount ?? b.money.pay_after_accept);
  return `Pay ${amount} for ${liveLines(b).length} of ${b.lines?.length} items${by(b.pay_now?.due_at ?? b.money.rent_due_at, now)}`;
}

export interface BasketPayRent extends PayRentCopy {
  /** The text button under Pay: what cancelling now does to the ₹99. */
  cancel: string;
}

/**
 * CT-26 and CT-27, PayRent for a basket. All accepted: the shop's yes names the items. Some: what was left out, the
 * smaller sum and the way out with the ₹99 back (D11). The amounts are the booking's own; only the words change, so the
 * button still names exactly what the pay page takes (D43).
 */
export function basketPayRent(b: BookingCustomer, copy: PayRentCopy, now: Date = new Date()): BasketPayRent {
  const ninetyNine = money(b.money.booking_amount);
  if (!isBasket(b)) return { ...copy, cancel: "Cancel booking" };
  const live = liveLines(b);
  const out = leftOutLines(b);
  const amount = copy.total.amount;
  const deadline = by(b.pay_now?.due_at ?? b.money.rent_due_at, now);
  const lines = copy.lines.map((line) =>
    line.label === "Rent"
      ? { ...line, label: `Rent (${itemsText(live.length)})`, struck: out.length ? money(rentOf(b.lines ?? [])) : undefined }
      : line
  );
  const shares = madeOf(b);
  const note = copy.note && shares ? `${copy.note} Made of: ${shares}.` : copy.note;
  if (out.length) {
    const rest = live.length === 1 ? theItems(live) : `the other ${live.length}`;
    return {
      ...copy,
      lines,
      note,
      title: `${b.shop.name} can do ${live.length} of ${b.lines?.length} items`,
      sub: `${capital(theItems(out))} ${out.length === 1 ? "is" : "are"} not available. Pay ${amount}${deadline} for ${rest}, or cancel and get your ${ninetyNine} back.`,
      button: `Pay ${amount} for ${itemsText(live.length)}`,
      small: `If you don't pay${deadline}, the request ends and your ${ninetyNine} comes back.`,
      cancel: `Cancel · ${ninetyNine} back`,
    };
  }
  return {
    ...copy,
    lines,
    note,
    title: `${b.shop.name} accepted all ${live.length} items`,
    small: `If you don't pay${deadline}, the request ends and Renit keeps the ${ninetyNine}.`,
    cancel: `Cancel · Renit keeps the ${ninetyNine}`,
  };
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export interface CancelHead {
  title: string;
  sub: string | null;
  /** While the rent is unpaid the items are still in the cart (D6), and the sheet says so. */
  stay: string | null;
}

/** CT-33: what a basket's cancel covers, above the money. Null for one item, whose sheet is as before. */
export function cancelHead(outcome: CancelOutcome, b: BookingCustomer): CancelHead | null {
  if (!isBasket(b)) return null;
  const live = liveLines(b);
  const stay = live.length === 1 ? "Your item stays in your cart." : `Your ${live.length} items stay in your cart.`;
  switch (outcome.case) {
    case "ringing":
      return { title: `Stops the request for ${allOf(live)}`, sub: null, stay };
    case "shop_changed": {
      const out = leftOutLines(b);
      return {
        title: `${b.shop.name} can do ${live.length} of your ${b.lines?.length} items`,
        sub: `${capital(theItems(out))} ${out.length === 1 ? "is" : "are"} not available, so you can leave for free.`,
        stay: `All ${b.lines?.length} items stay in your cart.`,
      };
    }
    case "after_accept":
      return { title: `Cancels ${allOf(live)}`, sub: null, stay };
    default:
      // The rent is paid: the items left the cart then, and one can't be cancelled without the others (D22).
      return {
        title: `Cancels ${allOf(live)}`,
        sub: live.length > 1 ? `${capital(theItems(live))}. One item can't be cancelled on its own.` : null,
        stay: null,
      };
  }
}

/** CT-29: a basket whose rent wasn't paid after the accept. Null for anything else, whose banner is as before. */
export function lapseBanner(b: BookingCustomer): { title: string; sub: string } | null {
  if (b.exit !== "lapsed_unpaid" || !isBasket(b)) return null;
  const due = b.money.rent_due_at;
  return { title: due ? `The rent wasn't paid by ${clock(due)}` : "The rent wasn't paid in time", sub: "So the request ended." };
}

/**
 * G10, CT-29: the ₹99 after a basket's rent wasn't paid. Back (success) after a partial accept, kept (neutral) after a
 * full one, and why. The state is the server's (`booking_amount_state`), never worked out here.
 */
export function lapseNotice(b: BookingCustomer): { tone: "success" | "neutral"; title: string; body: string } | null {
  if (b.exit !== "lapsed_unpaid" || !isBasket(b)) return null;
  const amount = money(b.money.booking_amount);
  const live = liveLines(b).length;
  const all = b.lines?.length ?? live;
  const days = b.money.booking_amount_refund_days;
  const when = days ? ` (${days.min}-${days.max} working days)` : "";
  switch (b.money.booking_amount_state) {
    case "refund_requested":
    case "refunded":
      return {
        tone: "success",
        title: b.money.booking_amount_state === "refunded" ? `${amount} was refunded to you` : `${amount} is on its way back to you${when}`,
        body: `${b.shop.name} could do only ${live} of your ${all} items, so the ${amount} comes back.`,
      };
    case "kept":
      return { tone: "neutral", title: `Renit kept your ${amount}`, body: `${b.shop.name} had already said yes to all ${all} items.` };
    default:
      return null;
  }
}

/**
 * D46, CT-47: the shop cancelled because it couldn't give one item (`exit_line`). The title names it; with the rent paid
 * the customer can book the others again (`restOf`) and add that one to the cart. Null for any other ending.
 */
export function ownerCancelCopy(b: BookingCustomer): { title: string; body: string } | null {
  if (b.exit !== "cancelled_by_owner" || !b.exit_line || !isBasket(b)) return null;
  return {
    title: `${b.shop.name} can't give the ${b.exit_line.title}`,
    body: rentPaid(b)
      ? `So ${b.shop.name} cancelled the booking. Everything you paid is going back to you.`
      : `So ${b.shop.name} cancelled the request. Your ${money(b.money.booking_amount)} is going back to you.`,
  };
}

/** D46's "Book the rest": the booking's other items, by listing name in line order, without the one the shop couldn't give. */
export function restOf(b: BookingCustomer): string[] {
  return liveLines(b)
    .filter((line) => line.id !== b.exit_line?.id)
    .map((line) => line.product.name)
    .filter((name): name is string => Boolean(name));
}

/** The listing of the item the shop couldn't give, for "Add it to cart". Null when it has none (deleted). */
export function exitLineProduct(b: BookingCustomer): BookingLine["product"] | null {
  const line = (b.lines ?? []).find((l) => l.id === b.exit_line?.id);
  return line?.product.name ? line.product : null;
}

// ---- Day-of ticks (D44, CT-34, CT-45) ------------------------------------------------------------

export type Tick = "got" | "not_here";
/** The customer's ticks by line id, before they are sent. */
export type Ticks = Record<number, Tick>;

export interface Received {
  got: number[];
  not_here: number[];
}

/** Where this phone keeps the ticks the server logged, for the rest of this run of the app (the server answers them again). */
export const receivedKey = (number: string) => ["items-received", number];

/** The body of `POST …/received/` once every live item is ticked one way; null until then, and the code stays hidden. */
export function receivedBody(b: Lines, ticks: Ticks): Received | null {
  const live = liveLines(b);
  if (!live.length || live.some((line) => !ticks[line.id])) return null;
  return {
    got: live.filter((line) => ticks[line.id] === "got").map((line) => line.id),
    not_here: live.filter((line) => ticks[line.id] === "not_here").map((line) => line.id),
  };
}

/** The server's ticks as the screen holds them. */
export const ticksOf = (received: Received): Ticks => ({
  ...Object.fromEntries(received.got.map((id) => [id, "got" as const])),
  ...Object.fromEntries(received.not_here.map((id) => [id, "not_here" as const])),
});

/** CT-34a's locked code: "Tick all 3 items to see your code · 1 of 3 ticked". */
export function ticksCaption(b: Lines, ticks: Ticks): string {
  const live = liveLines(b);
  const done = live.filter((line) => ticks[line.id]).length;
  return `Tick all ${live.length} items to see your code · ${done} of ${live.length} ticked`;
}

/** CT-45a: the "Not here" sheet for one item. Each choice is the plan's (§3.3 Day-of) with its money (FIXES B3 row 8). */
export function notHereCopy(b: BookingCustomer, line: BookingLine) {
  const others = liveLines(b).filter((l) => l.id !== line.id);
  const share = Number(line.deposit) > 0 ? ` Its ${money(line.deposit)} deposit share comes back with your deposit.` : "";
  return {
    title: `The ${line.product.title} isn't here?`,
    sub: "Your code stays hidden until you choose.",
    ask: { title: `Ask ${b.shop.name}`, sub: "Call the shop. It may still be in the car or in another bag." },
    take: {
      title: "Take the rest and report",
      sub: `Your code shows for ${theItems(others)}. After the handover, report the ${line.product.title}: Renit can refund up to its rent (${money(line.rent)}).${share}`,
    },
    refuse: {
      title: "Refuse everything",
      sub: `This refuses all ${liveLines(b).length} items, not only the ${line.product.title}. ${b.shop.name} takes everything back.`,
    },
  };
}

/** D45, CT-48a: what a report on one item of a basket does, before it is sent. */
export function lineFaultNotice(line: BookingLine): string {
  const share = Number(line.deposit) > 0 ? ` Its ${money(line.deposit)} deposit share comes back with your deposit, as usual.` : "";
  return (
    `Only the ${line.product.title} is looked at: the rest of the rental goes on. ` +
    `If Renit agrees, it decides how much of its rent (up to ${money(line.rent)}) comes back to you.${share}`
  );
}

// ---- Active and the return (CT-35, CT-35b) --------------------------------------------------------

/** CT-35: "3 items from Lens Lane", "Return these 3 items by …", the deposit's make-up. One item left reads as one item. */
export function basketActive(b: BookingCustomer, copy: ActiveCopy): ActiveCopy {
  const n = liveLines(b).length;
  if (!isBasket(b) || n < 2) return copy;
  const shares = madeOf(b);
  return {
    ...copy,
    title: `${itemsText(n)} from ${b.shop.name}`,
    returnBy: copy.returnBy?.replace(/^Return by/, `Return these ${n} items by`) ?? null,
    deposit: copy.deposit && shares ? { ...copy.deposit, sub: `${copy.deposit.sub}. Made of: ${shares}` } : copy.deposit,
    button: `Return these ${n} items`,
  };
}

/** CT-35b: the return of a basket goes back whole (D51), so the screen says so before the code is typed. */
export function basketReturnNote(b: Lines): string | null {
  const n = liveLines(b).length;
  return isBasket(b) && n > 1
    ? `All ${n} go back together. Put every item in the bag before you type the code. Something missing? Don't type the code: call Renit from Get help below.`
    : null;
}
