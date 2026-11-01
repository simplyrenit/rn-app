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
 * types (ENG-210), the deposit and the day-of screens (ENG-222, ENG-223), the
 * claim (ENG-252, ENG-253) and monthly billing (ENG-282). A type this build does
 * not know is ignored, as the contract asks.
 */
export type PushRoute =
  /** A shop (its owner's username) or a product (its name), from a shop page link (ENG-344). */
  | { screen: "UserDetail"; id: string }
  | { screen: "ProductDetail"; id: string }
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
  /**
   * The shop's handover (ENG-223): the customer tapped a preset button on the day. B1: a step of the courier's
   * outbound leg (Packed, the rider, the pickup) lands here too.
   */
  | { screen: "ShopHandover"; number: string }
  /** B1: a step of the courier's return leg ("Item arriving", back at the shop). */
  | { screen: "ShopReturn"; number: string }
  /**
   * A claim was raised, replied to or decided (`claim`: its id). The screen reads the claim from the API;
   * `number` is its booking, for the screens behind it. Either side opens the same screen and the side the claim
   * is against replies there, once (an owner who is not a merchant has no dashboard). A `claim` push with no id
   * opens the booking it is about.
   */
  | { screen: "Claim"; id: number; number: string; role: Side }
  /** The shop's Today, for "Closed after two missed requests". */
  | { screen: "ShopToday" }
  /** The bank check passed or failed, the account was changed, or a payout waits for it. */
  | { screen: "BankAccount" }
  /** The check on a publish finished. */
  | { screen: "myProducts" }
  /** The admin approved or rejected the merchant (ENG-271): the Profile tab, whose status card shows which. */
  | { screen: "Profile" }
  /** Business verification moved on (ENG-72). The screen reads the status; nothing in the push is shown. */
  | { screen: "KycStatus" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The claim's id from a push: a whole number, sent as a number or as text. */
function claimId(value: unknown): number | null {
  const id = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
}

/** The courier's outbound steps the shop acts on, from its handover screen (rn-api `courier.OWNER_WORDS`). */
const OUTBOUND = ["packed", "dispatching", "set_rider", "picked_up", "reattempt"];

/**
 * B1, an owner's courier push (`window` with `what: "courier"`, `courier`: the step): the return leg opens the return,
 * an outbound step the handover, anything else (a banner, a failed door, a step this build does not know) the booking.
 */
function courierRoute(step: unknown, number: string): PushRoute {
  if (typeof step !== "string") return { screen: "ShopBooking", number };
  if (step.startsWith("return_") || step === "at_shop" || step === "self_return") return { screen: "ShopReturn", number };
  return OUTBOUND.includes(step) ? { screen: "ShopHandover", number } : { screen: "ShopBooking", number };
}

export function pushRoute(data: unknown): PushRoute | null {
  if (!isRecord(data) || typeof data.type !== "string") return null;
  const number = typeof data.booking === "string" && data.booking ? data.booking : null;

  // Sent by the KYC sweep with no booking, and only to the merchant it is about.
  if (data.type === "kyc_status") return { screen: "KycStatus" };

  // B1: a desk alarm, pushed to Renit's desk staff (ENG-303). The notification itself is the message; the booking is
  // not theirs to open on the phone (the server marks the push `customer` for anyone who is not its owner), so a tap
  // opens nothing. The desk acts from the "Courier legs" board.
  if (data.type === "desk_alert") return null;

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
      // Before the return is due (ENG-347): the rental screen, where Extend is.
      case "return_reminder":
      case "return_due":
      // Monthly billing (ENG-282): a month's link, its due day, its grace, its lapse, and ending early. The rental
      // screen shows the schedule and the overdue alert, and opens Rent due from there.
      case "period_link":
      case "period_due":
      case "period_overdue":
      case "period_lapsed":
      case "end_early":
      // The desk reopened a rental that lapsed, once its month was paid.
      case "period_reopened":
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
        if (data.what === "courier") return courierRoute(data.courier, number);
        return data.what === "status" ? { screen: "ShopHandover", number } : { screen: "ShopBooking", number };
      // The booking, as it now stands.
      case "lapsed":
      case "confirmed":
      case "deposit_paid":
      case "cancelled":
      case "started":
      case "returned":
      case "closed":
      // Monthly billing (ENG-282): a month paid, a month overdue (Renit's desk is following up), one that lapsed, and the
      // customer ending early.
      case "period_paid":
      case "owner_period_overdue":
      case "period_lapsed":
      case "owner_end_early":
        return number ? { screen: "ShopBooking", number } : null;
      // The claim: a customer's reply or Renit's decision, where the shop may reply too (ENG-253).
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
      case "merchant_approval":
        return { screen: "Profile" };
      // `payout` is the dashboard's Earnings page: the phone has no screen for it.
      default:
        return null;
    }
  }

  return null;
}
