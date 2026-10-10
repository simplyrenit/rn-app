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
}

export interface BankForm {
  holderName: string;
  accountNumber: string;
  confirmNumber: string;
  ifsc: string;
}

export type BankFormErrors = Partial<Record<keyof BankForm, string>>;

/** How long the screen waits on "Checking" before it offers "Check again". */
export const PENDING_RECHECK_MS = 60_000;

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

/**
 * Whether to offer "Check again" (`POST …/verify/`). The server allows it for a
 * check that failed with `provider_error`, or one that has been pending over ten
 * minutes; the screen cannot tell how long a pending check has been pending, so
 * it offers the button after it has watched one for `PENDING_RECHECK_MS` and
 * answers a 409 kindly.
 */
export function canCheckAgain(
  account: Pick<BankAccount, "status" | "failure_code">,
  waitedMs: number
): boolean {
  if (account.status === "failed") return account.failure_code === "provider_error";
  return account.status === "pending" && waitedMs >= PENDING_RECHECK_MS;
}
