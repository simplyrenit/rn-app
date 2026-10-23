import { BookingCustomer, DayStatus, PaymentStart } from "@/lib/booking";
import { BOOKINGS_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import type { BookingShop } from "@/lib/shop-booking";

/**
 * API-CONTRACT OE-I: the day of the handover and the return. The calls either
 * side can make live at the same paths and answer with "the caller's view" of the
 * booking, so each is typed for the side that is calling (`B`).
 */
const url = (number: string, action: string) => `${BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/${action}`;

/** A claim as these calls return it. Only what the phone reads here. */
export interface ClaimStub {
  id: number;
  kind: string;
  decide_by: string | null;
}

/**
 * The deposit's payment: a new one, or the open one while it can still be paid.
 * `409 window_required` before an arrival window is picked; `409 nothing_to_pay`
 * when the deposit is nothing, already paid, or carried from the first booking.
 */
export async function payDeposit(number: string): Promise<{ payment: PaymentStart; booking: BookingCustomer }> {
  return (
    await axiosInstance.post<{ payment: PaymentStart; booking: BookingCustomer }>(url(number, "pay-deposit/"), {})
  ).data;
}

/** One of the three preset taps. `409 too_early` before `day.call_from`. */
export async function setDayStatus<B = BookingCustomer>(number: string, status: Exclude<DayStatus, "">): Promise<B> {
  return (await axiosInstance.post<{ booking: B }>(url(number, "status/"), { status })).data.booking;
}

/** "They did not come", with a photo taken on the spot. `409 too_early` before `day.no_show_from`; `409 claim_open`. */
export async function reportNoShow<B = BookingCustomer>(number: string, photo: string): Promise<B> {
  return (await axiosInstance.post<{ booking: B }>(url(number, "no-show/"), { photo })).data.booking;
}

/**
 * "Not as described", before the code: a statement and at least one photo. Staff decide by the end of the next day.
 * `problem` (B1, a courier booking only): a broken seal or box opens a fault of the trip; left out, as today.
 */
export async function refuseAtDoor(
  number: string,
  statement: string,
  photos: string[],
  problem?: "seal_broken" | "box_damaged" | "not_as_described"
): Promise<{ booking: BookingCustomer; claim: ClaimStub }> {
  return (
    await axiosInstance.post<{ booking: BookingCustomer; claim: ClaimStub }>(url(number, "refuse-at-door/"), {
      statement,
      photos,
      ...(problem ? { problem } : {}),
    })
  ).data;
}

/** The customer types the shop's code: the rental stops. `wrong_code`, `code_locked`, `code_closed`. */
export async function returnItem(number: string, code: string): Promise<BookingCustomer> {
  return (await axiosInstance.post<{ booking: BookingCustomer }>(url(number, "return/"), { code })).data.booking;
}

/** "Owner did not come" to the return: late charges stop from this moment. `409 too_early` before the last day. */
export async function reportOwnerAbsent(
  number: string,
  photo: string
): Promise<{ booking: BookingCustomer; claim: ClaimStub }> {
  return (
    await axiosInstance.post<{ booking: BookingCustomer; claim: ClaimStub }>(url(number, "owner-absent/"), { photo })
  ).data;
}

export interface ExtendInput {
  last_day: string;
  terms_version: string | null;
  /** The `total` of the quote the customer saw (asked with `extends`). */
  expected_total: string;
  /** Made once per tap, as for Book now. */
  client_key: string;
}

/** Extending is a new booking for the days that follow; it rings and is paid like any other. */
export async function extendBooking(
  number: string,
  input: ExtendInput
): Promise<{ booking: BookingCustomer; payment: PaymentStart | null }> {
  return (
    await axiosInstance.post<{ booking: BookingCustomer; payment: PaymentStart | null }>(url(number, "extend/"), input)
  ).data;
}

/** The owner types the customer's code: the rental starts. `wrong_code`, `code_locked`, `code_closed`, `too_early`, `claim_open`. */
export async function startRental(number: string, code: string): Promise<BookingShop> {
  return (await axiosInstance.post<{ booking: BookingShop }>(url(number, "handover/"), { code })).data.booking;
}
