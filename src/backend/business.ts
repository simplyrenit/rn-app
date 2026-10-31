/**
 * The GSTIN a business customer bills bookings to (ENG-352): one query and two mutations.
 * Keyed by username, as the KYC status is, so a second account on the install never reads it.
 */
import { useGlobalContext } from "@/context/global-context";
import type { BuyerGstin } from "@/lib/business";
import { BUSINESS_GSTIN_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { useMutation, useQuery, useQueryClient } from "react-query";

export const BUYER_GSTIN_KEY = (username: string | undefined) => ["business", "gstin", username ?? ""];

/** The saved GSTIN, or null (204). Only asked for a customer billing as a business. */
export function useBuyerGstin() {
  const { isAuthenticated, userDetails } = useGlobalContext();
  return useQuery<BuyerGstin | null>(
    BUYER_GSTIN_KEY(userDetails?.username),
    () => axiosInstance.get<BuyerGstin | "">(BUSINESS_GSTIN_ENDPOINT).then((r) => r.data || null),
    // One retry: Book waits on this read, so a dead network should say so soon, not after three.
    { enabled: Boolean(isAuthenticated && userDetails?.billing_as_business), staleTime: 60_000, retry: 1 }
  );
}

/** Check a GSTIN against the register and save it; it replaces any saved one and turns the flag on. */
export function useAddGstin() {
  const { userDetails, fetchUserDetails } = useGlobalContext();
  const queryClient = useQueryClient();
  return useMutation(
    (gstin: string) => axiosInstance.post<BuyerGstin>(BUSINESS_GSTIN_ENDPOINT, { gstin }).then((r) => r.data),
    {
      onSuccess: async (saved) => {
        queryClient.setQueryData(BUYER_GSTIN_KEY(userDetails?.username), saved);
        await fetchUserDetails(); // the server turned `bills_to_business` on
      },
    }
  );
}

export function useRemoveGstin() {
  const { userDetails } = useGlobalContext();
  const queryClient = useQueryClient();
  return useMutation(() => axiosInstance.delete(BUSINESS_GSTIN_ENDPOINT), {
    onSuccess: () => {
      queryClient.setQueryData(BUYER_GSTIN_KEY(userDetails?.username), null);
    },
  });
}
