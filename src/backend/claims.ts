import { BookingCustomer } from "@/lib/booking";
import { Claim, readClaim } from "@/lib/claims";
import { BOOKINGS_ENDPOINT, CLAIMS_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { serverTimeFromHeaders } from "@/lib/server-clock";
import { useQuery } from "react-query";

/** API-CONTRACT OE-K. Claims are read by either party of the booking; the fault and damage reports are booking actions. */
export const claimQueryKey = (id: number) => ["claim", id];

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
  return { claim: need(response.data?.claim), serverTime: serverTimeFromHeaders(response.headers) };
}

export function useClaim(id: number, enabled = true) {
  return useQuery(claimQueryKey(id), () => fetchClaim(id), { enabled, staleTime: 0, retry: 1 });
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
