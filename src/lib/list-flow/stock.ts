import { dayLabel } from "@/lib/shop";

/**
 * Quantity and worth, the two numbers every listing now carries (API-CONTRACT
 * OE-A/OE-E). Kept as typed text in the draft and parsed here, like the price.
 */

/** Five digits: a shop that stocks more than that lists it on the dashboard. */
export const MAX_QUANTITY_DIGITS = 5;

/** A whole number of units, at least 1; null for anything else. */
export function parseQuantity(text: string | null | undefined): number | null {
  const trimmed = (text ?? "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= 1 ? value : null;
}

/**
 * What the item would cost to replace, in rupees: more than zero, up to two
 * decimals (the column's own). Null for anything else.
 */
/**
 * The hint under "Worth". No ID check exists yet (decision T-41), so it cannot say the worth decides one: today the worth decides
 * whether the owner must check the customer's ID at the handover (an item above the server's line, or of a kind that always does).
 */
export const WORTH_HINT = "What it would cost to replace. It decides whether you must check the customer's ID at the handover.";

export function parseWorth(text: string | null | undefined): number | null {
  const trimmed = (text ?? "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
}

/** A worth the model suggested, as the text a field holds; null when it is no usable figure. */
export function suggestedWorth(value: unknown): string | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  const rupees = Math.round(n);
  // Under half a rupee rounds to nothing: no figure at all.
  return Number.isFinite(n) && rupees >= 1 ? String(rupees) : null;
}

interface Conflict {
  day?: string;
  in_use?: number;
  bookings?: string[];
  blocks?: unknown[];
}

/**
 * Why the quantity cannot go that low (`409 quantity_in_use`, details.conflicts):
 * the most units in use on any one day, which day, and what holds them.
 */
export function quantityInUseMessage(details: Record<string, unknown> | null | undefined): string {
  const conflicts = Array.isArray(details?.conflicts) ? (details?.conflicts as Conflict[]) : [];
  const worst = conflicts.reduce<Conflict | null>(
    (top, c) => ((c.in_use ?? 0) > (top?.in_use ?? 0) ? c : top),
    null
  );
  if (!worst || !worst.in_use) return "Some units are booked or blocked. Keep at least as many in stock as are in use.";
  const units = worst.in_use === 1 ? "1 unit is" : `${worst.in_use} units are`;
  const day = dayLabel(worst.day) ?? "one of the days";
  const bookings = (worst.bookings ?? []).filter(Boolean);
  const by = bookings.length
    ? ` (${bookings.join(", ")})`
    : (worst.blocks ?? []).length
    ? " (blocked)"
    : "";
  return `Keep at least ${worst.in_use} in stock. ${units} in use on ${day}${by}.`;
}
