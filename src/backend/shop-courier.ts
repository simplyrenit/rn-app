import { BOOKINGS_ENDPOINT } from "@/lib/config";
import axiosInstance from "@/lib/networkUtils";
import type { BookingShop } from "@/lib/shop-booking";

/**
 * Unified delivery B1 (ENG-303's endpoints), the owner's two taps on a courier booking. Both answer with the shop's view
 * of the booking; the customer's phone is refused (`409 other_side`).
 */
const url = (number: string, action: string) => `${BOOKINGS_ENDPOINT}${encodeURIComponent(number)}/${action}`;

/** Packed, with the number on the seal. `seal_required`, `capture_missing` (the record with the seal shot is not in yet). A repeat is 200. */
export async function markPacked(number: string, seal: string): Promise<BookingShop> {
  return (await axiosInstance.post<{ booking: BookingShop }>(url(number, "packed/"), { seal })).data.booking;
}

/** The bag went with the rider the desk named: a photo of it at the bike. From `rider_assigned`, with a seal. */
export async function handedToRider(number: string, photo: string): Promise<BookingShop> {
  return (await axiosInstance.post<{ booking: BookingShop }>(url(number, "handed-to-rider/"), { photo })).data.booking;
}
