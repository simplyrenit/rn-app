import { dismissRingNotifications } from "@/backend/notifications";
import { refreshShop } from "@/backend/shop-today";
import { useGlobalContext } from "@/context/global-context";
import { SHOP_BOOKINGS_ENDPOINT, SHOP_LIVE_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { RING_POLL_MS, SLOW_POLL_MS } from "@/lib/booking";
import { BookingShop } from "@/lib/shop-booking";
import { acceptBody } from "@/lib/shop-lines";
import { LiveAnswer, RefuseReason, Ring, hereEnding, liveStillMatters, refuseBody, rentByLabel } from "@/lib/shop-ring";
import { QueryClient, useQuery } from "react-query";

/** Every shop booking path ends in "/" (API-CONTRACT OE-F). */
export const shopBookingUrl = (number: string, action = "") =>
  `${SHOP_BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/${action}`;

/** Keyed on the username: the cache outlives a logout. */
export const liveQueryKey = (username: string | undefined) => ["shop-live", username];

export const shopBookingQueryKey = (number: string) => ["shop-booking", number];

/**
 * What a `ring_ended` push said about a request, as an ending, kept in the query
 * cache so a ring screen that is open (or opened by a tap on that push) shows it
 * at once. Nothing is fetched under this key: `nav.tsx` writes it, the screen reads it.
 */
export const ringEndedQueryKey = (number: string) => ["shop-ring-ended", number];

/** The live channel: the bookings ringing now, and the last few answers (the ring screen reads it on open). */
export async function fetchLive(): Promise<LiveAnswer> {
  return (await axiosInstance.get<LiveAnswer>(SHOP_LIVE_ENDPOINT)).data;
}

export async function fetchShopBooking(number: string): Promise<BookingShop> {
  return (await axiosInstance.get<BookingShop>(shopBookingUrl(number))).data;
}

/**
 * Accept. The first answer wins: if someone answered first, or the request
 * ended, the server says `409 ring_ended` with who answered and when; if the stock
 * check fails now it ends the request itself (`409 no_unit_free`, `403 cannot_accept`).
 * A booking of several items sends its ticked lines (`acceptBody`, cart D18); a ticked
 * item that lost its unit answers `409 no_unit_free` naming it, and the request keeps ringing.
 */
export async function acceptBooking(number: string, body: { lines?: number[] } = {}): Promise<BookingShop> {
  return (await axiosInstance.post<{ booking: BookingShop }>(shopBookingUrl(number, "accept/"), body)).data.booking;
}

/**
 * Accept as the ring screen sends it (`acceptBody`: a basket's ticked lines, else nothing), with the answer kept as the
 * booking. The accepted ending is written under `ringEndedQueryKey` too, so a ring screen opened after this one (Today's
 * inline Accept) starts on "You accepted this booking", never on a cached ringing view. On the ring screen its own
 * `here` still wins, so that flow is unchanged. Throws as `acceptBooking` does: the caller reads the failure.
 */
export async function acceptRing(
  queryClient: QueryClient,
  number: string,
  ring: Ring | null,
  ticked: readonly number[] = []
): Promise<BookingShop> {
  const booking = await acceptBooking(number, ring ? acceptBody(ring, ticked) : {});
  queryClient.setQueryData(shopBookingQueryKey(number), booking);
  // The server's clock as it answered: the pay-by time is its, not the phone's.
  queryClient.setQueryData(ringEndedQueryKey(number), hereEnding("accepted", booking.answered?.at ?? null, null, rentByLabel(booking)));
  return booking;
}

/** After any answer: the ring's notifications go, and Today, the lists, the counts and the live answer are read again. */
export function settleRing(queryClient: QueryClient, number: string): void {
  void dismissRingNotifications(number);
  refreshShop(queryClient);
}

export interface RefuseAnswer {
  booking: BookingShop;
  /** The block made with the refusal, or null when none was asked for or no unit was free. */
  block: { id: number } | null;
}

/** "Can't do it", with the reason, and "Block these dates?" as one step on the server. */
export async function refuseBooking(
  number: string,
  reason: RefuseReason,
  blockDates: boolean
): Promise<RefuseAnswer> {
  return (await axiosInstance.post<RefuseAnswer>(shopBookingUrl(number, "refuse/"), refuseBody(reason, blockDates)))
    .data;
}

/**
 * The live answer. Read on open, then every 3 seconds while `watching` (the ring
 * screen is in front of an active app) and the request is still ringing. A phone
 * asks more slowly than the dashboard's 1 second: it also has the push.
 */
export function useLive(watching: boolean, number: string) {
  const { authTokens, isAuthenticated, userDetails } = useGlobalContext();
  const username = userDetails?.username;
  const signedIn = Boolean(isAuthenticated && authTokens?.access_token && username);
  return useQuery(liveQueryKey(username), fetchLive, {
    enabled: signedIn,
    staleTime: 0,
    refetchInterval: (data) => (watching && liveStillMatters(data, number) ? RING_POLL_MS : false),
    retry: 1,
  });
}

/** One booking as its shop sees it; while `watching` (its page is in front of an active app) read again every 15 seconds. */
export function useShopBooking(number: string, enabled = true, watching = false) {
  return useQuery(shopBookingQueryKey(number), () => fetchShopBooking(number), {
    enabled,
    staleTime: 0,
    refetchInterval: watching ? SLOW_POLL_MS : false,
    retry: 1,
  });
}
