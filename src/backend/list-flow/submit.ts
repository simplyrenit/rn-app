import { POST_MY_PRODUCTS } from "@/lib/config";
import { CreatePayload } from "@/lib/list-flow/payload";
import axiosInstance from "@/lib/networkUtils";

export { buildCreatePayload } from "@/lib/list-flow/payload";
export type { CreatePayload, ContactDetails } from "@/lib/list-flow/payload";

/**
 * Create the listing. 90 s, not the instance's 30: create still runs image
 * moderation and a Nominatim lookup inside the request (§7.5).
 */
export async function submitListing(payload: CreatePayload) {
  const response = await axiosInstance.post(POST_MY_PRODUCTS, payload, {
    timeout: 90_000,
  });
  return response;
}
