import type { KycStatus, NavigationUseType } from "@/lib/types";

/**
 * The one way into the customer's ID check from a booking (ENG-176, ENG-351).
 *
 * The check is rn-kyc's individual one (PAN and Aadhaar through DigiLocker, then a reviewer),
 * through the same three screens as a business's verification. With nothing on file, or a check
 * to take again, it starts at the explanation; with a check on its way it opens where it stands.
 * Both are pushed on top of the price screen (`source: "booking"`), so Back returns to it, and it
 * reads the quote again when it comes back into view: the dates are kept, and "ID check passed"
 * shows by itself.
 *
 * `status` is the customer's verification status, when it has been read.
 */
export function startIdCheck(navigation: NavigationUseType, status: KycStatus | undefined) {
  if (status === undefined || status === "none" || status === "rejected") {
    navigation.navigate("KycIntro", { source: "booking" });
  } else {
    navigation.navigate("KycStatus", { source: "booking" });
  }
}
