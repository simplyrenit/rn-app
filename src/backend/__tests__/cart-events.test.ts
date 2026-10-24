import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { track } from "@/lib/events";
import { addCartLine, deleteLine } from "../cart";

jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { put: jest.fn(), delete: jest.fn() } }));
jest.mock("@/lib/config", () => ({ CART_ENDPOINT: "https://api.test/cart/" }));
jest.mock("@/lib/events", () => ({ track: jest.fn() }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({}) }));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const http = axiosInstance as unknown as { put: Call; delete: Call };
const CART = { count: 1, cards: [] };

/** What axios throws for an answered request. */
const answered = (status: number, body: unknown) =>
  Object.assign(new Error(`HTTP ${status}`), { isAxiosError: true, response: { status, data: body } });

beforeEach(() => {
  jest.clearAllMocks();
});

// The props must be exactly the catalogue's (rn-api `events/catalogue.py`, ENG-321): an extra one is refused.
describe("the cart's events", () => {
  it("an add sends cart_add with the listing's name", async () => {
    http.put.mockResolvedValue({ data: CART });
    await expect(addCartLine("PRO_1")).resolves.toBe(CART);
    expect(http.put).toHaveBeenCalledWith("https://api.test/cart/lines/PRO_1/");
    expect(track).toHaveBeenCalledWith("cart_add", { product: "PRO_1" });
  });

  it("a refused add sends the API's code, and the status or network when there is none", async () => {
    http.put.mockRejectedValueOnce(answered(409, { error: { code: "shop_not_ready", message: "No." } }));
    await expect(addCartLine("PRO_1")).rejects.toThrow();
    http.put.mockRejectedValueOnce(answered(502, "<html>"));
    await expect(addCartLine("PRO_1")).rejects.toThrow();
    http.put.mockRejectedValueOnce(Object.assign(new Error("Network Error"), { isAxiosError: true }));
    await expect(addCartLine("PRO_1")).rejects.toThrow();
    expect(jest.mocked(track).mock.calls).toEqual([
      ["cart_add_failed", { product: "PRO_1", code: "shop_not_ready" }],
      ["cart_add_failed", { product: "PRO_1", code: 502 }],
      ["cart_add_failed", { product: "PRO_1", code: "network" }],
    ]);
  });

  it("a remove sends cart_remove; one that failed sends nothing", async () => {
    http.delete.mockResolvedValueOnce({ data: CART });
    await deleteLine("PRO_1");
    http.delete.mockRejectedValueOnce(answered(500, {}));
    await expect(deleteLine("PRO_2")).rejects.toThrow();
    expect(jest.mocked(track).mock.calls).toEqual([["cart_remove", { product: "PRO_1" }]]);
  });
});
