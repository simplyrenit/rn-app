import { useGlobalContext } from "@/context/global-context";
import {
  ACCESS_DEVICES_ENDPOINT,
  SHOP_DELIVERY_EXAMPLE_ENDPOINT,
  SHOP_ENDPOINT,
  SHOP_OPEN_ENDPOINT,
} from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { Hours, OpenState, Shop } from "@/lib/shop";
import { useQuery } from "react-query";

/** Keyed on the username: the cache outlives a logout. */
export const shopQueryKey = (username: string | undefined) => ["shop", username];

export const devicesQueryKey = (username: string | undefined) => ["devices", username];

export async function fetchShop(): Promise<Shop> {
  return (await axiosInstance.get<Shop>(SHOP_ENDPOINT)).data;
}

/** What the phone changes (API-CONTRACT `PATCH /api/shop/`). `hours` replaces the whole week. */
export interface ShopPatch {
  hours?: Hours;
  /** A day, `YYYY-MM-DD`, or null to clear it. */
  closed_until?: string | null;
  min_notice_hours?: number;
  delivers?: boolean;
  delivery_base_fee?: string;
  delivery_per_km?: string;
  delivery_max_km?: string;
}

export async function patchShop(patch: ShopPatch): Promise<Shop> {
  return (await axiosInstance.patch<Shop>(SHOP_ENDPOINT, patch)).data;
}

/**
 * The Open switch. `auto` follows the hours again. No fresh code: it is in the
 * top bar all day. `409 cannot_open` (details.reason `no_hours` or `closed_until`)
 * is for the caller to read.
 */
export async function setOpenState(state: "open" | "closed" | "auto"): Promise<OpenState> {
  return (await axiosInstance.post<{ open: OpenState }>(SHOP_OPEN_ENDPOINT, { state })).data.open;
}

export interface DeliveryExample {
  km: string;
  /** `too_far` means the distance is past the farthest the shop goes; `fee` is then null. */
  status: "ok" | "too_far";
  fee: string | null;
  /** "₹50 + 8 km × ₹15" */
  sum: string | null;
}

/** The worked example, from numbers that are not saved yet. */
export async function fetchDeliveryExample(numbers: {
  base: string;
  perKm: string;
  maxKm: string;
  km?: number;
}): Promise<DeliveryExample> {
  return (
    await axiosInstance.get<DeliveryExample>(SHOP_DELIVERY_EXAMPLE_ENDPOINT, {
      params: {
        delivery_base_fee: numbers.base,
        delivery_per_km: numbers.perKm,
        delivery_max_km: numbers.maxKm,
        km: numbers.km ?? 8,
      },
    })
  ).data;
}

export interface Device {
  id: number;
  name: string;
  platform: string;
  this_device: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

export async function fetchDevices(): Promise<Device[]> {
  return (await axiosInstance.get<{ devices: Device[] }>(ACCESS_DEVICES_ENDPOINT)).data.devices;
}

export async function signOutDevice(id: number): Promise<void> {
  await axiosInstance.post(`${ACCESS_DEVICES_ENDPOINT}${id}/sign-out/`, {});
}

/** Signed in and the profile's username known: the two things the owner queries wait for. */
function useOwnerQueryGate() {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token);
  return { username, enabled: signedIn && Boolean(username) };
}

/** The signed-in owner's shop settings. */
export function useShop() {
  const { username, enabled } = useOwnerQueryGate();
  return useQuery(shopQueryKey(username), fetchShop, { enabled, staleTime: 15_000 });
}

/** The devices signed in to this account. Read only when the sheet is open. */
export function useDevices(enabledByScreen = true) {
  const { username, enabled } = useOwnerQueryGate();
  return useQuery(devicesQueryKey(username), fetchDevices, {
    enabled: enabled && enabledByScreen,
    staleTime: 15_000,
  });
}
