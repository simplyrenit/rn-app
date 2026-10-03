import { useGlobalContext } from "@/context/global-context";
import { AddressPayload, SavedAddress } from "@/lib/addresses";
import { MY_ADDRESSES_ENDPOINT } from "@/lib/config";
import { createLocationRequest } from "@/lib/location-request";
import axiosInstance from "@/lib/networkUtils";
import axios from "axios";
import { useTypedNavigation } from "@/lib/types";
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";

/**
 * The username is part of the key because the React Query cache is not
 * cleared on logout: without it the next account to sign in on this phone
 * would be shown the previous one's addresses until the refetch landed.
 */
export const addressesQueryKey = (username: string | undefined) => ["addresses", username];

export async function fetchAddresses(): Promise<SavedAddress[]> {
  return (await axiosInstance.get<SavedAddress[]>(MY_ADDRESSES_ENDPOINT)).data;
}

/** Not a hook: Preview saves the inline offer's address after the listing is submitted. */
export async function createAddress(payload: AddressPayload): Promise<SavedAddress> {
  const response = await axiosInstance.post<SavedAddress>(MY_ADDRESSES_ENDPOINT, payload);
  return response.data;
}

const useAddresses = () => {
  const { authTokens, isAuthenticated, userDetails, userDetailsFailed, fetchUserDetails } =
    useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);
  // The query below cannot start without the username, so a signed-in user
  // with no profile is one of two things. Still fetching it (right after
  // sign-in the tokens land first): that is loading. Or `/users/me/` failed,
  // and nothing retries it: that is an error whose retry reloads the profile —
  // treated as loading it left the list on skeletons for good. The flag drops
  // while a retry is in flight, so the retry shows as loading too.
  const profileMissing = signedIn && !username;
  const profileFailed = profileMissing && userDetailsFailed;
  const queryClient = useQueryClient();
  const queryKey = addressesQueryKey(username);

  const query = useQuery(queryKey, fetchAddresses, {
    enabled: signedIn && Boolean(username),
    staleTime: 30_000,
  });

  // True only while the customer's own pull-to-refresh is in flight.
  const [refreshing, setRefreshing] = useState(false);
  const { refetch } = query;
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // With the profile in, the key gains its username and the query starts.
      if (profileFailed) await fetchUserDetails();
      else await refetch();
    } finally {
      setRefreshing(false);
    }
    // `fetchUserDetails` is recreated on every render of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch, profileFailed]);

  // No optimistic writes, unlike the favourites: which address is the default,
  // and which one is promoted when the default is deleted, is the server's
  // decision. The refetch is started, not awaited: the write has already
  // succeeded, and a mutation that waited on it kept Address details (and its
  // back guard) held for as long as a failing refetch kept retrying. The list
  // is mounted underneath and redraws when the refetch lands.
  const onSuccess = () => {
    void queryClient.invalidateQueries(queryKey);
  };
  // A 400 or 404 means the server knows something this list does not: the
  // address was deleted on another device, the type or the cap was taken
  // there. Refetch, or the screen keeps offering a retry that cannot succeed.
  const onError = (error: unknown) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    if (status === 400 || status === 404) void queryClient.invalidateQueries(queryKey);
  };

  const create = useMutation(createAddress, { onSuccess, onError });

  const update = useMutation(
    async ({ id, ...patch }: Partial<AddressPayload> & { id: number }) =>
      (await axiosInstance.patch<SavedAddress>(`${MY_ADDRESSES_ENDPOINT}${id}/`, patch)).data,
    { onSuccess, onError }
  );

  const remove = useMutation(
    async (id: number) => {
      await axiosInstance.delete(`${MY_ADDRESSES_ENDPOINT}${id}/`);
    },
    { onSuccess, onError }
  );

  return {
    addresses: query.data ?? [],
    // Idle counts as loading: the query is waiting for the profile's username.
    loading: !profileFailed && (profileMissing || query.isLoading || query.isIdle),
    // An error only while there is nothing to show; a failed background
    // refetch keeps the list that is already on screen.
    isError: profileFailed || (query.isError && !query.data),
    refreshing,
    refetch: refresh,
    create: create.mutateAsync,
    update: update.mutateAsync,
    remove: remove.mutateAsync,
  };
};

export default useAddresses;

/**
 * The add flow (D6): the map first, then Address details with the pin.
 * Returns the function that starts it.
 *
 * `onSaved` is for a caller that wants the new address back (the picker
 * sheet). It travels as a second `location-request`, because Address details
 * is a screen and a function cannot be a route param.
 */
export function useAddAddress(onSaved?: (address: SavedAddress) => void) {
  const navigation = useTypedNavigation();

  return useCallback(() => {
    navigation.navigate("LocationModal", {
      requestId: createLocationRequest((coords, address) => {
        // The picker's "skip" just closes it: there is no pin to save.
        if (!coords) return;
        navigation.navigate("AddressDetails", {
          pin: { lat: coords.latitude, long: coords.longitude, address },
          requestId: onSaved
            ? createLocationRequest((_coords, _address, saved) => {
                if (saved) onSaved(saved);
              })
            : undefined,
        });
      }),
    });
  }, [navigation, onSaved]);
}
