import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import {
  bookNow,
  cancelBooking,
  readUntilRefund,
  fetchAlternatives,
  fetchBooking,
  fetchBookings,
  fetchCancelOutcome,
  answerWindowChange,
  fetchQuote,
  fetchWindows,
  payRent,
  refundBookingAmount,
  requestWindowChange,
  setWindow,
} from "../bookings";

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

describe("cancelling", () => {
  it("asks what cancelling would cost without changing anything", async () => {
    api.get.mockResolvedValue({ data: { outcome: { case: "ringing", back: [], kept: [], to_owner: "0.00" } } });
    await expect(fetchCancelOutcome("RN-24831")).resolves.toMatchObject({ case: "ringing" });
    expect(api.get).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/cancel/");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("cancels saying which outcome the customer saw", async () => {
    api.post.mockResolvedValue({
      data: { booking: { number: "RN-24831", exit: "cancelled_by_customer" }, outcome: { case: "free", back: [], kept: [] } },
    });
    await expect(cancelBooking("RN-24831", "free")).resolves.toMatchObject({
      booking: { exit: "cancelled_by_customer" },
      outcome: { case: "free" },
    });
    expect(api.post).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/cancel/", { case: "free" });
    // An answer with no outcome still gives the booking.
    api.post.mockResolvedValue({ data: { booking: { number: "RN-24831" } } });
    await expect(cancelBooking("RN-24831", "free")).resolves.toEqual({ booking: { number: "RN-24831" }, outcome: null });
  });

  it("reads the booking again after a cancel until the refund row is there (D-24)", async () => {
    const outcome = { case: "free" as const, back: [{ what: "rent" as const, amount: "511.00", text: null }], kept: [], to_owner: "0.00", free_until: null };
    let cached: unknown = { payments: [] };
    let reads = 0;
    const queryClient = {
      invalidateQueries: jest.fn(async () => {
        reads += 1;
        // The refund shows up on the second read, as the timed job lands.
        if (reads === 2) cached = { payments: [{ kind: "refund" }] };
      }),
      getQueryData: jest.fn(() => cached),
    };
    await readUntilRefund(queryClient as never, "RN-24831", outcome, [0, 0, 0, 0]);
    expect(reads).toBe(2);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(["booking", "RN-24831"]);
    // No refund promised: one read is enough.
    reads = 0;
    cached = { payments: [] };
    await readUntilRefund(queryClient as never, "RN-24831", { ...outcome, back: [] }, [0, 0, 0, 0]);
    expect(reads).toBe(1);
    // A refund that never shows stops at the last wait.
    reads = 0;
    queryClient.invalidateQueries.mockImplementation(async () => void (reads += 1));
    await readUntilRefund(queryClient as never, "RN-24831", outcome, [0, 0, 0]);
    expect(reads).toBe(3);
  });
});

describe("after a refusal or silence", () => {
  it("reads the other dates and owners", async () => {
    await fetchAlternatives("RN-24831");
    expect(api.get).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/alternatives/");
  });

  it("asks for the booking amount back now", async () => {
    api.post.mockResolvedValue({ data: { booking: { number: "RN-24831" } } });
    await refundBookingAmount("RN-24831");
    expect(api.post).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/refund-booking-amount/", {});
  });
});

describe("after the owner accepts", () => {
  it("asks for the rent's payment with an empty body", async () => {
    api.post.mockResolvedValue({ data: { payment: { payment_id: "pay_02" }, booking: {} } });
    await expect(payRent("RN-24831")).resolves.toMatchObject({ payment: { payment_id: "pay_02" } });
    expect(api.post).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/pay-rent/", {});
  });

  it("reads the windows, sets the first one, and asks to change it", async () => {
    api.post.mockResolvedValue({ data: { booking: { number: "RN-24831" } } });
    await fetchWindows("RN-24831");
    expect(api.get).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/windows/");
    await setWindow("RN-24831", "2026-10-24T04:30:00Z");
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/bookings/RN-24831/window/", {
      start: "2026-10-24T04:30:00Z",
    });
    await requestWindowChange("RN-24831", "2026-10-24T06:30:00Z");
    expect(api.post).toHaveBeenLastCalledWith("https://api.test/bookings/RN-24831/window-change/", {
      start: "2026-10-24T06:30:00Z",
    });
  });

  it("answers the shop's request to move the window", async () => {
    api.post.mockResolvedValue({ data: { booking: { number: "RN-24831" } } });
    await answerWindowChange("RN-24831", false);
    expect(api.post).toHaveBeenCalledWith("https://api.test/bookings/RN-24831/window-change/answer/", {
      accept: false,
    });
  });
});

describe("fetchBookings", () => {
  const page = { results: [{ number: "RN-24831" }], counts: { open: 1, past: 7 }, current_page: 1, total_pages: 1 };

  it("asks the server for the open list, a page at a time", async () => {
    api.get.mockResolvedValue({ data: page });
    await expect(fetchBookings(true)).resolves.toEqual(page);
    expect(api.get).toHaveBeenCalledWith("https://api.test/bookings/", {
      params: { open: true, page: 1, page_size: 20 },
    });
  });

  it("asks for the past list by itself, and for a later page", async () => {
    api.get.mockResolvedValue({ data: page });
    await fetchBookings(false, 3);
    expect(api.get).toHaveBeenCalledWith("https://api.test/bookings/", {
      params: { open: false, page: 3, page_size: 20 },
    });
  });
});
