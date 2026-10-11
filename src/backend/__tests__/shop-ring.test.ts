import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { acceptBooking, fetchLive, fetchShopBooking, refuseBooking } from "../shop-ring";

jest.mock("@/context/global-context", () => ({ useGlobalContext: jest.fn() }));
jest.mock("@/lib/config", () => ({
  SHOP_LIVE_ENDPOINT: "https://api.test/shop/live/",
  SHOP_BOOKINGS_ENDPOINT: "https://api.test/shop/bookings/",
}));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const api = axiosInstance as unknown as { get: Call; post: Call };

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: { booking: { number: "RN-24831" }, block: null } });
});

describe("the shop's ring calls", () => {
  it("reads the live channel and one booking", async () => {
    await fetchLive();
    expect(api.get).toHaveBeenCalledWith("https://api.test/shop/live/");
    await fetchShopBooking("RN-24831");
    expect(api.get).toHaveBeenCalledWith("https://api.test/shop/bookings/RN-24831/");
  });

  it("accepts with an empty body and returns the booking", async () => {
    expect((await acceptBooking("RN-24831")).number).toBe("RN-24831");
    expect(api.post).toHaveBeenCalledWith("https://api.test/shop/bookings/RN-24831/accept/", {});
  });

  it("refuses with the reason and whether to block one unit", async () => {
    await refuseBooking("RN-24831", "not_available", true);
    expect(api.post).toHaveBeenCalledWith("https://api.test/shop/bookings/RN-24831/refuse/", {
      reason: "not_available",
      block_dates: true,
    });
    await refuseBooking("RN-24831", "other", true);
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/shop/bookings/RN-24831/refuse/", {
      reason: "other",
      block_dates: false,
    });
  });
});
