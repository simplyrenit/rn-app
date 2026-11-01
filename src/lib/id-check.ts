import { StackActions } from "@react-navigation/native";

import type { KycStatus, NavigationUseType } from "@/lib/types";

/**
 * The one way into the customer's ID check from a booking (ENG-176, ENG-351).
 *
 * The check is rn-kyc's individual one (PAN and Aadhaar through DigiLocker, then a reviewer),
 * through the same three screens as a business's verification. With nothing on file it starts at
 * the explanation; with a check on file it opens where it stands, which for a failed check is its
 * whole reason and the right way on (try again, or support for a duplicate).
 * Both are pushed on top of the price screen (`source: "booking"`), so Back returns to it, and it
 * reads the quote again when it comes back into view: the dates are kept, and "ID check passed"
 * shows by itself.
 *
 * Pushed, not navigated: `navigate` would jump back to an ID check screen already in the stack
 * and drop the price screen above it, with its product and dates.
 *
 * `status` is the customer's verification status, when it has been read.
 */
export function startIdCheck(navigation: NavigationUseType, status: KycStatus | undefined) {
  // A second tap while the first screen opens would push it twice.
  const routes = navigation.getState?.()?.routes ?? [];
  const top = routes[routes.length - 1]?.name;
  if (top?.startsWith("Kyc")) return;
  if (status === undefined || status === "none") {
    navigation.dispatch(StackActions.push("KycIntro", { source: "booking" }));
  } else {
    navigation.dispatch(StackActions.push("KycStatus", { source: "booking" }));
  }
}
