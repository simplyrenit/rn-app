import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Linking } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock("../config", () => ({ PAYMENTS_ENDPOINT: "https://api.test/payments/" }));
jest.mock("../networkUtils", () => ({ __esModule: true, default: { post: jest.fn() } }));

import axiosInstance from "../networkUtils";
import {
  PaymentStatus,
  askUntilSettled,
  notePayment,
  parsePayReturn,
  resumePayment,
  startPayment,
} from "../payments";

type Mock = jest.MockedFunction<(...args: any[]) => any>;
const post = (axiosInstance as unknown as { post: Mock }).post;
const storage = AsyncStorage as unknown as { getItem: Mock; setItem: Mock; removeItem: Mock };

const PAY_ID = "pay_01JA2K7Q9ZP3V8M4T6X1B5C0DE";
const CHECKOUT = "https://pay-qa.toratora.site/c/ckt_8Zq1mN4xT7vB2cR5";
const payment = (over: Partial<{ payment_id: string; expires_at: string }> = {}) => ({
  payment_id: PAY_ID,
  checkout_url: CHECKOUT,
  expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
  ...over,
});
const answer = (status: PaymentStatus) => ({ data: { payment: { id: PAY_ID, status }, booking: { number: "RN-24831" } } });

describe("parsePayReturn", () => {
  it("reads the payment id from the return link", () => {
    expect(parsePayReturn(`renit://pay/return?payment_id=${PAY_ID}&status=paid`)).toEqual({
      payment_id: PAY_ID,
      status: "paid",
    });
    expect(parsePayReturn(`renit://pay/return/?status=open&payment_id=${PAY_ID}`)?.payment_id).toBe(PAY_ID);
  });

  it("ignores every other link, and one with no payment id", () => {
    expect(parsePayReturn("renit://pay/returned?payment_id=x")).toBeNull();
    expect(parsePayReturn("renit://product/PRO_1?payment_id=x")).toBeNull();
    expect(parsePayReturn("renit://pay/return?status=paid")).toBeNull();
    expect(parsePayReturn("renit://pay/return")).toBeNull();
    expect(parsePayReturn(null)).toBeNull();
  });
});

describe("askUntilSettled", () => {
  /** A clock the test moves by sleeping, so a minute of asking runs at once. */
  const clock = () => {
    let at = 0;
    return { now: () => at, sleep: async (ms: number) => void (at += ms) };
  };

  it("returns the first answer that is not `created`", async () => {
    const ask = jest.fn<() => Promise<PaymentStatus>>().mockResolvedValueOnce("created").mockResolvedValueOnce("paid");
    await expect(askUntilSettled(ask, clock())).resolves.toBe("paid");
    expect(ask).toHaveBeenCalledTimes(2);
  });

  it("asks every 3 seconds for a minute, then says the bank is still pending", async () => {
    const ask = jest.fn<() => Promise<PaymentStatus>>().mockResolvedValue("created");
    const time = clock();
    await expect(askUntilSettled(ask, time)).resolves.toBe("pending");
    // At 0, 3, 6 … 60 seconds.
    expect(ask).toHaveBeenCalledTimes(21);
    expect(time.now()).toBe(60_000);
  });

  it("asks again after a call that failed, and never calls that a failed payment", async () => {
    const ask = jest
      .fn<() => Promise<PaymentStatus>>()
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce("paid");
    await expect(askUntilSettled(ask, clock())).resolves.toBe("paid");
    const down = jest.fn<() => Promise<PaymentStatus>>().mockRejectedValue(new Error("Network Error"));
    await expect(askUntilSettled(down, clock())).resolves.toBe("pending");
  });

  it("passes on failed, expired and cancelled as they are", async () => {
    for (const status of ["failed", "expired", "cancelled"] as const) {
      const ask = jest.fn<() => Promise<PaymentStatus>>().mockResolvedValue(status);
      await expect(askUntilSettled(ask, clock())).resolves.toBe(status);
    }
  });
});

describe("startPayment", () => {
  let onUrl: (event: { url: string }) => void;
  let onState: (state: string) => void;
  let openURL: Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never) as unknown as Mock;
    jest.spyOn(Linking, "addEventListener").mockImplementation(((_type: string, handler: typeof onUrl) => {
      onUrl = handler;
      return { remove: jest.fn() };
    }) as never);
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_type: string, handler: typeof onState) => {
      onState = handler;
      return { remove: jest.fn() };
    }) as never);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Lets the awaited `openURL` finish, so the function is waiting for the customer. */
  const away = () => new Promise((resolve) => setImmediate(resolve));

  it("opens the pay page as given, and asks rn-api when the app comes back to the front", async () => {
    post.mockResolvedValue(answer("paid"));
    const result = startPayment(payment());
    await away();
    expect(openURL).toHaveBeenCalledWith(CHECKOUT);
    expect(post).not.toHaveBeenCalled();

    onState("background");
    onState("active");
    await expect(result).resolves.toBe("paid");
    expect(post).toHaveBeenCalledWith(`https://api.test/payments/${PAY_ID}/confirm/`, {});
  });

  it("does not take the app being in front already as the customer coming back", async () => {
    post.mockResolvedValue(answer("paid"));
    const result = startPayment(payment());
    await away();
    onState("active");
    await away();
    expect(post).not.toHaveBeenCalled();
    onState("inactive");
    onState("active");
    await expect(result).resolves.toBe("paid");
  });

  it("starts asking on the return link for this payment, and only this one", async () => {
    post.mockResolvedValue(answer("paid"));
    const result = startPayment(payment());
    await away();
    onUrl({ url: "renit://pay/return?payment_id=pay_other&status=paid" });
    await away();
    expect(post).not.toHaveBeenCalled();
    onUrl({ url: `renit://pay/return?payment_id=${PAY_ID}&status=open` });
    await expect(result).resolves.toBe("paid");
  });

  it("never believes the link's status: only rn-api's answer counts", async () => {
    post.mockResolvedValue(answer("failed"));
    const result = startPayment(payment());
    await away();
    onUrl({ url: `renit://pay/return?payment_id=${PAY_ID}&status=paid` });
    await expect(result).resolves.toBe("failed");
  });

  it("opens the page once for a double tap", async () => {
    post.mockResolvedValue(answer("paid"));
    const first = startPayment(payment());
    const second = startPayment(payment());
    await away();
    expect(openURL).toHaveBeenCalledTimes(1);
    onState("background");
    onState("active");
    await expect(Promise.all([first, second])).resolves.toEqual(["paid", "paid"]);
  });

  it("opens a page the phone's clock thinks has run out: the server just handed it out", async () => {
    // A phone set twenty minutes ahead sees a 15-minute page as already over.
    post.mockResolvedValue(answer("paid"));
    const result = startPayment(payment({ expires_at: "2020-01-01T00:00:00Z" }));
    await away();
    expect(openURL).toHaveBeenCalledWith(CHECKOUT);
    onState("background");
    onState("active");
    await expect(result).resolves.toBe("paid");
  });

  it("says a page has run out only when rn-api does", async () => {
    post.mockResolvedValue(answer("expired"));
    const result = startPayment(payment());
    await away();
    onState("background");
    onState("active");
    await expect(result).resolves.toBe("expired");
  });

  it("answers failed when the page cannot be opened", async () => {
    openURL.mockRejectedValue(new Error("No browser"));
    await expect(startPayment(payment())).resolves.toBe("failed");
    expect(post).not.toHaveBeenCalled();
  });
});

describe("the note of a payment in flight", () => {
  const note = (over: Record<string, unknown> = {}) =>
    JSON.stringify({ user: "asha", booking: "RN-24831", payment_id: PAY_ID, at: Date.now(), ...over });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps whose payment it is, the booking and the payment id, and no pay page", async () => {
    await notePayment("asha", "RN-24831", PAY_ID);
    const [key, value] = storage.setItem.mock.calls[0];
    expect(key).toBe("renit-pending-payment");
    expect(JSON.parse(value)).toMatchObject({ user: "asha", booking: "RN-24831", payment_id: PAY_ID });
    expect(value).not.toMatch(/checkout|expires/);
  });

  it("on app start asks rn-api once and names the booking to open", async () => {
    storage.getItem.mockResolvedValue(note());
    post.mockResolvedValue(answer("paid"));
    await expect(resumePayment("asha")).resolves.toBe("RN-24831");
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(`https://api.test/payments/${PAY_ID}/confirm/`, {});
    expect(storage.removeItem).toHaveBeenCalled();
  });

  it("keeps the note while the payment is still open", async () => {
    storage.getItem.mockResolvedValue(note());
    post.mockResolvedValue(answer("created"));
    await expect(resumePayment("asha")).resolves.toBe("RN-24831");
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("never sends another account on this phone to someone else's booking", async () => {
    storage.getItem.mockResolvedValue(note());
    await expect(resumePayment("ravi")).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
    // Left for its owner.
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("tidies away a note a day old without asking about it", async () => {
    storage.getItem.mockResolvedValue(note({ at: Date.now() - 25 * 60 * 60 * 1000 }));
    await expect(resumePayment("asha")).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith("renit-pending-payment");
  });

  it("still opens the booking when rn-api cannot be reached", async () => {
    storage.getItem.mockResolvedValue(note());
    post.mockRejectedValue(new Error("Network Error"));
    await expect(resumePayment("asha")).resolves.toBe("RN-24831");
  });

  it("does nothing on app start when no payment was in flight", async () => {
    storage.getItem.mockResolvedValue(null);
    await expect(resumePayment("asha")).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});
