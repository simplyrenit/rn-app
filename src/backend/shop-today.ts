import { useGlobalContext } from "@/context/global-context";
import { MY_PRODUCTS_ENDPOINT, SHOP_BLOCKS_ENDPOINT, SHOP_TODAY_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { Block, BlockCall, PickerProduct, TodayFeed, pickerProductFrom } from "@/lib/shop-today";
import { QueryClient, useQuery } from "react-query";

/** Keyed on the username: the cache outlives a logout. */
export const todayQueryKey = (username: string | undefined) => ["shop-today", username];

/**
 * Everything the shop's screens read starts with one of these keys, so one call
 * brings them all up to date after an answer, a block, a cancel or a push about
 * the shop (the open switch and the live answer included).
 */
export function refreshShop(queryClient: QueryClient) {
  for (const key of ["shop", "shop-live", "shop-today", "shop-bookings", "shop-counts", "shop-booking", "shop-open-blocks"]) {
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

/** "Take it off": a block made by mistake goes as if it had never been made, also after it has begun (`DELETE` allows it). 204. */
export async function removeBlock(id: number): Promise<void> {
  await axiosInstance.delete(`${SHOP_BLOCKS_ENDPOINT}${id}/`);
}

/** The shop's blocks that are not over, or are waiting for "Is it back?": every page (the list is short). */
export async function fetchOpenBlocks(): Promise<Block[]> {
  const out: Block[] = [];
  for (let page = 1; page <= 5; page += 1) {
    const { data } = await axiosInstance.get<{ results: Block[]; links?: { next?: string | null } }>(SHOP_BLOCKS_ENDPOINT, {
      params: { open: true, page, page_size: 100 },
    });
    out.push(...data.results);
    if (!data.links?.next) break;
  }
  return out;
}

export function useOpenBlocks() {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token && username);
  return useQuery(["shop-open-blocks", username], fetchOpenBlocks, { enabled: signedIn, staleTime: 0, retry: 1 });
}

/** "Returned": the unit is back; the block ends today. */
export async function blockReturned(id: number): Promise<Block> {
  return (await axiosInstance.post<{ block: Block }>(`${SHOP_BLOCKS_ENDPOINT}${id}/returned/`, {})).data.block;
}

/**
 * The items the quick block can pick, from the owner's own listings: `GET
 * /api/my/products/`, which any owner may call. The merchants-only `GET /api/shop/products/`
 * is not used on the phone: a person renting out their own things gets 403 from it
 * and could not block a unit at all (review round 1, finding 3). Every page is read
 * (a hundred at a time, up to a thousand listings) and searched on the phone.
 */
export async function fetchPickerProducts(): Promise<PickerProduct[]> {
  const found: PickerProduct[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data } = await axiosInstance.get<{ results?: unknown[]; total_pages?: number } | unknown[]>(
      MY_PRODUCTS_ENDPOINT,
      { params: { page, page_size: 100 } }
    );
    const results = Array.isArray(data) ? data : data.results ?? [];
    for (const raw of results) {
      const product = pickerProductFrom(raw);
      if (product) found.push(product);
    }
    if (Array.isArray(data) || !data.total_pages || page >= data.total_pages) break;
  }
  return found;
}
