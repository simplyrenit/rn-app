import { shopBookingUrl } from "@/backend/shop-ring";
import { useGlobalContext } from "@/context/global-context";
import { BOOKINGS_ENDPOINT, SHOP_BOOKINGS_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BookingShop, ShopCancelWarning, ShopCounts, ShopTab } from "@/lib/shop-booking";
import { cancelBody } from "@/lib/shop-lines";
import { useInfiniteQuery, useQuery } from "react-query";

export const bookingsQueryKey = (username: string | undefined, tab: ShopTab) => ["shop-bookings", username, tab];
export const countsQueryKey = (username: string | undefined) => ["shop-counts", username];

const PAGE_SIZE = 20;

export interface ShopBookingsPage {
  results: BookingShop[];
  current_page: number;
  total_pages: number;
  total_results: number;
}

/**
 * One page of the shop's bookings in a stage. `closed` is the finished ones with no
 * exit and `ended` is every booking with an exit, whatever its stage (the contract's
 * `stage` filter). Never a booking that is still waiting for the customer's ₹99.
 */
export async function fetchShopBookings(stage: ShopTab, page = 1): Promise<ShopBookingsPage> {
  return (
    await axiosInstance.get<ShopBookingsPage>(SHOP_BOOKINGS_ENDPOINT, {
      params: { stage, page, page_size: PAGE_SIZE },
    })
  ).data;
}

/** The numbers on the tabs. */
export async function fetchShopCounts(): Promise<ShopCounts> {
  return (await axiosInstance.get<ShopCounts>(`${SHOP_BOOKINGS_ENDPOINT}counts/`)).data;
}

export function useShopCounts() {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token && username);
  return useQuery(countsQueryKey(username), fetchShopCounts, { enabled: signedIn, staleTime: 0, retry: 1 });
}

/** A tab's list, a page at a time. */
export function useShopBookings(stage: ShopTab, enabled = true) {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token && username);
  return useInfiniteQuery(
    bookingsQueryKey(username, stage),
    ({ pageParam = 1 }) => fetchShopBookings(stage, pageParam as number),
    {
      enabled: signedIn && enabled,
      staleTime: 0,
      retry: 1,
      getNextPageParam: (last) => (last.current_page < last.total_pages ? last.current_page + 1 : undefined),
    }
  );
}

/** What cancelling would cost the shop. Changes nothing. */
export async function fetchShopCancelWarning(number: string): Promise<ShopCancelWarning> {
  return (await axiosInstance.get<{ warning: ShopCancelWarning }>(shopBookingUrl(number, "cancel/"))).data.warning;
}

/**
 * Cancels after accepting: the customer gets everything back and the shop is marked. On a booking of several items the
 * shop may name the one it can't give (`line`, cart D46): the whole booking is cancelled either way.
 */
export async function cancelShopBooking(number: string, line: number | null = null): Promise<BookingShop> {
  return (
    await axiosInstance.post<{ warning: ShopCancelWarning; booking: BookingShop }>(
      shopBookingUrl(number, "cancel/"),
      cancelBody(line)
    )
  ).data.booking;
}

/** The shop asks to move the arrival window. Nothing moves until the customer accepts. */
export async function askWindowChange(number: string, start: string): Promise<BookingShop> {
  return (
    await axiosInstance.post<{ booking: BookingShop }>(
      `${BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/window-change/`,
      { start }
    )
  ).data.booking;
}

/** Answers the customer's request to move the window. */
export async function answerCustomerWindowChange(number: string, accept: boolean): Promise<BookingShop> {
  return (
    await axiosInstance.post<{ booking: BookingShop }>(
      `${BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/window-change/answer/`,
      { accept }
    )
  ).data.booking;
}
