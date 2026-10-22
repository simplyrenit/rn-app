/**
 * ENG-284 / ENG-292: who delivers to the customer's address, as search, the
 * product page and BK-02 say it. Plain functions, so the words can be tested.
 *
 * The server answers per listing (`delivery`) for the address the customer
 * chose on search results, and per quote (`delivery.status/reason/area`). The
 * app only words those answers; it never works delivery out itself.
 */
import { SavedAddress, addressTitle } from "@/lib/addresses";
import { formatCurrency } from "@/lib/format";
import { kmText } from "@/lib/shop";

/**
 * Unified delivery B1: who carries an owner delivery. The wire mode stays `owner_delivery`; `renit` means Renit books a
 * courier partner for both trips at a fixed fee. Absent (a server before B1) is the shop, as is anything this build does
 * not know.
 */
export type DeliveredBy = "shop" | "renit";

/** The name customers see for the courier (plan-v2 §5.11): never the aggregator's brand, never "Delivered by Renit". */
export const COURIER = "Renit courier partner";

/** Whether Renit's courier partner carries it: a booking's `delivered_by`, or a quote's `delivery.by`. Only `renit` says yes. */
export function byRenit(
  x: { delivered_by?: DeliveredBy | null; delivery?: { by?: DeliveredBy | null } | null } | null | undefined
): boolean {
  return (x?.delivered_by ?? x?.delivery?.by) === "renit";
}

/** `delivery` on a search result or product with `?deliver_address=` (API-CONTRACT §5.5). */
export interface ListingDelivery {
  to_me: boolean;
  /** "110.00"; only when `to_me`. */
  fee: string | null;
  /** Address → listing, "1.2"; null when the listing has no pin. */
  km: string | null;
}

/** What a listing needs for its delivery line. */
export interface DeliveryFacts {
  delivery?: ListingDelivery | null;
  shop?: { delivers?: boolean } | null;
  not_delivered?: boolean;
  /**
   * B1: the lowest courier fee to this listing ("280.00"), sent only while the courier is on, to a new enough client,
   * for an item that can go by courier. Absent or null: today's lines.
   */
  delivery_from?: string | null;
}

/**
 * Whether the listing offers delivery at all: the shop delivers, or the courier does (`delivery_from`), and this item is
 * not excepted.
 */
export const offersDelivery = (p: DeliveryFacts) => Boolean((p.shop?.delivers || p.delivery_from) && !p.not_delivered);

/**
 * A card's meta line, in parts so the card can colour the word: "1.2 km ·
 * Delivery ₹110" (the word in the success colour), "0.9 km · Self pickup",
 * "1.2 km away · Delivery available" (no address chosen). Null keeps the card's
 * own "{distance} · {locality}" line.
 *
 * `gpsDistance` is the card's own distance from the phone ("1.2 km away"). It is
 * used only when no address is chosen: once one is, every km on the grid is
 * from that address, or none is shown, so two cards never measure from
 * different places.
 */
export interface DeliveryLine {
  km: string | null;
  word: "Delivery" | "Self pickup" | "Delivery available" | "Delivery from";
  fee: string | null;
}

export function cardDeliveryLine(p: DeliveryFacts, gpsDistance: string | null): DeliveryLine | null {
  const d = p.delivery;
  if (d) {
    const km = d.km ? kmText(d.km) : null;
    return d.to_me
      ? { km, word: "Delivery", fee: d.fee ? formatCurrency(d.fee) : null }
      : { km, word: "Self pickup", fee: null };
  }
  if (!offersDelivery(p)) return null;
  // B1: no address yet, but the server knows the lowest courier fee: "Delivery from ₹280".
  if (p.delivery_from) return { km: gpsDistance, word: "Delivery from", fee: formatCurrency(p.delivery_from) };
  return { km: gpsDistance, word: "Delivery available", fee: null };
}

/** The line as one string, for the screen reader and the tests. */
export function deliveryLineText(line: DeliveryLine): string {
  return [line.km, [line.word, line.fee].filter(Boolean).join(" ")].filter(Boolean).join(" · ");
}

/** The grid split for "Delivers to me" (D2): who delivers to the address, and the rest. */
export function splitByDelivery<T extends DeliveryFacts>(products: T[]): { deliver: T[]; pickup: T[] } {
  const deliver: T[] = [];
  const pickup: T[] = [];
  for (const p of products) (p.delivery?.to_me ? deliver : pickup).push(p);
  return { deliver, pickup };
}

/** "Showing 4 that deliver" ("1 that delivers") and, when there are any, "3 more for self pickup". */
export function deliverCountLine(deliver: number, pickup: number): { shown: string; more: string | null } {
  return {
    shown: `Showing ${deliver} that ${deliver === 1 ? "delivers" : "deliver"}`,
    more: pickup > 0 ? `${pickup} more for self pickup` : null,
  };
}

/**
 * The address row and the empty state name the place by its area: the first
 * part of the locality ("Versova" of "Versova, Mumbai"), else its PIN.
 */
export function areaOf(address: Pick<SavedAddress, "locality" | "postal_code">): string {
  return address.locality.split(",")[0].trim() || address.postal_code || "";
}

/** The row above the results (D12), or null while the addresses load. */
export function addressRowCopy(
  state: DeliveryAddressState,
  address: SavedAddress | null
): { text: string; action: string } | null {
  if (state === "signed_out") return { text: "Sign in to see who delivers to you", action: "Sign in" };
  if (state === "none") return { text: "Add your address to see who delivers", action: "Add" };
  if (state === "ready" && address) {
    const area = areaOf(address);
    return { text: ["Delivering to", addressTitle(address)].join(" ") + (area ? ` · ${area}` : ""), action: "Change" };
  }
  return null;
}

export type DeliveryAddressState = "signed_out" | "loading" | "error" | "none" | "ready";

/**
 * Filter on and nobody delivers: "No one delivers air coolers to Versova yet",
 * then how many shops have them for self pickup and the closest of them, from
 * the address. A listing is counted by its owner, so one shop is one shop.
 */
export function nobodyDeliversCopy(
  what: string,
  area: string,
  pickup: (DeliveryFacts & { owner?: { username?: string } | null; name?: string })[]
): { title: string; body: string | null } {
  const title = `No one delivers ${what || "these"} to ${area || "this address"} yet`;
  if (pickup.length === 0) return { title, body: null };
  const shops = new Set(pickup.map((p) => p.owner?.username ?? p.name)).size;
  const kms = pickup
    .map((p) => (p.delivery?.km ? Number(p.delivery.km) : NaN))
    .filter(Number.isFinite);
  const closest = kms.length ? kmText(Math.min(...kms)) : null;
  const have = shops === 1 ? "1 shop nearby has them" : `${shops} shops nearby have them`;
  return {
    title,
    body: `${have} for self pickup.` + (closest ? ` The closest is ${closest} away.` : ""),
  };
}

/**
 * The product page's "how you get it" line for the chosen address (U6):
 * "Self pickup · doesn't deliver to Home", "Self pickup or delivery to Home
 * ₹110". With no answer for an address, null: the page keeps its own line.
 */
export function productHowLine(p: DeliveryFacts, addressName: string | null): string | null {
  if (!p.delivery || !addressName || !offersDelivery(p)) return null;
  return p.delivery.to_me
    ? `Self pickup or delivery to ${addressName}${p.delivery.fee ? ` ${formatCurrency(p.delivery.fee)}` : ""}`
    : `Self pickup · doesn't deliver to ${addressName}`;
}

/** `delivery` on a quote, as far as the reasons need it (API-CONTRACT §5.4). */
export interface QuoteDelivery {
  status: string;
  distance_km: string | null;
  /** B1 adds the courier's own reasons: outside its area, an item that can't go, worth too much, or an ID-match item. */
  reason?: "distance" | "area_off" | "courier_area" | "courier_item" | "courier_value" | "id_match" | null;
  area?: { pin: string; name: string } | null;
}

/** The area a quote refused, as the customer reads it: "Vesava", else its PIN. */
export const areaLabel = (area: QuoteDelivery["area"]) => area?.name || area?.pin || null;

/**
 * Why BK-02 can't deliver to this address (D11). An unknown status is "not
 * available": a newer server's answer must never read as a yes.
 */
export function deliveryReason(
  d: QuoteDelivery,
  shopName: string,
  maxKm: string | number | null | undefined
): string {
  // B1: the courier's own reasons come first, whatever the status: they say nothing about the shop's km.
  const courier = d.reason ? COURIER_REASONS[d.reason] : undefined;
  if (courier) return courier;
  if (d.status === "not_offered") return `${shopName} only offers self pickup.`;
  if (d.status === "too_far" && d.reason === "area_off") {
    const name = areaLabel(d.area);
    const where = d.area?.name && d.area.pin ? `${d.area.name} (${d.area.pin})` : name ?? "this area";
    const pickup = d.distance_km ? ` ${kmText(d.distance_km)} away` : "";
    return `${shopName} doesn't deliver to ${where}. You can pick it up${pickup}, or use another address.`;
  }
  if (d.status === "too_far") {
    const max = maxKm !== null && maxKm !== undefined && maxKm !== "" ? kmText(maxKm) : null;
    const away = d.distance_km ? ` This address is ${kmText(d.distance_km)} away.` : "";
    return max
      ? `${shopName} delivers up to ${max}.${away}`
      : `${shopName} doesn't deliver this far.${away}`;
  }
  return `${shopName} can't deliver to this address. You can pick it up, or use another address.`;
}

/**
 * Why the courier can't take it (b1-plan §2). The screen still offers "Continue with self pickup" under each. The ₹25,000
 * is the server's rule (`courier_on`, deposit ≤ ₹25k), said here because the reason carries no amount.
 */
const COURIER_REASONS: Partial<Record<NonNullable<QuoteDelivery["reason"]>, string>> = {
  courier_area: `The ${COURIER} doesn't reach this area yet. You can pick it up, or use another address.`,
  courier_item: "This item can't go by courier. You can pick it up from the shop.",
  courier_value: "Items above ₹25,000 can't go by courier. You can pick it up from the shop.",
  id_match: "Items that need an ID check at handover can't go by courier. You can pick it up from the shop.",
};

/** Whether another address could change the answer: not when the courier refused the item itself. */
export const addressMayHelp = (d: Pick<QuoteDelivery, "reason">) =>
  d.reason !== "courier_item" && d.reason !== "courier_value" && d.reason !== "id_match";
