/**
 * The owner's bank account on the phone (API-CONTRACT OE-D; PAYMENTS-DESIGN 1.6).
 * Plain functions so the checks and the wording can be tested.
 */

export type BankStatus = "none" | "pending" | "verified" | "failed";

/** `GET /api/shop/bank-account/`. Every field but `status` is null while `status` is "none". */
export interface BankAccount {
  status: BankStatus;
  bank_name: string | null;
  /** The full number is never returned. */
  account_last4: string | null;
  ifsc: string | null;
  holder_name: string | null;
  name_at_bank: string | null;
  name_match: string | null;
  /** `invalid_account`, `invalid_ifsc`, `name_mismatch`, `account_blocked`, `provider_error`. */
  failure_code: string | null;
  verified_at: string | null;
  /** The owner has a payout waiting for the account to be verified. */
  payouts_paused: boolean;
  /**
   * `POST …/verify/` would be accepted now: the check failed with `provider_error`,
   * or has been pending over ten minutes (rn-pay's rule). "Check again" is offered
   * only while this is true, so nobody is asked for a code and then refused.
   */
  can_verify_again: boolean;
}

export interface BankForm {
  holderName: string;
  accountNumber: string;
  confirmNumber: string;
  ifsc: string;
}

export type BankFormErrors = Partial<Record<keyof BankForm, string>>;

export const cleanAccountNumber = (value: string) => value.replace(/\D/g, "").slice(0, 18);

/** Upper case, letters and digits only, at most 11: how an IFSC is written. */
export const cleanIfsc = (value: string) =>
  value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 11);

/**
 * The same limits rn-pay enforces (PAYMENTS-DESIGN B1): the account number is
 * 9 to 18 digits, the IFSC is four letters, a zero, then six letters or digits,
 * the name 2 to 100 characters. The number is typed twice because a wrong digit
 * sends the ₹1 check to a stranger.
 */
export function validateBankForm(form: BankForm): BankFormErrors {
  const errors: BankFormErrors = {};
  const name = form.holderName.trim();
  if (name.length < 2) errors.holderName = "Enter the name on the account";
  else if (name.length > 100) errors.holderName = "Use 100 characters or fewer";

  if (!/^\d{9,18}$/.test(form.accountNumber)) {
    errors.accountNumber = "Enter the account number, 9 to 18 digits";
  }
  if (form.confirmNumber !== form.accountNumber) {
    errors.confirmNumber = "The two account numbers don't match";
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
    errors.ifsc = "Enter the 11-character IFSC code, like HDFC0001234";
  }
  return errors;
}

/** The server's field names (`account_number`, `holder_name`) as this form's. */
export function bankFieldErrors(server: Record<string, string>): BankFormErrors {
  const errors: BankFormErrors = {};
  if (server.holder_name) errors.holderName = server.holder_name;
  if (server.account_number) errors.accountNumber = server.account_number;
  if (server.ifsc) errors.ifsc = server.ifsc;
  return errors;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** "3 Oct": the calendar day in India of an ISO instant. Null when it cannot be read. */
export function istDayLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return null;
  const day = new Date(at + IST_OFFSET_MS);
  return `${day.getUTCDate()} ${MONTHS[day.getUTCMonth()]}`;
}

/** The chip on a verified account: "Verified 3 Oct". */
export function verifiedChip(account: Pick<BankAccount, "verified_at">): string {
  const day = istDayLabel(account.verified_at);
  return day ? `Verified ${day}` : "Verified";
}

/** The card's title: "HDFC Bank ··· 4471". */
export function accountTitle(account: Pick<BankAccount, "bank_name" | "account_last4">): string {
  const bank = account.bank_name?.trim() || "Bank account";
  return account.account_last4 ? `${bank} ··· ${account.account_last4}` : bank;
}

/** Why a check failed, in words an owner can act on. */
export function failureMessage(
  account: Pick<BankAccount, "failure_code" | "name_at_bank" | "holder_name">
): string {
  switch (account.failure_code) {
    case "invalid_account":
      return "The bank could not find this account. Check the account number and try again.";
    case "invalid_ifsc":
      return "The bank did not recognise this IFSC code. Check it and try again.";
    case "name_mismatch": {
      const atBank = account.name_at_bank?.trim();
      const typed = account.holder_name?.trim();
      return atBank && typed
        ? `The bank has this account under “${atBank}”, not “${typed}”. Use the name exactly as the bank has it.`
        : "The name does not match the one the bank holds. Use the name exactly as the bank has it.";
    }
    case "account_blocked":
      return "This account can't receive payments. Try a different account.";
    case "provider_error":
      return "We couldn't reach the bank to check this account. Try the check again in a moment.";
    default:
      return "The check did not pass. Try again, or use different details.";
  }
}

/** 409 `payments_error`: rn-pay refused a bank account call for a reason the app has no word for. Nothing was changed. */
export const PAYMENTS_REFUSED = "Payments did not accept this just now. Nothing was changed. Try again in a moment.";

/** "1 hour", "5 minutes": how long until the next try is allowed. */
export function waitText(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 60) return "a minute";
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} minutes`;
  const hours = Math.ceil(seconds / 3600);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

export function attemptLimitMessage(retryAfterSeconds: number | null | undefined): string {
  return retryAfterSeconds
    ? `Too many tries. Try again in ${waitText(retryAfterSeconds)}.`
    : "Too many tries. Try again later.";
}

/** Whether to offer "Check again": only while the server says a re-check would be accepted. */
export function canCheckAgain(account: Pick<BankAccount, "can_verify_again">): boolean {
  return account.can_verify_again === true;
}

// ---- One `submit_id` for one set of details ----------------------------------------

export interface SubmitKey {
  id: string;
  /** The details the id was made for. */
  content: string;
}

/**
 * The idempotency key for the add/change call: made once for one set of details and
 * kept until the form's content changes or the server answers (API-CONTRACT OE-D). A
 * second press after a lost answer sends the same key, so it cannot start a second
 * ₹1 check or use up another of the three checks a day.
 */
export function submitKeyFor(
  current: SubmitKey | null,
  form: Pick<BankForm, "holderName" | "accountNumber" | "ifsc">,
  makeId: () => string
): SubmitKey {
  const content = `${form.holderName.trim()}|${form.accountNumber}|${form.ifsc}`;
  return current && current.content === content ? current : { id: makeId(), content };
}

/**
 * Whether the server's failure settles the key, so the next press is a new one. Any
 * answer does, bar the ones where the call may still have gone through: no answer
 * at all, and a 5xx other than `payments_unavailable` (which says nothing was saved).
 */
export function answerSettlesKey(failure: { status: number; code: string | null } | null): boolean {
  if (!failure || failure.status === 0) return false;
  if (failure.status >= 500) return failure.code === "payments_unavailable";
  return true;
}

/** A name as the bank compares it: no case, no doubled or edge spaces. */
const nameKey = (name: string | null | undefined) => (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Whether an earlier press with these details got through although its answer was
 * lost: the account the server now holds ends in the same four digits, has the same
 * IFSC and the same holder name. The name counts because a check that failed with
 * `name_mismatch` leaves exactly this account behind, and the owner's next press
 * (the same digits, the name as the bank has it) must go out, not be read as the old
 * press. A server answer without a name cannot confirm anything, so it is "not landed":
 * the press is sent again under the same `submit_id`, which the server repeats safely.
 */
export function landed(
  account: Pick<BankAccount, "status" | "account_last4" | "ifsc" | "holder_name"> | null | undefined,
  form: Pick<BankForm, "holderName" | "accountNumber" | "ifsc">
): boolean {
  if (!account || account.status === "none") return false;
  return (
    account.account_last4 === form.accountNumber.slice(-4) &&
    (account.ifsc ?? "").toUpperCase() === form.ifsc.toUpperCase() &&
    nameKey(account.holder_name) !== "" &&
    nameKey(account.holder_name) === nameKey(form.holderName)
  );
}

// ---- Reading the account failed ---------------------------------------------------------------

export interface BankLoadProblem {
  /** `code`: the server wants a fresh code first. `sign_in`: this sign-in cannot be used. `network`/`server`: try again. */
  kind: "network" | "server" | "code" | "sign_in";
  title: string;
  body: string;
  /** The button's label, and what it does. */
  action: { label: string; does: "retry" | "code" } | null;
}

/**
 * What to tell a person whose bank account did not load, by what the server answered. "Check your connection" is for a
 * failure that really is the connection (no answer at all); when the server asked for something else, that is what the
 * person is told. A phone's session is let read the account without a code, so a 403 `fresh_code_required` on a read means
 * this sign-in is not known as a phone's (one from before the sessions existed): the code step is offered, the same as
 * for adding an account, and if the server cannot unlock this sign-in the sheet says to sign in again (`unlockErrorMessage`).
 */
export function bankLoadProblem(error: { status: number; code: string | null; message?: string | null } | null): BankLoadProblem {
  if (error && error.code === "fresh_code_required") {
    return {
      kind: "code",
      title: "Confirm it's you first",
      body: "Renit sends a code to your shop's number before it shows where you're paid.",
      action: { label: "Send me a code", does: "code" },
    };
  }
  if (error && (error.status === 401 || error.code === "not_authenticated")) {
    return {
      kind: "sign_in",
      title: "Sign in again",
      body: "This phone's sign-in can no longer be used for your bank account. Go to your profile, log out, and sign in again.",
      action: null,
    };
  }
  if (error && error.status >= 500) {
    return {
      kind: "server",
      title: "Couldn't load your bank account",
      body: "Something went wrong on our side. Try again in a moment.",
      action: { label: "Try again", does: "retry" },
    };
  }
  if (error && error.status >= 400) {
    return {
      kind: "server",
      title: "Couldn't load your bank account",
      body: error.message?.trim() || "Renit couldn't show it just now. Try again in a moment.",
      action: { label: "Try again", does: "retry" },
    };
  }
  return {
    kind: "network",
    title: "Couldn't load your bank account",
    body: "Check your connection and try again.",
    action: { label: "Try again", does: "retry" },
  };
}

/** Reading the account is tried again only after a failure that may pass: not after an answer that was a refusal (4xx). */
export function retryBankRead(failures: number, error: { status: number } | null): boolean {
  if (error && error.status >= 400 && error.status < 500) return false;
  return failures < 2;
}
