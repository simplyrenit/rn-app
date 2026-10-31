/**
 * Business customers (ENG-352): what the app says about a GSTIN and a booking's bill-to.
 *
 * A GSTIN holds its owner's PAN (characters 3-12), so the app shows it only where the customer
 * needs to recognise it, and never sends it to analytics.
 */
import type { ApiError } from "@/lib/api-error";

/** The saved GSTIN, as `GET /api/business/gstin/` answers it. */
export interface BuyerGstin {
  gstin: string;
  legal_name: string;
  trade_name: string;
  address: string;
  pincode: string;
  state_code: string;
  state: string;
  checked_at: string;
}

/** What a booking is billed to: a copy taken at Book now that never changes. */
export interface BillTo {
  gstin: string;
  legal_name: string;
  address: string;
  pincode: string;
  state_code: string;
  state: string;
  place_of_supply: string;
}

/** "27ABCDE…1Z5": enough to recognise it, without the PAN in the middle. */
export const shortGstin = (gstin: string) => `${gstin.slice(0, 7)}…${gstin.slice(-3)}`;

/** One line for each refusal of `POST /api/business/gstin/`; the server's own sentence otherwise. */
export function gstinErrorText(failure: ApiError | null): string {
  switch (failure?.code) {
    case "validation_error":
      return "Enter a valid 15-character GSTIN, like 22ABCDE1234F1Z5.";
    case "gstin_not_found":
      return "We couldn't find this GSTIN on the GST register. Check it and try again.";
    case "gstin_inactive": {
      const status = failure.details?.status;
      return status === "cancelled" || status === "suspended"
        ? `This GSTIN is ${status} on the GST register, so it can't be billed.`
        : "This GSTIN isn't active on the GST register, so it can't be billed.";
    }
    case "gstin_no_address":
      return "We couldn't read the registered name and address. Try again later.";
    case "rate_limited":
    case "retry_limit":
      return "Too many GSTIN checks for now. Try again later.";
    case "customers_only":
      return "Business billing is for customer accounts.";
    case "provider_unavailable":
    case "kyc_unavailable":
      return "We can't check GSTINs right now. Try again in a few minutes.";
  }
  if (!failure || failure.status === 0) return "No connection. Check your internet and try again.";
  return failure.message ?? "Something went wrong. Try again.";
}

/**
 * The Bill to row on Review and book: hidden unless the customer bills as a business; with a
 * saved GSTIN a switch, on unless they turned it off; without one, a way to add it. Not known
 * yet (`undefined`) is never "none saved": Book waits while it loads, and a failed read says the
 * booking won't be billed, since a booking's bill-to can't be added afterwards.
 */
export type BillToRow =
  | { kind: "hidden" }
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "add" }
  | { kind: "switch"; gstin: BuyerGstin; on: boolean };

export function billToRow(
  billingAsBusiness: boolean,
  gstin: BuyerGstin | null | undefined,
  off: boolean,
  failed = false
): BillToRow {
  if (!billingAsBusiness) return { kind: "hidden" };
  if (gstin === undefined) return failed ? { kind: "failed" } : { kind: "loading" };
  if (gstin === null) return { kind: "add" };
  return { kind: "switch", gstin, on: !off };
}

/** The shop's GST line under Bill to; null when the API does not say (an older API, or no business customer). */
export function gstInvoiceLine(gstInvoice: boolean | null | undefined): string | null {
  if (gstInvoice === true) return "This shop issues GST invoices.";
  if (gstInvoice === false) return "This shop isn't GST-registered, so its rent invoice won't carry GST.";
  return null;
}
