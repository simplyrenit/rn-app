import { BookingCustomer } from "@/lib/booking";
import { Claim, SentReport, isMyReport, readClaim, rupeesBody } from "@/lib/claims";
import { BOOKINGS_ENDPOINT, CLAIMS_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { serverTimeFromHeaders } from "@/lib/server-clock";
import type { BookingShop } from "@/lib/shop-booking";
import { useQueries, useQuery } from "react-query";

/** API-CONTRACT OE-K. Claims are read by either party of the booking; the fault and damage reports are booking actions. */
export const claimQueryKey = (id: number) => ["claim", id];

/**
 * The kinds of a booking's claims, once every one has been read (the same queries the claim rows use, so nothing is read
 * twice); undefined while any is still being read or could not be, and the booking's own flags stand in then.
 */
export function useClaimKinds(ids: readonly number[] | null | undefined): string[] | undefined {
  const results = useQueries((ids ?? []).map((id) => ({ queryKey: claimQueryKey(id), queryFn: () => fetchClaim(id), staleTime: 15_000, retry: 1 })));
  return results.every((r) => r.data) ? results.map((r) => (r.data as ClaimRead).claim.kind) : undefined;
}

/** A claim, and the server's time when the answer was made (the claim carries none of its own). */
export interface ClaimRead {
  claim: Claim;
  serverTime: string | null;
}

const need = (value: unknown): Claim => {
  const claim = readClaim(value);
  if (!claim) throw new Error("The answer was not a claim");
  return claim;
};

export async function fetchClaim(id: number): Promise<ClaimRead> {
  const response = await axiosInstance.get<{ claim: unknown }>(`${CLAIMS_ENDPOINT}${id}/`);
  // Workaround, no contract field: the Claim has no `server_time`, so the answer's `Date` header is the server's clock.
  return { claim: need(response.data?.claim), serverTime: serverTimeFromHeaders(response.headers) };
}

export function useClaim(id: number, enabled = true) {
  return useQuery(claimQueryKey(id), () => fetchClaim(id), { enabled, staleTime: 0, retry: 1 });
}

/**
 * After a report whose answer never came: which of these claim ids, if any, is the report that was sent. Each is read and
 * matched on its kind, who raised it and its words, so another open claim on the booking is never taken for it.
 */
export async function findMyReport(ids: number[], sent: SentReport): Promise<number | null> {
  for (const id of ids) {
    if (isMyReport((await fetchClaim(id)).claim, sent)) return id;
  }
  return null;
}

/** The one reply, by the side the claim is against. `409 already_replied`, `claim_decided`, `reply_late`. */
export async function replyToClaim(id: number, text: string, evidence: string[]): Promise<ClaimRead> {
  const response = await axiosInstance.post<{ claim: unknown }>(`${CLAIMS_ENDPOINT}${id}/reply/`, { text: text.trim(), evidence });
  return { claim: need(response.data?.claim), serverTime: serverTimeFromHeaders(response.headers) };
}

const bookingUrl = (number: string, action: string) => `${BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/${action}`;

/** The customer reports a fault, with at least one photo, within 24 hours of the handover. `409 too_late`, `claim_exists`. */
export async function reportFault(
  number: string,
  statement: string,
  photos: string[]
): Promise<{ claim: Claim; booking: BookingCustomer }> {
  const { data } = await axiosInstance.post<{ claim: unknown; booking: BookingCustomer }>(bookingUrl(number, "claims/fault/"), {
    statement: statement.trim(),
    photos,
  });
  return { claim: need(data?.claim), booking: data.booking };
}

/** The shop reports a problem at the return: an amount up to the deposit, the words, the photos. `409 too_late`, `amount_too_large`, `claim_exists`. */
export async function reportDamage(
  number: string,
  rupees: number,
  statement: string,
  photos: string[]
): Promise<{ claim: Claim; booking: BookingShop }> {
  const { data } = await axiosInstance.post<{ claim: unknown; booking: BookingShop }>(bookingUrl(number, "claims/damage/"), {
    amount: rupeesBody(rupees),
    statement: statement.trim(),
    photos,
  });
  return { claim: need(data?.claim), booking: data.booking };
}
