import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { bookNow, fetchBooking, fetchQuote } from "../bookings";

jest.mock("@/context/global-context", () => ({ useGlobalContext: jest.fn() }));
jest.mock("@/lib/config", () => ({
  BOOKINGS_ENDPOINT: "https://api.test/bookings/",
  GET_PRODUCT_DETAILS: "https://api.test/products/",
}));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const api = axiosInstance as unknown as { get: Call; post: Call };

const dates = {
  product: "PRO_8fk2Lq",
  first_day: "2026-10-24",
  last_day: "2026-10-26",
  delivery_mode: "pickup" as const,
  address_id: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: {} });
});

describe("fetchQuote", () => {
  it("posts the contract's body, with no extension", async () => {
    await fetchQuote({ ...dates, delivery_mode: "owner_delivery", address_id: 17 });
    expect(api.post).toHaveBeenCalledWith("https://api.test/bookings/quote/", {
      product: "PRO_8fk2Lq",
      first_day: "2026-10-24",
      last_day: "2026-10-26",
      delivery_mode: "owner_delivery",
      address_id: 17,
      extends: null,
    });
  });
});

describe("bookNow", () => {
  it("sends the total the customer saw, the terms version and the tap's key", async () => {
    await bookNow({
      ...dates,
      terms_version: "2026-10",
      expected_total: "1830.00",
      moved_from: null,
      client_key: "7f6a1d0e-3b52-4c1e-8a55-2f0b9c4d1e77",
    });
    expect(api.post).toHaveBeenCalledWith("https://api.test/bookings/book/", {
      product: "PRO_8fk2Lq",
      first_day: "2026-10-24",
      last_day: "2026-10-26",
      delivery_mode: "pickup",
      address_id: null,
      terms_version: "2026-10",
      expected_total: "1830.00",
      moved_from: null,
      client_key: "7f6a1d0e-3b52-4c1e-8a55-2f0b9c4d1e77",
    });
  });
});

describe("fetchBooking", () => {
  it("reads one booking by its number", async () => {
    await fetchBooking("RN-24831");
    expect(api.get).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/");
  });
});
