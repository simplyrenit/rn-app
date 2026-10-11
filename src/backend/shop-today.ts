import { useGlobalContext } from "@/context/global-context";
import { SHOP_BLOCKS_ENDPOINT, SHOP_PRODUCTS_ENDPOINT, SHOP_TODAY_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { Block, BlockCall, TodayFeed } from "@/lib/shop-today";
import { QueryClient, useQuery } from "react-query";

/** Keyed on the username: the cache outlives a logout. */
export const todayQueryKey = (username: string | undefined) => ["shop-today", username];

/**
 * Everything the shop's screens read starts with one of these keys, so one call
 * brings them all up to date after an answer, a block, a cancel or a push about
 * the shop (the open switch and the live answer included).
 */
export function refreshShop(queryClient: QueryClient) {
  for (const key of ["shop", "shop-live", "shop-today", "shop-bookings", "shop-counts", "shop-booking"]) {
    void queryClient.invalidateQueries(key);
  }
}

/** `GET /api/shop/today/`: ringing, going out, coming back, and what needs the shop. */
export async function fetchToday(): Promise<TodayFeed> {
  return (await axiosInstance.get<TodayFeed>(SHOP_TODAY_ENDPOINT)).data;
}

/** Read again each time the screen comes into view and after any push about the shop. */
export function useToday() {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token && username);
  return useQuery(todayQueryKey(username), fetchToday, { enabled: signedIn, staleTime: 0, retry: 1 });
}

// ---- Quick block (API-CONTRACT OE-F) -------------------------------------------------------

/** How many units can be blocked on these days, and how many the shop has. */
export async function fetchFree(
  product: string,
  firstDay: string,
  lastDay: string
): Promise<{ free: number; quantity: number }> {
  return (
    await axiosInstance.get<{ free: number; quantity: number }>(`${SHOP_BLOCKS_ENDPOINT}free/`, {
      params: { product, first_day: firstDay, last_day: lastDay },
    })
  ).data;
}

/** One block: "Rented at the counter" (one unit, from today, a walk-in) or the general block. */
export async function makeBlock(call: BlockCall): Promise<Block> {
  const url = call.path === "counter" ? `${SHOP_BLOCKS_ENDPOINT}counter/` : SHOP_BLOCKS_ENDPOINT;
  return (await axiosInstance.post<{ block: Block }>(url, call.body)).data.block;
}

/** "Extend": a walk-in that is still out. */
export async function extendBlock(id: number, lastDay: string): Promise<Block> {
  return (await axiosInstance.patch<{ block: Block }>(`${SHOP_BLOCKS_ENDPOINT}${id}/`, { last_day: lastDay })).data
    .block;
}

/** "Returned": the unit is back; the block ends today. */
export async function blockReturned(id: number): Promise<Block> {
  return (await axiosInstance.post<{ block: Block }>(`${SHOP_BLOCKS_ENDPOINT}${id}/returned/`, {})).data.block;
}

/** What the item picker needs of a product. */
export interface PickerProduct {
  name: string;
  title: string;
  shop_code: string;
  quantity: number;
  status: string;
}

/** The shop's products that can be blocked: live ones and paused ones, by title. */
export async function fetchPickerProducts(q: string): Promise<PickerProduct[]> {
  return (
    await axiosInstance.get<{ results: PickerProduct[] }>(SHOP_PRODUCTS_ENDPOINT, {
      params: { q: q.trim() || undefined, status: "live,paused", ordering: "title", page_size: 30 },
    })
  ).data.results;
}
