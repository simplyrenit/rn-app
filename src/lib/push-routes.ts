/**
 * Where a push takes the app (API-CONTRACT, Common › Push notifications).
 *
 * Every push carries `data` with at least `type`, `booking` (a number or null)
 * and `role` (`customer` or `owner`). The app routes on `type`, and a push is
 * only a nudge: the screen it opens reads the truth from the API.
 *
 * This is the table the router in `src/backend/notifications.ts` reads. It
 * holds the customer's types (ENG-173). Later sub-tasks add their cases here
 * and nowhere else: ENG-209 `ring` and `ring_ended`, ENG-210 the other owner
 * types, ENG-222 the day-of screens, ENG-252 the claim. A type this build does
 * not know is ignored, as the contract asks.
 */
export type PushRoute = { screen: "Booking"; number: string };

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

  // `role: "owner"`: ENG-209 and ENG-210 add the shop's cases here.
  return null;
}
