import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { QueryClient } from "react-query";
import { dismissRingNotifications } from "@/backend/notifications";
import { refreshShop } from "@/backend/shop-today";
import type { Ring } from "@/lib/shop-ring";
import {
  acceptBooking,
  acceptRing,
  fetchLive,
  fetchShopBooking,
  refuseBooking,
  ringEndedQueryKey,
  settleRing,
  shopBookingQueryKey,
} from "../shop-ring";

jest.mock("@/context/global-context", () => ({ useGlobalContext: jest.fn() }));
jest.mock("@/backend/notifications", () => ({ dismissRingNotifications: jest.fn(async () => undefined) }));
jest.mock("@/backend/shop-today", () => ({ refreshShop: jest.fn() }));
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

// No garbage-collection timers left behind by the cache.
const client = () => new QueryClient({ defaultOptions: { queries: { cacheTime: Infinity } } });

describe("the shared accept (ring screen and Today's inline Accept)", () => {
  const line = (id: number) => ({ id, n: id, ref: `L${id}`, product: { name: null, title: `Item ${id}`, cover_image: null }, rent: "100.00", deposit: "0.00", state: "live" });
  const one = { number: "RN-24852" } as unknown as Ring;
  const basket = { number: "RN-24831", lines: [line(1), line(2), line(3)] } as unknown as Ring;
  const booking = {
    number: "RN-24852",
    answered: { at: "2026-11-22T10:40:00+05:30" },
    money: { rent_due_at: null },
    server_time: "2026-11-22T10:40:00+05:30",
  };

  beforeEach(() => {
    api.post.mockResolvedValue({ data: { booking } });
  });

  it("sends {} for one item, caches the booking and writes the accepted ending", async () => {
    const qc = client();
    expect(await acceptRing(qc, "RN-24852", one)).toBe(booking);
    expect(api.post).toHaveBeenCalledWith("https://api.test/shop/bookings/RN-24852/accept/", {});
    expect(qc.getQueryData(shopBookingQueryKey("RN-24852"))).toBe(booking);
    expect(qc.getQueryData(ringEndedQueryKey("RN-24852"))).toMatchObject({
      outcome: "accepted",
      where: "this phone",
      thisDevice: true,
      at: "2026-11-22T10:40:00+05:30",
    });
  });

  it("sends a basket's ticked lines, and {} without a ring", async () => {
    const qc = client();
    await acceptRing(qc, "RN-24831", basket, [1, 3]);
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/shop/bookings/RN-24831/accept/", { lines: [1, 3] });
    await acceptRing(qc, "RN-24831", null);
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/shop/bookings/RN-24831/accept/", {});
  });

  it("writes nothing when the accept fails", async () => {
    const qc = client();
    api.post.mockRejectedValueOnce(new Error("409"));
    await expect(acceptRing(qc, "RN-24852", one)).rejects.toThrow("409");
    expect(qc.getQueryData(ringEndedQueryKey("RN-24852"))).toBeUndefined();
  });

  it("settles: the ring's notifications go and the shop is read again", () => {
    const qc = client();
    settleRing(qc, "RN-24852");
    expect(dismissRingNotifications).toHaveBeenCalledWith("RN-24852");
    expect(refreshShop).toHaveBeenCalledWith(qc);
  });
});
