import { ApiError } from "@/lib/api-error";
import type { AuthUser, OTPResponse, PhoneVerificationResponse } from "@/lib/types";

/**
 * Sign-in proofs (ENG-146; decisions T-14, T-17 and T-19, `tickets/ENG-95-api.md`
 * "Review round 1 of part 3a"). The backend no longer finishes a sign-up, or changes
 * an email, for anyone who only names the address or number: the person has to prove
 * it, and the proof travels as a token. Which call carries which token:
 *
 * | Call | Sends | Gets back |
 * |---|---|---|
 * | `GET /api/otp/` (the emailed code) | `email`, `otp` | for an account not finished: `proof_token` |
 * | `POST /api/phone-login/` | the Firebase ID token | for an account with no name: `proof_token` |
 * | `POST /api/signup/` | `proof_token` of whichever of the two came first | the account |
 * | `PATCH /api/users/{u}/` (email) | `email`, `proof_token` of `GET /api/otp/` for that address | the user |
 * | `PATCH /api/users/{u}/` (number) | `phone`, `phone_id_token` of the new number | the user |
 * | `POST /api/access/unlock/` | `id_token` of the CURRENT number | the unlock |
 *
 * `/api/otp/` is for email only: the app never sends a number there (it answers
 * 400 `phone_code_retired`). Plain functions, so the rules can be tested.
 */

/** What any call made too often is answered with (`429`): said plainly, and never repeated by the app by itself. */
export const TOO_MANY_TRIES = "Too many tries. Wait a few minutes.";

/**
 * A failed sign-in call as `{status, code, message}`: the endpoint's own sentence (`error` or `message`), or the
 * fallback. A call made too often is answered `429` (`{"detail": …}`): it says "Too many tries. Wait a few minutes."
 * whatever else it holds, and nothing repeats it by itself. `/api/otp/` also answers 400 `phone_code_retired` with its
 * own plain sentence for an old build that still sends a number there; that sentence is shown as it is.
 */
export function requestErrorFrom(
  error: { response?: { status?: number; data?: { code?: string; error?: string; message?: string } }; message?: string } | null | undefined,
  fallbackMessage: string
): { status?: number; code?: string; message: string } {
  const response = error?.response;
  if (response) {
    return {
      status: response.status,
      code: response.data?.code,
      message: response.status === 429 ? TOO_MANY_TRIES : response.data?.error || response.data?.message || fallbackMessage,
    };
  }
  return { message: error?.message || fallbackMessage };
}

/** The proof of an address or a number, or what to do instead. */
export type EmailProof =
  /** The code was right and this address is still to be finished: the token goes with the next call. */
  | { kind: "proof"; token: string }
  /** The address already has an account of its own: the answer holds its tokens, which are never stored. */
  | { kind: "has_account" }
  /** The code was not confirmed (no token came). */
  | { kind: "none" };

export function emailProof(answer: Pick<OTPResponse, "access" | "refresh" | "is_verified" | "proof_token"> | null | undefined): EmailProof {
  if (!answer) return { kind: "none" };
  if (answer.access || answer.refresh) return { kind: "has_account" };
  return answer.is_verified && answer.proof_token ? { kind: "proof", token: answer.proof_token } : { kind: "none" };
}

/** The proof of a number from `POST /api/phone-login/`: only an account with no name yet gets one. */
export function phoneProof(answer: Pick<PhoneVerificationResponse, "onboarding_required" | "proof_token"> | null | undefined): string | null {
  return answer?.onboarding_required && answer.proof_token ? answer.proof_token : null;
}

/**
 * The body of `POST /api/signup/`: the account's fields with the blanks left out, and the proof token of the
 * emailed code or of the phone check. Without one the server answers 403 `otp_verification_required`, which the
 * sign-up screen already turns into "verify again".
 */
export function signUpBody(user: Partial<AuthUser>): Record<string, unknown> {
  const accountType = user.account_type ?? "user";
  const body = {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    password: user.password,
    phone: user.phone,
    country: user.country,
    account_type: accountType,
    business_name: accountType === "merchant" ? user.business_name : undefined,
    coordinates: user.coordinates,
    date_of_birth: user.date_of_birth,
    email_verified: user.email_verified,
    proof_token: user.proof_token,
  };
  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

// ---- Changing the account's email ----------------------------------------------------------------------

/** Two spellings of one address: case and the spaces round it do not matter. */
export const sameEmail = (a: string | null | undefined, b: string | null | undefined) =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

/** The `PATCH /api/users/{username}/` body that changes the email: the new address and the proof of it. */
export function emailChangeBody(email: string, proofToken: string): { email: string; proof_token: string } {
  return { email: email.trim(), proof_token: proofToken };
}

/**
 * What to do next after a refused email change (the same shape as the number's, `phone-change.ts`):
 * `same` repeats only the save; `unlock` confirms the current number again first; `new_code` asks for a new
 * emailed code; `new_email` goes back to typing an address; `stop` is nothing the phone can do.
 */
export type EmailChangeNext = "same" | "unlock" | "new_code" | "new_email" | "stop";

export function emailChangeOutcome(error: ApiError | null): { text: string; next: EmailChangeNext } {
  if (!error || error.status === 0) {
    return { text: "We couldn't reach Renit. Press Done again: your code is kept for a few minutes.", next: "same" };
  }
  if (error.status === 429) return { text: TOO_MANY_TRIES, next: "stop" };
  switch (error.code) {
    case "email_taken":
      return { text: "Another Renit account already uses that email address. Use a different one.", next: "new_email" };
    case "fresh_code_required":
      return { text: "Confirm your current number first.", next: "unlock" };
    case "email_verification_required":
      // No token, a token for another address, or one older than an hour.
      return { text: "The new address has to be confirmed first. Send a code to it.", next: "new_code" };
    case "email_change_in_app":
      return { text: "An email address is changed from the Renit app on your phone.", next: "stop" };
    default:
      return { text: error.message ?? "We couldn't change your email. Try again.", next: "same" };
  }
}

/** Why the emailed code could not be sent or checked, in the words the sheet shows under the box. */
export function emailCodeText(failure: { status?: number; code?: string; message?: string } | null | undefined, step: "send" | "check"): string {
  if (failure?.status === 429) return TOO_MANY_TRIES;
  if (step === "check" && failure?.status === 401) return "That code didn't work. Send a new one and try again.";
  return failure?.message || (step === "send" ? "We couldn't send the code. Try again in a moment." : "We couldn't check that code. Try again.");
}

/** The words for an emailed code that belongs to an address that already has an account. */
export const EMAIL_HAS_ACCOUNT = "Another Renit account already uses that email address. Use a different one.";
