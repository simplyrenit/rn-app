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
  forgetPayment,
  notePayment,
  parsePayReturn,
  resumePayment,
  startPayment,
  watchStrayReturns,
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
    // The QA server's own link, which only the QA build answers.
    expect(parsePayReturn(`renit-qa://pay/return?payment_id=${PAY_ID}`)?.payment_id).toBe(PAY_ID);
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

describe("the notes of payments in flight", () => {
  const KEY = "renit-pending-payment";
  const A = { user: "asha", booking: "RN-24831", payment_id: PAY_ID };
  const B = { user: "asha", booking: "RN-24832", payment_id: "pay_B" };
  /** AsyncStorage as a map, so what one call writes the next one reads. */
  let store: Map<string, string>;
  const notes = () => JSON.parse(store.get(KEY) ?? "[]") as { booking: string; payment_id: string }[];
  const keep = (...list: object[]) => store.set(KEY, JSON.stringify(list.map((n) => ({ at: Date.now(), ...n }))));
  const paidFor = (status: PaymentStatus) => post.mockResolvedValue(answer(status));

  beforeEach(() => {
    jest.clearAllMocks();
    store = new Map();
    storage.getItem.mockImplementation(async (key: string) => store.get(key) ?? null);
    storage.setItem.mockImplementation(async (key: string, value: string) => void store.set(key, value));
    storage.removeItem.mockImplementation(async (key: string) => void store.delete(key));
  });

  it("keeps whose payment it is, the booking and the payment id, and no pay page", async () => {
    await notePayment("asha", "RN-24831", PAY_ID);
    expect(notes()).toEqual([expect.objectContaining(A)]);
    expect(store.get(KEY)).not.toMatch(/checkout|expires/);
  });

  it("keeps a second payment in flight beside the first, and one noted again as the newest", async () => {
    await notePayment("asha", A.booking, A.payment_id);
    await notePayment("asha", B.booking, B.payment_id);
    expect(notes().map((n) => n.payment_id)).toEqual([PAY_ID, "pay_B"]);
    await notePayment("asha", A.booking, A.payment_id);
    expect(notes().map((n) => n.payment_id)).toEqual(["pay_B", PAY_ID]);
  });

  it("keeps the five newest", async () => {
    for (let i = 1; i <= 6; i++) await notePayment("asha", `RN-${i}`, `pay_${i}`);
    expect(notes().map((n) => n.payment_id)).toEqual(["pay_2", "pay_3", "pay_4", "pay_5", "pay_6"]);
  });

  it("forgets one payment and leaves the others in flight", async () => {
    keep(A, B);
    await forgetPayment(PAY_ID);
    expect(notes().map((n) => n.payment_id)).toEqual(["pay_B"]);
    await forgetPayment("pay_B");
    expect(store.has(KEY)).toBe(false);
  });

  it("loses neither change when a note and a forget run together", async () => {
    keep(A);
    await Promise.all([notePayment("asha", B.booking, B.payment_id), forgetPayment(PAY_ID)]);
    expect(notes().map((n) => n.payment_id)).toEqual(["pay_B"]);
  });

  it("on app start asks rn-api once about the newest and names its booking", async () => {
    keep(A, B);
    paidFor("paid");
    await expect(resumePayment("asha")).resolves.toBe("RN-24832");
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("https://api.test/payments/pay_B/confirm/", {});
    // Settled, so forgotten; the other card's payment is still in flight.
    expect(notes().map((n) => n.payment_id)).toEqual([PAY_ID]);
  });

  it("resumes the payment the return link names, not the newest, and keeps the other (QA 5)", async () => {
    keep(A, B);
    paidFor("paid");
    await expect(resumePayment("asha", PAY_ID)).resolves.toBe("RN-24831");
    expect(post).toHaveBeenCalledWith(`https://api.test/payments/${PAY_ID}/confirm/`, {});
    expect(notes().map((n) => n.payment_id)).toEqual(["pay_B"]);
  });

  it("opens nothing for a return link whose payment it has no note of", async () => {
    keep(A);
    await expect(resumePayment("asha", "pay_unknown")).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it("keeps the note while the payment is still open, or failed and can be tried again", async () => {
    keep(A);
    paidFor("created");
    await expect(resumePayment("asha")).resolves.toBe("RN-24831");
    paidFor("failed");
    await expect(resumePayment("asha")).resolves.toBe("RN-24831");
    expect(notes()).toHaveLength(1);
  });

  it("never sends another account on this phone to someone else's booking", async () => {
    keep(A);
    await expect(resumePayment("ravi")).resolves.toBeNull();
    await expect(resumePayment("ravi", PAY_ID)).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
    // Left for its owner.
    expect(notes()).toHaveLength(1);
  });

  it("does not ask about a note a day old, and tidies it away at the next change", async () => {
    keep({ ...A, at: Date.now() - 25 * 60 * 60 * 1000 });
    await expect(resumePayment("asha")).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
    await notePayment("asha", B.booking, B.payment_id);
    expect(notes().map((n) => n.payment_id)).toEqual(["pay_B"]);
  });

  it("reads the one note a build before the list left", async () => {
    store.set(KEY, JSON.stringify({ ...A, at: Date.now() }));
    paidFor("created");
    await expect(resumePayment("asha")).resolves.toBe("RN-24831");
  });

  it("still opens the booking when rn-api cannot be reached", async () => {
    keep(A);
    post.mockRejectedValue(new Error("Network Error"));
    await expect(resumePayment("asha")).resolves.toBe("RN-24831");
  });

  it("does nothing on app start when no payment was in flight", async () => {
    await expect(resumePayment("asha")).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

describe("watchStrayReturns", () => {
  let onUrl: (event: { url: string }) => void;
  let remove: Mock;
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  const notes = [
    { user: "yash", booking: "RN-24831", payment_id: PAY_ID, at: Date.now() },
    { user: "yash", booking: "RN-24832", payment_id: "pay_B", at: Date.now() },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    remove = jest.fn() as Mock;
    jest.spyOn(Linking, "addEventListener").mockImplementation(((_type: string, handler: typeof onUrl) => {
      onUrl = handler;
      return { remove };
    }) as never);
    jest.spyOn(AppState, "addEventListener").mockImplementation((() => ({ remove: jest.fn() })) as never);
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    storage.getItem.mockResolvedValue(JSON.stringify(notes));
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("asks rn-api once for a return link nobody was waiting on, and gives the booking to open", async () => {
    post.mockResolvedValue(answer("paid"));
    const opened = jest.fn();
    watchStrayReturns("yash", opened);
    onUrl({ url: `renit://pay/return?payment_id=${PAY_ID}&status=paid` });
    await settle();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(`https://api.test/payments/${PAY_ID}/confirm/`, {});
    expect(opened).toHaveBeenCalledWith("RN-24831");
  });

  it("opens the booking of the payment the link names, not the newest note's", async () => {
    post.mockResolvedValue(answer("paid"));
    const opened = jest.fn();
    watchStrayReturns("yash", opened);
    onUrl({ url: "renit://pay/return?payment_id=pay_B" });
    await settle();
    expect(post).toHaveBeenCalledWith("https://api.test/payments/pay_B/confirm/", {});
    expect(opened).toHaveBeenCalledWith("RN-24832");
  });

  it("leaves other links alone, and does not ask while startPayment is waiting for this payment", async () => {
    post.mockResolvedValue(answer("paid"));
    const opened = jest.fn();
    watchStrayReturns("yash", opened);
    const watcherUrl = onUrl;
    watcherUrl({ url: "renit://product/PRO_1" });
    await settle();
    expect(post).not.toHaveBeenCalled();

    // startPayment registers its own listener after the watcher's, so `onUrl` is now that one.
    const waiting = startPayment(payment());
    await settle();
    watcherUrl({ url: `renit://pay/return?payment_id=${PAY_ID}` });
    await settle();
    expect(post).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
    onUrl({ url: `renit://pay/return?payment_id=${PAY_ID}` });
    await expect(waiting).resolves.toBe("paid");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("opens nothing after it was stopped, and marks nothing paid on its own", async () => {
    post.mockResolvedValue(answer("created"));
    const opened = jest.fn();
    const stop = watchStrayReturns("yash", opened);
    const link = onUrl;
    link({ url: `renit://pay/return?payment_id=${PAY_ID}&status=paid` });
    stop();
    await settle();
    expect(remove).toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
  });
});
