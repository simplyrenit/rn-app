import { AddressPayload, SavedAddress } from "@/lib/addresses";
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
 * after the listing exists. The offer is for an owner with no saved address
 * (D14), and the intent can outlive that — chosen, then an address added from
 * Profile before the draft was resumed — so the list is read fresh here rather
 * than trusted from whatever a screen had cached.
 *
 * Resolves "saved", or "skipped" when the owner already has an address.
 * Rejects when the list cannot be read or the save fails; the caller reports
 * that and carries on, because the listing is already live.
 */
export async function saveFirstAddress(
  queryClient: QueryClient,
  username: string | undefined,
  payload: AddressPayload
): Promise<"saved" | "skipped"> {
  // Without a username there is no key to read under, so the list cannot be known.
  if (!username) throw new Error("no profile");
  const key = addressesQueryKey(username);
  const saved = await queryClient.fetchQuery(key, fetchAddresses);
  if (saved.length > 0) return "skipped";
  await createAddress(payload);
  void queryClient.invalidateQueries(key);
  return "saved";
}
