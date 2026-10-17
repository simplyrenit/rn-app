import { ApiError } from "@/lib/api-error";
import { e164 } from "@/lib/unlock";

/**
 * Changing the account's phone number (ENG-146, decision T-14). The backend takes
 * a new number only with proof, because sign-in and the bank account's code both
 * rest on it: the person first unlocks this phone's session with a code sent to the
 * CURRENT number (when the account has one), then confirms a code sent to the NEW
 * number and sends that Firebase ID token with it. The exact request is the last
 * section of `tickets/ENG-95-api.md`. Plain functions, so the rules can be tested.
 */

/** The account already has a number: the code step with it comes first. A first number is the PATCH alone. */
export const needsCurrentNumberCode = (current: string | null | undefined): boolean => e164(current) !== null;

/** The `PATCH /api/users/{username}/` body: the number as `+` and digits, and the ID token of the NEW number. */
export function phoneChangeBody(newNumber: string, idToken: string): { phone: string; phone_id_token: string } {
  return { phone: newNumber, phone_id_token: idToken };
}

/**
 * What to do next after a refused change:
 * - `same`: nothing is wrong with the proof; pressing Done again repeats only the save.
 * - `unlock`: the unlock ran out; confirm the current number again, then save.
 * - `new_code`: the code on the new number is spent or too old; send a new one.
 * - `new_number`: the new number cannot be used; type another.
 * - `stop`: nothing the phone can do.
 */
export type PhoneChangeNext = "same" | "unlock" | "new_code" | "new_number" | "stop";

export function phoneChangeOutcome(error: ApiError | null): { text: string; next: PhoneChangeNext } {
  if (!error || error.status === 0) {
    return { text: "We couldn't reach Renit. Press Done again: your code is kept for a few minutes.", next: "same" };
  }
  switch (error.code) {
    case "phone_taken":
      return { text: "Another Renit account already uses that number. Use a different number.", next: "new_number" };
    case "fresh_code_required":
      return { text: "Confirm your current number first.", next: "unlock" };
    case "verification_expired":
      // The new number's code was confirmed more than five minutes before the save (W2-1).
      return { text: "That code has expired. Send a new one.", next: "new_code" };
    case "code_invalid":
      return { text: "That code didn't work. Send a new one and try again.", next: "new_code" };
    case "phone_verification_required":
      return { text: "The new number has to be confirmed first. Send a code to it.", next: "new_code" };
    case "wrong_phone":
      return { text: "The code went to a different number from the one you typed. Check the number and send a new code.", next: "new_number" };
    case "phone_change_in_app":
      return { text: "A phone number is changed from the Renit app on your phone.", next: "stop" };
    case "verification_unavailable":
      return { text: "Checking numbers isn't available right now. Press Done again in a moment.", next: "same" };
    default:
      return { text: error.message ?? "We couldn't change your number. Try again.", next: "same" };
  }
}

// ---- The code step before a change of number or of email -----------------------------------------

/**
 * What to do about the code to the CURRENT number (the unlock), for a change of number or of email. `force` is a
 * save the server has just refused with 403 `fresh_code_required`: then the shortcut is never taken, whatever this
 * phone believes, because taking it is a save that is refused again, and again (review app-6 r1 #2).
 *  - `carry_on`: no code is needed first. `ask_server`: read the unlock state.
 */
export function unlockStart(input: { force: boolean; believesNumber: boolean }): "carry_on" | "ask_server" {
  return !input.force && !input.believesNumber ? "carry_on" : "ask_server";
}

/**
 * After the server's unlock state is read: `carry_on` (already unlocked, and not forced), `stale_copy` (the server has
 * a number this phone's copy of the account does not: refresh it and ask the person to try again, since the code
 * cannot be sent to a number the phone does not know), or `open_sheet` (send the code).
 */
export function unlockNext(input: { force: boolean; believesNumber: boolean; unlocked: boolean }): "carry_on" | "stale_copy" | "open_sheet" {
  if (!input.force && input.unlocked) return "carry_on";
  return input.believesNumber ? "open_sheet" : "stale_copy";
}

/**
 * The server says the account has no number (`phone_required`): a change that was not forced carries on (a first
 * number needs no code first); one that was forced because the server wanted an unlock says what is wrong instead of
 * saving again.
 */
export const noNumberStep = (force: boolean): "carry_on" | "tell" => (force ? "tell" : "carry_on");
