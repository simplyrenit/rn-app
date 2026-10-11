import type { Side } from "@/lib/capture";
import { Ring, RingEndPush, parseRing, parseRingEnd } from "@/lib/shop-ring";

/**
 * Where a push takes the app (API-CONTRACT, Common › Push notifications).
 *
 * Every push carries `data` with at least `type`, `booking` (a number or null)
 * and `role` (`customer` or `owner`). The app routes on `type`, and a push is
 * only a nudge: the screen it opens reads the truth from the API.
 *
 * This is the table the router in `src/backend/notifications.ts` reads. It
 * holds the customer's types (ENG-173), the ring (ENG-209) and the shop's other
 * types (ENG-210), the deposit and the day-of screens (ENG-222, ENG-223) and the
 * claim (ENG-252, ENG-253). A type this build does not know is ignored, as the
 * contract asks.
 */
export type PushRoute =
  /** The customer's booking, at whatever stage the server says it is in. */
  | { screen: "Booking"; number: string }
  /** Pay the deposit (BK-13, ENG-222). The screen says "Deposit paid" if it already is. */
  | { screen: "BookingDeposit"; number: string }
  /**
   * The shop's ring (ENG-209). `ring` is the request the push carried, so the screen
   * can show it before the server has answered; `ended` is a `ring_ended`, which says
   * that the request is over, on this phone or on another device, and `end` is what it
   * says about it (the session that answered, to compare with this phone's own).
   */
  | { screen: "ShopRing"; number: string; ring: Ring | null; ended: boolean; end: RingEndPush | null }
  /** The shop's page for a booking (ENG-210). */
  | { screen: "ShopBooking"; number: string }
  /** The shop's handover (ENG-223): the customer tapped a preset button on the day. */
  | { screen: "ShopHandover"; number: string }
  /**
   * A claim was raised, replied to or decided (`claim`: its id). The screen reads the claim from the API;
   * `number` is its booking, for the screens behind it. For the shop it is read only: replies are made on
   * the dashboard. A `claim` push with no id opens the booking it is about.
   */
  | { screen: "Claim"; id: number; number: string; role: Side }
  /** The shop's Today, for "Closed after two missed requests". */
  | { screen: "ShopToday" }
  /** The bank check passed or failed, the account was changed, or a payout waits for it. */
  | { screen: "BankAccount" }
  /** The check on a publish finished. */
  | { screen: "myProducts" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The claim's id from a push: a whole number, sent as a number or as text. */
function claimId(value: unknown): number | null {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
}

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
      // The day of the handover: `Booking` draws it while the stage is `ready` (ENG-222).
      // A preset tap from the shop arrives as `window` with `what: "status"` and lands there too.
      case "ready":
        // One screen for all of them: `Booking` draws whatever the stage calls for.
        return { screen: "Booking", number };
      // The claim itself: where it stands, the reply, what was decided (ENG-252).
      case "claim": {
        const id = claimId(data.claim);
        return id ? { screen: "Claim", id, number, role: "customer" } : { screen: "Booking", number };
      }
      // Pay the deposit (ENG-222).
      case "deposit_ask":
      case "deposit_reminder":
        return { screen: "BookingDeposit", number };
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
        return ringNumber ? { screen: "ShopRing", number: ringNumber, ring, ended: false, end: null } : null;
      }
      case "ring_ended":
        return number ? { screen: "ShopRing", number, ring: null, ended: true, end: parseRingEnd(data) } : null;
    }
  }

  if (data.role === "owner") {
    switch (data.type) {
      // A preset tap on the day ("On my way", "I am here"): the handover screen, where the
      // shop answers it. Every other word about the window is the booking's.
      case "window":
        if (!number) return null;
        return data.what === "status" ? { screen: "ShopHandover", number } : { screen: "ShopBooking", number };
      // The booking, as it now stands.
      case "lapsed":
      case "confirmed":
      case "deposit_paid":
      case "cancelled":
      case "started":
      case "returned":
      case "closed":
        return number ? { screen: "ShopBooking", number } : null;
      // The claim, read only on the phone: a customer's reply or Renit's decision (ENG-253).
      case "claim": {
        if (!number) return null;
        const id = claimId(data.claim);
        return id ? { screen: "Claim", id, number, role: "owner" } : { screen: "ShopBooking", number };
      }
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
