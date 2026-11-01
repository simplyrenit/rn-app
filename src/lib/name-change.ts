import type { ApiError } from "@/lib/api-error";
import type { KycStatus } from "@/lib/types";

/**
 * Why the name cannot be changed: under the Full name row while the account is verified, and when
 * a save is refused. rn-api refuses a changed name with `400 locked_while_verified` while the
 * account is verified or being verified (D-17, D-43: the owner matches this name at handover).
 */
export const NAME_LOCKED = "Your name is locked while you're verified. Contact support to change it.";

/** The same lock while a verification case is open: the person is not verified (yet). */
export const NAME_LOCKED_IN_PROGRESS =
  "Your name can't be changed while your verification is in progress. Contact support to change it.";

/**
 * Why the name cannot be changed here, or null when it can. Mirrors rn-api's `kyc_locked`
 * (`business_verified`, or `kyc_status` open), read from what the app already holds: the profile's
 * badge and the cached verification status, a business's check or anyone else's ID check (ENG-351).
 */
export function nameLockNote(businessVerified: boolean | undefined, kycStatus: KycStatus | undefined) {
  if (businessVerified || kycStatus === "verified") return NAME_LOCKED;
  if (kycStatus === "pending" || kycStatus === "action_required" || kycStatus === "in_review") {
    return NAME_LOCKED_IN_PROGRESS;
  }
  return null;
}

/**
 * What a failed name save says, in the sheet (a toast is drawn behind it), and whether the name
 * that was typed goes back to the saved one: it does when the server will never take it.
 */
export function nameSaveOutcome(error: ApiError | null): { text: string; restore: boolean } {
  if (error?.code === "locked_while_verified") return { text: error.message ?? NAME_LOCKED, restore: true };
  if (!error || error.status === 0) {
    return { text: "We couldn't reach Renit. Check your connection and try again.", restore: false };
  }
  return { text: error.message ?? "We couldn't save your name. Try again.", restore: false };
}
