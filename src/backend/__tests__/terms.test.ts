import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { acceptOwnerTerms, acceptOwnerTermsAtSignup } from "../terms";

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

const terms = (accepted: boolean, version = "2026-10") => ({
  owner: { version, url: "https://simplyrenit.com/terms/owner", accepted },
  customer: { version, url: "https://simplyrenit.com/terms/rental", accepted: true },
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

describe("acceptOwnerTerms", () => {
  it("sends the owner kind with the version it was shown", async () => {
    api.post.mockResolvedValue({ data: terms(true) });
    await acceptOwnerTerms("2026-10");
    expect(api.post).toHaveBeenCalledWith(
      "https://api.test/terms/accept/",
      { kind: "owner", version: "2026-10" },
      undefined
    );
  });

  it("sends once more with the version the server names when it has moved on", async () => {
    api.post.mockRejectedValueOnce(versionOld("2026-11")).mockResolvedValueOnce({ data: terms(true, "2026-11") });
    const result = await acceptOwnerTerms("2026-10");
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post).toHaveBeenLastCalledWith(
      "https://api.test/terms/accept/",
      { kind: "owner", version: "2026-11" },
      undefined
    );
    expect(result.owner.version).toBe("2026-11");
  });

  it("does not loop when the server names the version it already refused", async () => {
    api.post.mockRejectedValue(versionOld("2026-10"));
    await expect(acceptOwnerTerms("2026-10")).rejects.toBeDefined();
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("lets any other failure through", async () => {
    api.post.mockRejectedValue({ isAxiosError: true, response: { status: 503, data: {} } });
    await expect(acceptOwnerTerms("2026-10")).rejects.toBeDefined();
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

describe("acceptOwnerTermsAtSignup", () => {
  it("reads the current version with the new token, then accepts it", async () => {
    api.get.mockResolvedValue({ data: terms(false) });
    api.post.mockResolvedValue({ data: terms(true) });
    await acceptOwnerTermsAtSignup("access-1");
    const header = { headers: { Authorization: "Bearer access-1" } };
    expect(api.get).toHaveBeenCalledWith("https://api.test/terms/", header);
    expect(api.post).toHaveBeenCalledWith(
      "https://api.test/terms/accept/",
      { kind: "owner", version: "2026-10" },
      header
    );
  });

  it("sends nothing when the terms are already accepted", async () => {
    api.get.mockResolvedValue({ data: terms(true) });
    await acceptOwnerTermsAtSignup("access-1");
    expect(api.post).not.toHaveBeenCalled();
  });
});
