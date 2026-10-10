import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axiosInstance from "@/lib/networkUtils";
import { fetchUnlock, postUnlock } from "../unlock";

jest.mock("@/lib/config", () => ({ ACCESS_UNLOCK_ENDPOINT: "https://api.test/access/unlock/" }));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const api = axiosInstance as unknown as { get: Call; post: Call };

const state = { unlocked: true, unlocked_until: "2026-10-12T05:30:00Z", minutes: 30, phone_masked: "··· ··· 4471" };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("the unlock calls", () => {
  it("reads whether this phone is unlocked", async () => {
    api.get.mockResolvedValue({ data: state });
    await expect(fetchUnlock()).resolves.toEqual(state);
    expect(api.get).toHaveBeenCalledWith("https://api.test/access/unlock/");
  });

  it("sends the Firebase ID token as `id_token`", async () => {
    api.post.mockResolvedValue({ data: state });
    await postUnlock("firebase-id-token");
    expect(api.post).toHaveBeenCalledWith("https://api.test/access/unlock/", { id_token: "firebase-id-token" });
  });
});
