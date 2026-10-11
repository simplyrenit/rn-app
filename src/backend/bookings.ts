import { useGlobalContext } from "@/context/global-context";
import {
  BookingCustomer,
  CancelOutcome,
  TimeWindow,
  DeliveryMode,
  PaymentStart,
  Quote,
  isRinging,
} from "@/lib/booking";
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

/** The contract's rhythm for the confirming screen (API-CONTRACT, App notes for OE-C). */
export const BOOKING_POLL_MS = 3000;

/**
 * One booking, read from the server every time the screen needs it: its stage
 * there is the truth, not what this phone remembers.
 *
 * While the owner is being asked it is read again every 3 seconds, but only
 * when `watching` (the screen is in front and the app is active). The asking
 * stops by itself the moment the booking is no longer ringing.
 */
export function useBooking(number: string, watching = false) {
  return useQuery(bookingQueryKey(number), () => fetchBooking(number), {
    staleTime: 0,
    refetchInterval: (data) => (watching && data && isRinging(data) ? BOOKING_POLL_MS : false),
    retry: 1,
  });
}

// ---- When the request ends (ENG-173) ------------------------------------------------------

/** What cancelling would cost. Changes nothing. */
export async function fetchCancelOutcome(number: string): Promise<CancelOutcome> {
  return (await axiosInstance.get<{ outcome: CancelOutcome }>(bookingUrl(number, "cancel/"))).data.outcome;
}

/**
 * Cancels, saying which outcome the customer was shown (A-33). If the booking
 * has moved on since (the owner accepted a second ago), the server cancels
 * nothing and answers `409 outcome_changed` with the new outcome.
 */
export async function cancelBooking(number: string, shownCase: CancelOutcome["case"]): Promise<BookingCustomer> {
  return (
    await axiosInstance.post<{ booking: BookingCustomer }>(bookingUrl(number, "cancel/"), { case: shownCase })
  ).data.booking;
}

/** `GET …/alternatives/`: other dates for this item, and the same item from other owners. */
export interface Alternatives {
  pick_deadline_at: string | null;
  /** The ₹99 can still move to a new request (send `moved_from` to Book now). */
  booking_amount_moves: boolean;
  other_dates: { first_day: string; last_day: string }[];
  other_owners: BackendProduct[];
}

export async function fetchAlternatives(number: string): Promise<Alternatives> {
  return (await axiosInstance.get<Alternatives>(bookingUrl(number, "alternatives/"))).data;
}

/** "No thanks, refund my ₹99": takes it back now instead of after the pick-by time. */
export async function refundBookingAmount(number: string): Promise<BookingCustomer> {
  return (
    await axiosInstance.post<{ booking: BookingCustomer }>(bookingUrl(number, "refund-booking-amount/"), {})
  ).data.booking;
}

// ---- After the owner accepts (ENG-174) -------------------------------------------------------

/**
 * The rent's payment. Asked on every tap of Pay: the server answers with the
 * same payment while it can still be paid, and a new one once that has run out.
 */
export async function payRent(number: string): Promise<{ payment: PaymentStart; booking: BookingCustomer }> {
  return (
    await axiosInstance.post<{ payment: PaymentStart; booking: BookingCustomer }>(bookingUrl(number, "pay-rent/"), {})
  ).data;
}

/** The one-hour windows left on the first day, inside the shop's hours. */
export async function fetchWindows(number: string): Promise<{ day: string; windows: TimeWindow[] }> {
  return (await axiosInstance.get<{ day: string; windows: TimeWindow[] }>(bookingUrl(number, "windows/"))).data;
}

/** The first pick, one tap. A later change is a request (`requestWindowChange`). */
export async function setWindow(number: string, start: string): Promise<BookingCustomer> {
  return (await axiosInstance.post<{ booking: BookingCustomer }>(bookingUrl(number, "window/"), { start })).data
    .booking;
}

/** Asks the shop to move the window. Nothing moves until they accept. */
export async function requestWindowChange(number: string, start: string): Promise<BookingCustomer> {
  return (
    await axiosInstance.post<{ booking: BookingCustomer }>(bookingUrl(number, "window-change/"), { start })
  ).data.booking;
}

/** Answers the shop's request to move the window. */
export async function answerWindowChange(number: string, accept: boolean): Promise<BookingCustomer> {
  return (
    await axiosInstance.post<{ booking: BookingCustomer }>(bookingUrl(number, "window-change/answer/"), { accept })
  ).data.booking;
}
