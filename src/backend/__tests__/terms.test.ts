import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axios from "axios";
import axiosInstance from "@/lib/networkUtils";
import { acceptOwnerTerms, fetchPublicTerms, isTermsVersionOld } from "../terms";

jest.mock("axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), isAxiosError: (e: { isAxiosError?: boolean } | null) => Boolean(e?.isAxiosError) },
}));
jest.mock("@/context/global-context", () => ({ useGlobalContext: jest.fn() }));
jest.mock("@/lib/config", () => ({
  TERMS_ENDPOINT: "https://api.test/terms/",
  TERMS_ACCEPT_ENDPOINT: "https://api.test/terms/accept/",
}));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const api = axiosInstance as unknown as { get: Call; post: Call };
const plain = axios as unknown as { get: Call };

const terms = (accepted: boolean | null, version = "2026-10") => ({
  owner: { version, url: "https://simplyrenit.com/terms/owner", accepted },
  customer: { version, url: "https://simplyrenit.com/terms/rental", accepted },
});

const versionOld = (current: string) => ({
  isAxiosError: true,
  response: {
    status: 409,
    data: { error: { code: "terms_version_old", message: "Newer terms.", details: { version: current } } },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fetchPublicTerms", () => {
  it("reads the terms with a plain call: no token, no header of an earlier account", async () => {
    plain.get.mockResolvedValue({ data: terms(null) });
    const read = await fetchPublicTerms();
    expect(plain.get).toHaveBeenCalledWith("https://api.test/terms/", { timeout: undefined });
    expect(api.get).not.toHaveBeenCalled();
    // Signed out, the answer says nothing about a person.
    expect(read.owner.accepted).toBeNull();
    expect(read.owner.version).toBe("2026-10");
    expect(read.owner.url).toBe("https://simplyrenit.com/terms/owner");
  });

  it("gives up after the timeout a waiting caller passes", async () => {
    plain.get.mockResolvedValue({ data: terms(null) });
    await fetchPublicTerms(8000);
    expect(plain.get).toHaveBeenCalledWith("https://api.test/terms/", { timeout: 8000 });
  });
});

describe("acceptOwnerTerms", () => {
  it("sends the owner kind with the version the person was shown", async () => {
    api.post.mockResolvedValue({ data: terms(true) });
    await acceptOwnerTerms("2026-10");
    expect(api.post).toHaveBeenCalledWith(
      "https://api.test/terms/accept/",
      { kind: "owner", version: "2026-10" },
      undefined
    );
  });

  it("at sign-up posts the kept version with the new token, and reads nothing first", async () => {
    api.post.mockResolvedValue({ data: terms(true) });
    await acceptOwnerTerms("2026-10", "access-1");
    expect(api.post).toHaveBeenCalledWith(
      "https://api.test/terms/accept/",
      { kind: "owner", version: "2026-10" },
      { headers: { Authorization: "Bearer access-1" } }
    );
    expect(api.get).not.toHaveBeenCalled();
    expect(plain.get).not.toHaveBeenCalled();
  });

  it("does not repeat with the newer version when the server says it has moved on", async () => {
    api.post.mockRejectedValue(versionOld("2026-11"));
    await expect(acceptOwnerTerms("2026-10")).rejects.toBeDefined();
    // One call, with the version that was shown: an acceptance of a page nobody saw is not theirs.
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

describe("isTermsVersionOld", () => {
  it("recognises the 409 and nothing else", () => {
    expect(isTermsVersionOld(versionOld("2026-11"))).toBe(true);
    expect(isTermsVersionOld({ isAxiosError: true, response: { status: 503, data: {} } })).toBe(false);
    expect(isTermsVersionOld(new Error("x"))).toBe(false);
  });
});
