import { ApiError } from "@/lib/api-error";

/**
 * Deleting the account (T-20). While a person has anything open (a booking not finished, a deposit held, a refund on
 * its way, a payout to come or to recover, an open report) `DELETE /api/users/{username}/` answers 409
 * `open_bookings` with `details.open`, a list of what is open, each with a sentence ready to show. The person stays
 * signed in and is told what is open; only a deleted account signs out. Plain functions, so the rules can be tested.
 */

export interface OpenItem {
  /** `booking`, `deposit`, `refund`, `payout` or `claim`. */
  kind: string;
  /** The booking's number; null for an amount still to be recovered from payouts. */
  booking: string | null;
  role: "customer" | "owner";
  /** Ready to show: "Sony PS5, Sat 7 to Mon 9 Nov: not finished". */
  text: string;
  /** The claim's id, for an open report. */
  claim?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** What `details.open` held, read the careful way: a row with no sentence is left out, never guessed. */
export function openItems(open: unknown): OpenItem[] {
  if (!Array.isArray(open)) return [];
  return open.flatMap((row): OpenItem[] => {
    if (!isRecord(row) || typeof row.text !== "string" || !row.text.trim()) return [];
    return [
      {
        kind: typeof row.kind === "string" ? row.kind : "booking",
        booking: typeof row.booking === "string" ? row.booking : null,
        role: row.role === "owner" ? "owner" : "customer",
        text: row.text,
        ...(typeof row.claim === "number" ? { claim: row.claim } : {}),
      },
    ];
  });
}

const KIND_LABEL: Record<string, string> = {
  booking: "Booking",
  deposit: "Deposit",
  refund: "Refund",
  payout: "Payout",
  claim: "Report",
};

/** The small label over a row: what kind of thing is open. */
export const itemLabel = (item: Pick<OpenItem, "kind" | "role">): string =>
  `${KIND_LABEL[item.kind] ?? "Open"} · ${item.role === "owner" ? "as the shop" : "as the customer"}`;

/** What the delete screen shows when the account was not closed: why, in words, and what is open. */
export interface DeleteProblem {
  text: string;
  items: OpenItem[];
  /** True when something is open: nothing the person does here changes it, so Delete is not offered again. */
  blocked: boolean;
}

export function deleteProblem(error: ApiError | null): DeleteProblem {
  if (error?.code === "open_bookings") {
    return {
      text: error.message ?? "Your account can be closed once everything you have open with Renit is finished.",
      items: openItems(error.details?.open),
      blocked: true,
    };
  }
  if (!error || error.status === 0) {
    return { text: "We couldn't reach Renit, so your account was not deleted. Check your connection and try again.", items: [], blocked: false };
  }
  return { text: error.message ?? "We couldn't delete your account. You are still signed in. Try again.", items: [], blocked: false };
}
