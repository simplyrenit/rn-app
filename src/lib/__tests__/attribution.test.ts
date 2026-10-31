import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockStore: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore[key] = value;
    }),
  },
}));
jest.mock("expo-application", () => ({
  getInstallReferrerAsync: jest.fn(async () => "utm_source=qr&utm_content=U9"),
}));
let mockNewInstall = false;
jest.mock("@/lib/device", () => ({ getDeviceInfo: jest.fn(), deviceIdMadeThisRun: () => mockNewInstall }));
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
const mockTrack = jest.fn();
jest.mock("@/lib/events", () => ({ track: (...args: unknown[]) => mockTrack(...args) }));

import {
  currentSource,
  parseReferrer,
  parseShopLink,
  sendAttribution,
  startAttribution,
  takeLink,
  withSource,
} from "../attribution";

describe("parseShopLink", () => {
  it("reads a shop and a product link of either scheme, with their source", () => {
    expect(parseShopLink("renit://shop/U123?src=qr")).toEqual({
      route: { screen: "UserDetail", id: "U123" },
      src: "qr",
      shop: "U123",
    });
    expect(parseShopLink("renit-qa://product/PRO_ab?src=wa")).toEqual({
      route: { screen: "ProductDetail", id: "PRO_ab" },
      src: "wa",
      shop: null,
    });
  });

  it("keeps the link but drops a source it doesn't know", () => {
    expect(parseShopLink("renit://shop/U1?src=instagram")?.src).toBeNull();
    expect(parseShopLink("renit://shop/U1")?.src).toBeNull();
  });

  it("is not the pay or KYC return, nor the dev client", () => {
    expect(parseShopLink("renit://pay/return?payment_id=1")).toBeNull();
    expect(parseShopLink("renit://kyc/return?result=success")).toBeNull();
    expect(parseShopLink("renit://expo-development-client/?url=x")).toBeNull();
    expect(parseShopLink(null)).toBeNull();
    expect(parseShopLink("renit://shop/%E0?src=qr")).toBeNull();
    expect(parseShopLink("renit://shop/U1?src=%E0")?.src).toBeNull();
  });
});

describe("parseReferrer", () => {
  it("reads the shop page's Play referrer", () => {
    expect(parseReferrer("utm_source=qr&utm_content=U123")).toEqual({ src: "qr", shop: "U123" });
    expect(parseReferrer("utm_source=google-play&utm_medium=organic")).toBeNull();
    expect(parseReferrer(null)).toBeNull();
  });
});

describe("the saved source", () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStore)) delete mockStore[key];
    mockTrack.mockClear();
  });

  it("is the last link's for 30 days, then nothing", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    await takeLink("renit://shop/U1?src=qr");
    await takeLink("renit://shop/U2?src=wa");
    expect(await currentSource()).toBe("wa");

    now.mockReturnValue(1_000_000 + 31 * 24 * 60 * 60 * 1000);
    expect(await currentSource()).toBeUndefined();
    now.mockRestore();
  });

  it("is sent once, signed in", async () => {
    await takeLink("renit://shop/U1?src=qr");
    await sendAttribution();
    await sendAttribution();

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("link_attributed", { src: "qr", install: false, shop: "U1" });
  });

  it("keeps an Android install's credit when the page's link comes next, before sign-in", async () => {
    mockNewInstall = true;
    expect(await startAttribution()).toEqual({ screen: "UserDetail", id: "U9" });
    await takeLink("renit://shop/U9?src=qr");
    await sendAttribution();
    mockNewInstall = false;

    expect(mockTrack).toHaveBeenCalledWith("link_attributed", { src: "qr", install: true, shop: "U9" });
  });

  it("is sent once when sign-in and a link ask together", async () => {
    await takeLink("renit://shop/U1?src=qr");
    await Promise.all([sendAttribution(), sendAttribution()]);

    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it("does not count the same link handed back minutes later", async () => {
    await takeLink("renit://shop/U1?src=qr");
    await sendAttribution();
    await takeLink("renit://shop/U1?src=qr");
    await sendAttribution();

    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it("is not saved from a link with no source", async () => {
    expect(await takeLink("renit://product/P1")).toEqual({ screen: "ProductDetail", id: "P1" });
    expect(await currentSource()).toBeUndefined();
  });
});

describe("withSource", () => {
  it("tags a page link", () => {
    expect(withSource("https://x.test/s/12/", "wa")).toBe("https://x.test/s/12/?src=wa");
  });
});
