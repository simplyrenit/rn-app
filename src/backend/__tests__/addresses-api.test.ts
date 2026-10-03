import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { QueryClient, setLogger } from "react-query";
import { AddressPayload } from "@/lib/addresses";
import axiosInstance from "@/lib/networkUtils";
import { addressesQueryKey, saveFirstAddress } from "../addresses-api";

jest.mock("@/lib/config", () => ({ MY_ADDRESSES_ENDPOINT: "https://api.test/my/addresses/" }));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const api = axiosInstance as unknown as {
  get: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  post: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
};

const payload: AddressPayload = {
  address: "Thane West, Thane",
  address_line_1: "Flat 1203",
  address_line_2: "",
  locality: "Thane West, Thane",
  address_type: "home",
  coordinates: { lat: 19.2437, long: 72.9781 },
};

// The rejected reads below are the point of their tests, not noise to print.
setLogger({ log: () => {}, warn: () => {}, error: () => {} });

let queryClient: QueryClient;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

// Drops the cache's garbage-collection timers, which otherwise keep the worker alive.
afterEach(() => queryClient.clear());

describe("saveFirstAddress", () => {
  it("saves when the owner has no address yet", async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 1, ...payload, label: "", is_default: true } });

    await expect(saveFirstAddress(queryClient, "asha", payload)).resolves.toBe("saved");
    expect(api.post).toHaveBeenCalledWith("https://api.test/my/addresses/", payload);
  });

  it("skips, without an error, when an address was saved in the meantime", async () => {
    api.get.mockResolvedValue({ data: [{ id: 9 }] });

    await expect(saveFirstAddress(queryClient, "asha", payload)).resolves.toBe("skipped");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("reads the list fresh rather than trusting what is cached", async () => {
    queryClient.setQueryData(addressesQueryKey("asha"), []);
    api.get.mockResolvedValue({ data: [{ id: 9 }] });

    await expect(saveFirstAddress(queryClient, "asha", payload)).resolves.toBe("skipped");
  });

  it("rejects when the list cannot be read, and does not guess", async () => {
    api.get.mockRejectedValue(new Error("offline"));

    await expect(saveFirstAddress(queryClient, "asha", payload)).rejects.toThrow("offline");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("rejects when the save itself fails", async () => {
    api.get.mockResolvedValue({ data: [] });
    api.post.mockRejectedValue(new Error("400"));

    await expect(saveFirstAddress(queryClient, "asha", payload)).rejects.toThrow("400");
  });

  it("rejects without a profile, since there is no list to read", async () => {
    await expect(saveFirstAddress(queryClient, undefined, payload)).rejects.toThrow("no profile");
    expect(api.get).not.toHaveBeenCalled();
  });
});
