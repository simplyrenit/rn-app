import { afterEach, describe, expect, it, jest } from "@jest/globals";
import axios, { AxiosResponse } from "axios";
import {
  activateFixture,
  deactivateFixture,
  installDesignFixtures,
  matchesKey,
} from "@/dev/design-fixtures/interceptor";
import { parseDevLink } from "@/dev/links";
import { EVENTS, GET_CATEGORIES } from "@/lib/config";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

// Stands in for the network: anything the fixture does not serve answers "net".
const net = () => {
  const instance = axios.create({
    adapter: async (config): Promise<AxiosResponse> => ({ data: "net", status: 200, statusText: "OK", headers: {}, config }),
  });
  installDesignFixtures(instance);
  return instance;
};

afterEach(() => deactivateFixture());

describe("design fixtures", () => {
  it("matches a method and a path suffix, * as one segment", () => {
    expect(matchesKey("GET /category/", "GET", "/api/category/")).toBe(true);
    expect(matchesKey("GET /category/", "POST", "/api/category/")).toBe(false);
    expect(matchesKey("GET /category/", "GET", "/api/category/7/")).toBe(false);
    expect(matchesKey("GET /product/*/", "GET", "/api/product/42/")).toBe(true);
    expect(matchesKey("GET /product/*/", "GET", "/api/product/42/reviews/")).toBe(false);
  });

  it("serves nothing while no fixture is on", async () => {
    const instance = net();
    expect((await instance.get("https://qa.example/api/category/")).data).toBe("net");
    expect((await instance.post("https://qa.example/api/cart/", {})).data).toBe("net");
    expect((await instance.post(EVENTS, { events: [] })).data).toBe("net");
  });

  it("serves the active fixture, passes other reads and refuses other writes", async () => {
    const instance = net();
    expect(activateFixture("2089:24546")).toBe(true);
    // The app's real endpoint, so the fixture key is tested against the URL the context requests.
    const { data } = await instance.get(GET_CATEGORIES);
    expect(data).toHaveLength(15);
    expect(data[1]).toMatchObject({ title: "Photo & Video Production", slug: "photo-video-production" });
    expect((await instance.get("https://qa.example/api/home/")).data).toBe("net");
    // A refused write carries an HTTP answer, so callers show an error rather than treat it as offline and retry it.
    await expect(instance.post("https://qa.example/api/cart/", {})).rejects.toMatchObject({
      code: "ERR_DESIGN_FIXTURE",
      response: { status: 409, data: { error: expect.stringContaining("POST /api/cart/") } },
    });
    // The analytics batch is swallowed, so the events queue does not keep it to replay against QA later.
    expect(await instance.post(EVENTS, { events: [{ name: "x" }] })).toMatchObject({ status: 204, data: "" });

    deactivateFixture();
    expect((await instance.get("https://qa.example/api/category/")).data).toBe("net");
  });

  it("turns off for an unknown frame", () => {
    expect(activateFixture("0:0")).toBe(false);
  });
});

describe("networkUtils", () => {
  const load = (dev: boolean) => {
    const install = jest.fn();
    const was = (global as { __DEV__?: boolean }).__DEV__;
    (global as { __DEV__?: boolean }).__DEV__ = dev;
    jest.isolateModules(() => {
      jest.doMock("@/dev/design-fixtures/interceptor", () => ({ installDesignFixtures: install }));
      require("@/lib/networkUtils");
    });
    (global as { __DEV__?: boolean }).__DEV__ = was;
    return install;
  };

  it("installs the fixture interceptor in dev builds only", () => {
    expect(load(true)).toHaveBeenCalledTimes(1);
    expect(load(false)).not.toHaveBeenCalled();
  });
});

describe("dev links", () => {
  it("reads kit links with encoded or raw variant names", () => {
    expect(parseDevLink("renit-qa://dev/kit/2071-14418?variant=Type%3DBack%2BTitle&x=30")).toEqual({
      name: "DevKit",
      params: { item: "2071-14418", variant: "Type=Back+Title", x: 30 },
    });
    expect(parseDevLink("renit-qa://dev/kit/2071:14418?variant=Type=Back+Title")?.params).toMatchObject({
      variant: "Type=Back+Title",
      x: undefined,
    });
  });

  it("reads fixture links and ignores other links", () => {
    expect(parseDevLink("renit-qa://dev/fixture/2089-24546")).toEqual({
      name: "DevFixture",
      params: { frameId: "2089:24546" },
    });
    expect(parseDevLink("renit://shop/lens-house")).toBeNull();
    expect(parseDevLink(null)).toBeNull();
  });
});
