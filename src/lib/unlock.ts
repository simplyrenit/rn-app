/**
 * The code step before the owner's bank account is added or changed (T-10,
 * API-CONTRACT `/api/access/unlock/`): the shop's number is verified again with
 * Firebase phone sign-in and the new ID token unlocks this phone's session for
 * 30 minutes. Plain functions, so the rules can be tested.
 */

/** `GET` and `POST /api/access/unlock/`. */
export interface UnlockState {
  unlocked: boolean;
  /** An instant, or null while locked. */
  unlocked_until: string | null;
  minutes: number;
  /** "··· ··· 4471": where the code goes. */
  phone_masked: string;
}

/** True while the unlock has not run out. Judged here too, so a stale answer is not trusted. */
export function isUnlocked(state: Pick<UnlockState, "unlocked" | "unlocked_until">, now: Date = new Date()): boolean {
  if (!state.unlocked || !state.unlocked_until) return false;
  const until = new Date(state.unlocked_until).getTime();
  return Number.isFinite(until) && until > now.getTime();
}

/**
 * The number as Firebase wants it, `+` and digits. The account keeps it as typed
 * ("+91-9876543210" from the profile sheet), and a number saved without a country
 * code is read as an Indian one: the app lists and rents in India only. Null when
 * there are too few digits to be a number.
 */
export function e164(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (raw.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  // "91 98765 43210" or "09876543210" without a plus: the country code is there or a leading 0.
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  return null;
}

/** The six digits an SMS code is made of. */
export function isCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

/** What went wrong confirming the code, by the server's `code`. */
export function unlockErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case "verification_expired":
      // The code was confirmed more than five minutes before the unlock call (W2-1). The contract's words.
      return "That code has expired. Send a new one.";
    case "code_invalid":
      return "That code didn't work. Send a new one and try again.";
    case "wrong_phone":
      return "The code went to a number that isn't the one on your account.";
    case "phone_required":
      return "Your account has no phone number yet. Add and verify one in your profile first.";
    case "unlock_unavailable":
      return "Confirming your number isn't available right now. Try again later.";
    default:
      return "We couldn't confirm that code. Check your connection and try again.";
  }
}

/** "Send again in 0:24": the line under the code boxes while a new code is not yet allowed. */
export function resendLabel(secondsLeft: number): string {
  const total = Math.max(0, Math.ceil(secondsLeft));
  return `Send again in ${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Seconds before another code can be asked for, as the frame's countdown starts. */
export const RESEND_SECONDS = 30;
