import { useGlobalContext } from "@/context/global-context";
import { BookingCustomer, DeliveryMode, PaymentStart, Quote } from "@/lib/booking";
import { BOOKINGS_ENDPOINT, GET_PRODUCT_DETAILS } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import { useQuery } from "react-query";

/** API-CONTRACT OE-C: the customer's side of a booking. Every path ends in "/". */
const bookingUrl = (number: string, action = "") =>
  `${BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/${action}`;

export const bookingQueryKey = (number: string) => ["booking", number];

export interface QuoteInput {
  product: string;
  first_day: string;
  last_day: string;
  delivery_mode: DeliveryMode;
  /** One of the caller's saved addresses; needed for owner delivery. */
  address_id: number | null;
}

/** The whole price before Book now. Writes nothing; works signed out too. */
export async function fetchQuote(input: QuoteInput): Promise<Quote> {
  return (await axiosInstance.post<Quote>(`${BOOKINGS_ENDPOINT}quote/`, { ...input, extends: null })).data;
}

export interface BookInput extends QuoteInput {
  /** The version the customer ticked, from the quote. */
  terms_version: string | null;
  /** The `total` the customer saw; the server refuses with `price_changed` if it moved. */
  expected_total: string;
  /** The caller's refused or unanswered booking whose ₹99 moves here (N2). */
  moved_from: string | null;
  /** Made once per tap: a repeat with the same key returns the first booking. */
  client_key: string;
}

export interface BookAnswer {
  booking: BookingCustomer;
  /** Null when the ₹99 moved from an earlier request: nothing to pay now. */
  payment: PaymentStart | null;
}

/** Book now. The owner is rung only once the ₹99 is paid (A-05). */
export async function bookNow(input: BookInput): Promise<BookAnswer> {
  return (await axiosInstance.post<BookAnswer>(`${BOOKINGS_ENDPOINT}book/`, input)).data;
}

export async function fetchBooking(number: string): Promise<BookingCustomer> {
  return (await axiosInstance.get<BookingCustomer>(bookingUrl(number))).data;
}

/** The public product, outside a hook: the dates screen is opened with only its name. */
export async function fetchPublicProduct(name: string): Promise<BackendProduct> {
  return (await axiosInstance.get<BackendProduct>(`${GET_PRODUCT_DETAILS}${encodeURIComponent(name)}/`)).data;
}

export function usePublicProduct(name: string) {
  return useQuery(["public-product", name], () => fetchPublicProduct(name), { staleTime: 30_000 });
}

/**
 * The quote for what is on screen. Asked again on every change, never shown from
 * an old answer as if current (`staleTime` 0), but the last one stays up while
 * the next loads so the sums do not blink. Keyed on the person too: signed in,
 * the quote carries their delivery fee, terms and ID check.
 */
export function useQuote(input: QuoteInput | null) {
  const { userDetails } = useGlobalContext();
  return useQuery(["quote", userDetails?.username ?? null, input], () => fetchQuote(input as QuoteInput), {
    enabled: input !== null,
    staleTime: 0,
    keepPreviousData: true,
    retry: 1,
  });
}

/**
 * One booking, read from the server every time the screen needs it: its stage
 * there is the truth, not what this phone remembers. `pollMs` asks again on a
 * timer (the confirming screen); false stops.
 */
export function useBooking(number: string, pollMs: number | false = false) {
  return useQuery(bookingQueryKey(number), () => fetchBooking(number), {
    staleTime: 0,
    refetchInterval: pollMs,
    retry: 1,
  });
}
