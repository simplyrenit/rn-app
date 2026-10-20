import useAddresses from "@/backend/useAddresses";
import { useGlobalContext } from "@/context/global-context";
import { SavedAddress } from "@/lib/addresses";
import { DeliveryAddressState } from "@/lib/delivery";
import { useCallback, useSyncExternalStore } from "react";

/**
 * ENG-284 D12: the address the customer is shopping for in this session. Search
 * results' "Where should we deliver?" and BK-02's picker write it; search, the
 * product page and BK-02 read it. It never changes the saved default.
 *
 * Only the id is held. Every read resolves it against the live address list,
 * so an address edited in Profile (a moved pin, a new PIN) is read as it is now,
 * and one deleted falls back to the default. A module store rather than a
 * provider: one number, read by three screens, and nothing to mount in App.
 * It outlives a sign-out harmlessly: another account's list has no such id.
 */
let chosenId: number | null = null;
const listeners = new Set<() => void>();

export function chooseDeliveryAddress(id: number | null) {
  if (id === chosenId) return;
  chosenId = id;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const read = () => chosenId;

/** The chosen address if it is still saved, else the default, else the first; null with none. */
export function resolveDeliveryAddress(list: SavedAddress[], id: number | null): SavedAddress | null {
  return (
    (id !== null ? list.find((a) => a.id === id) : undefined) ??
    list.find((a) => a.is_default) ??
    list[0] ??
    null
  );
}

/**
 * What a search's delivery answers depend on: the address, its PIN and its
 * point. A change to any of them (an edit in Profile, a PIN fixed on BK-02)
 * makes the grid stale; "" is no address.
 */
export function deliveryAddressKey(address: SavedAddress | null): string {
  if (!address) return "";
  const { lat, long } = address.coordinates;
  return `${address.id}|${address.postal_code ?? ""}|${lat}|${long}`;
}

/** Which of the row's states the customer is in (D12). */
export function deliveryAddressState(
  signedIn: boolean,
  loading: boolean,
  isError: boolean,
  address: SavedAddress | null
): DeliveryAddressState {
  if (!signedIn) return "signed_out";
  if (loading) return "loading";
  if (address) return "ready";
  // A list that failed to load is unknown, not empty: no "Add your address".
  return isError ? "error" : "none";
}

export function useDeliveryAddress() {
  const { authTokens, isAuthenticated } = useGlobalContext();
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);
  const { addresses, loading, isError } = useAddresses();
  const id = useSyncExternalStore(subscribe, read);
  const address = signedIn ? resolveDeliveryAddress(addresses, id) : null;
  const choose = useCallback((next: SavedAddress) => chooseDeliveryAddress(next.id), []);
  return {
    signedIn,
    address,
    state: deliveryAddressState(signedIn, loading, isError, address),
    choose,
  };
}
