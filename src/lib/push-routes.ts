import { Ring, parseRing } from "@/lib/shop-ring";

/**
 * Where a push takes the app (API-CONTRACT, Common › Push notifications).
 *
 * Every push carries `data` with at least `type`, `booking` (a number or null)
 * and `role` (`customer` or `owner`). The app routes on `type`, and a push is
 * only a nudge: the screen it opens reads the truth from the API.
 *
 * This is the table the router in `src/backend/notifications.ts` reads. It
 * holds the customer's types (ENG-173), the ring (ENG-209) and the shop's other
 * types (ENG-210). Later sub-tasks add
 * their cases here and nowhere else: ENG-222 the day-of screens, ENG-252 the claim. A type this build does not know is
 * ignored, as the contract asks.
 */
export type PushRoute =
  /** The customer's booking, at whatever stage the server says it is in. */
  | { screen: "Booking"; number: string }
  /**
   * The shop's ring (ENG-209). `ring` is the request the push carried, so the screen
   * can show it before the server has answered; `ended` is a `ring_ended`, which only
   * says that the request is over, on this phone or on another device.
   */
  | { screen: "ShopRing"; number: string; ring: Ring | null; ended: boolean }
  /** The shop's page for a booking (ENG-210). */
  | { screen: "ShopBooking"; number: string }
  /** The shop's Today, for "Closed after two missed requests". */
  | { screen: "ShopToday" }
  /** The bank check passed or failed, the account was changed, or a payout waits for it. */
  | { screen: "BankAccount" }
  /** The check on a publish finished. */
  | { screen: "myProducts" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function pushRoute(data: unknown): PushRoute | null {
  if (!isRecord(data) || typeof data.type !== "string") return null;
  const number = typeof data.booking === "string" && data.booking ? data.booking : null;

  if (data.role === "customer" && number) {
    switch (data.type) {
      // Pay the rent.
      case "accepted":
      case "rent_reminder":
      // The outcome screen: other dates, other owners.
      case "refused":
      case "no_answer":
      // The booking, as it now stands.
      case "lapsed":
      case "confirmed":
      case "window":
      case "cancelled":
      case "started":
      case "returned":
      case "closed":
      case "late":
      // The booking's payments list.
      case "refund":
      // Pay the deposit and the day of the handover: ENG-222 points these at its screens.
      case "deposit_ask":
      case "deposit_reminder":
      case "ready":
      // The claim: ENG-252 points this at it. Until then, the booking it is about.
      case "claim":
        // One screen for all of them: `Booking` draws whatever the stage calls for.
        return { screen: "Booking", number };
      default:
        return null;
    }
  }

  // The shop's own pushes. `ring` and `ring_ended` exist only for owners, so they are
  // routed unless the push says it is the customer's copy: a ring that is lost because a
  // field was left out is the one failure that costs the shop a booking and a mark.
  if (data.role !== "customer") {
    switch (data.type) {
      case "ring": {
        const ring = parseRing(data.ring);
        const ringNumber = number ?? ring?.number ?? null;
        return ringNumber ? { screen: "ShopRing", number: ringNumber, ring, ended: false } : null;
      }
      case "ring_ended":
        return number ? { screen: "ShopRing", number, ring: null, ended: true } : null;
    }
  }

  if (data.role === "owner") {
    switch (data.type) {
      // The booking, as it now stands.
      case "lapsed":
      case "confirmed":
      case "window":
      case "deposit_paid":
      case "cancelled":
      case "started":
      case "returned":
      case "closed":
      // The claim: ENG-252 points this at it. Until then, the booking it is about.
      case "claim":
        return number ? { screen: "ShopBooking", number } : null;
      case "shop_closed":
        return { screen: "ShopToday" };
      case "bank_account":
        return { screen: "BankAccount" };
      case "product_checked":
        return { screen: "myProducts" };
      // `payout` is the dashboard's Earnings page: the phone has no screen for it.
      default:
        return null;
    }
  }

  return null;
}
