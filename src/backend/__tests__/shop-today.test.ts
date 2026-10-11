import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import {
  askWindowChange,
  answerCustomerWindowChange,
  cancelShopBooking,
  fetchShopBookings,
  fetchShopCancelWarning,
  fetchShopCounts,
} from "../shop-bookings";
import { blockReturned, extendBlock, fetchFree, fetchPickerProducts, fetchToday, makeBlock } from "../shop-today";

jest.mock("@/context/global-context", () => ({ useGlobalContext: jest.fn() }));
jest.mock("@/lib/config", () => ({
  SHOP_LIVE_ENDPOINT: "https://api.test/shop/live/",
  SHOP_BOOKINGS_ENDPOINT: "https://api.test/shop/bookings/",
  SHOP_TODAY_ENDPOINT: "https://api.test/shop/today/",
  SHOP_BLOCKS_ENDPOINT: "https://api.test/shop/blocks/",
  MY_PRODUCTS_ENDPOINT: "https://api.test/my/products/",
  BOOKINGS_ENDPOINT: "https://api.test/bookings/",
}));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const api = axiosInstance as unknown as { get: Call; post: Call; patch: Call };

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: { block: { id: 88 }, booking: { number: "RN-24831" }, warning: { text: [] } } });
  api.patch.mockResolvedValue({ data: { block: { id: 88 } } });
});

describe("Today and the quick block calls", () => {
  it("reads the feed", async () => {
    await fetchToday();
    expect(api.get).toHaveBeenCalledWith("https://api.test/shop/today/");
  });

  it("asks how many units are free on the days", async () => {
    await fetchFree("PRO_tr1p0d", "2026-10-13", "2026-10-15");
    expect(api.get).toHaveBeenCalledWith("https://api.test/shop/blocks/free/", {
      params: { product: "PRO_tr1p0d", first_day: "2026-10-13", last_day: "2026-10-15" },
    });
  });

  it("makes the counter rental with the one-tap call, and any other block with the general one", async () => {
    await makeBlock({ path: "counter", body: { product: "PRO_tr1p0d", last_day: "2026-10-15" } });
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/shop/blocks/counter/", {
      product: "PRO_tr1p0d",
      last_day: "2026-10-15",
    });
    await makeBlock({
      path: "block",
      body: { product: "PRO_tr1p0d", quantity: 2, first_day: "2026-10-13", last_day: "2026-10-15", reason: "repair" },
    });
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/shop/blocks/", {
      product: "PRO_tr1p0d",
      quantity: 2,
      first_day: "2026-10-13",
      last_day: "2026-10-15",
      reason: "repair",
    });
  });

  it("extends and returns a block", async () => {
    await extendBlock(88, "2026-10-16");
    expect(api.patch).toHaveBeenCalledWith("https://api.test/shop/blocks/88/", { last_day: "2026-10-16" });
    await blockReturned(88);
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/shop/blocks/88/returned/", {});
  });

  it("reads the picker's items from the owner's own list, which any owner may call, every page", async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          total_pages: 2,
          results: [
            { name: "PRO_1", title: "Canon R6 body", status: "live", quantity: 2, shop_code: "CAM-01" },
            { name: "PRO_2", title: "A draft", status: "draft", quantity: 1 },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { total_pages: 2, results: [{ name: "PRO_3", title: "Tripod", status: "paused", quantity: 3 }] } });
    const found = await fetchPickerProducts();
    expect(found.map((p) => p.name)).toEqual(["PRO_1", "PRO_3"]);
    expect(api.get).toHaveBeenNthCalledWith(1, "https://api.test/my/products/", { params: { page: 1, page_size: 100 } });
    expect(api.get).toHaveBeenNthCalledWith(2, "https://api.test/my/products/", { params: { page: 2, page_size: 100 } });
    // Never the merchants-only list: a person renting out their own things would get a 403 from it.
    expect(api.get.mock.calls.every(([url]) => !String(url).includes("/shop/"))).toBe(true);
  });

  it("reads a list the server sends bare, and one with no pages", async () => {
    api.get.mockResolvedValueOnce({ data: [{ name: "PRO_1", title: "Canon R6 body" }] });
    expect((await fetchPickerProducts()).map((p) => p.name)).toEqual(["PRO_1"]);
    api.get.mockResolvedValueOnce({ data: { results: [{ name: "PRO_2", title: "Tripod" }] } });
    expect((await fetchPickerProducts()).map((p) => p.name)).toEqual(["PRO_2"]);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});

describe("the shop's bookings calls", () => {
  it("reads a tab a page at a time, and the counts", async () => {
    await fetchShopBookings("ready", 2);
    expect(api.get).toHaveBeenCalledWith("https://api.test/shop/bookings/", { params: { stage: "ready", page: 2, page_size: 20 } });
    await fetchShopCounts();
    expect(api.get).toHaveBeenLastCalledWith("https://api.test/shop/bookings/counts/");
  });

  it("reads what cancelling would do, then cancels with confirm: true", async () => {
    await fetchShopCancelWarning("RN-24831");
    expect(api.get).toHaveBeenCalledWith("https://api.test/shop/bookings/RN-24831/cancel/");
    expect((await cancelShopBooking("RN-24831")).number).toBe("RN-24831");
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/shop/bookings/RN-24831/cancel/", { confirm: true });
  });

  it("asks to move the window, and answers the customer's request", async () => {
    await askWindowChange("RN-24831", "2026-10-24T06:30:00Z");
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/bookings/RN-24831/window-change/", {
      start: "2026-10-24T06:30:00Z",
    });
    await answerCustomerWindowChange("RN-24831", false);
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/bookings/RN-24831/window-change/answer/", { accept: false });
  });
});
