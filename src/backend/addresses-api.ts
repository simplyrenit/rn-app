import { AddressPayload, SavedAddress, canSaveOffered } from "@/lib/addresses";
import { MY_ADDRESSES_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import type { QueryClient } from "react-query";

/**
 * The address calls that are not hooks, kept apart from `useAddresses` so they
 * can be used (and tested) without a component: Preview saves an address after
 * a listing is submitted.
 *
 * The username is part of the key because the React Query cache is not
 * cleared on logout: without it the next account to sign in on this phone
 * would be shown the previous one's addresses until the refetch landed.
 */
export const addressesQueryKey = (username: string | undefined) => ["addresses", username];

export async function fetchAddresses(): Promise<SavedAddress[]> {
  return (await axiosInstance.get<SavedAddress[]>(MY_ADDRESSES_ENDPOINT)).data;
}

export async function createAddress(payload: AddressPayload): Promise<SavedAddress> {
  const response = await axiosInstance.post<SavedAddress>(MY_ADDRESSES_ENDPOINT, payload);
  return response.data;
}

/**
 * The Review screen's "Save this address" offer (ENG-25 §8.8), carried out
 * after the listing exists. The intent can outlive what made it valid — a Home
 * chosen, then a Home added from Profile before the draft was resumed — so the
 * list is read fresh here rather than trusted from whatever a screen had cached.
 *
 * Resolves "saved", or "skipped" when the list no longer has room for it: the
 * spot is already saved, its Home or Work is taken, or the list is full.
 * Rejects when the list cannot be read or the save fails; the caller reports
 * that and carries on, because the listing is already live.
 */
export async function saveOfferedAddress(
  queryClient: QueryClient,
  username: string | undefined,
  payload: AddressPayload
): Promise<"saved" | "skipped"> {
  // Without a username there is no key to read under, so the list cannot be known.
  if (!username) throw new Error("no profile");
  const key = addressesQueryKey(username);
  const saved = await queryClient.fetchQuery(key, fetchAddresses);
  if (!canSaveOffered(saved, payload)) return "skipped";
  await createAddress(payload);
  void queryClient.invalidateQueries(key);
  return "saved";
}
