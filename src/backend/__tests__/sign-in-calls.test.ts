import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import axios from "axios";
import axiosInstance from "@/lib/networkUtils";
import { appleLogin, emailLogin, googleLogin, otpCheck, phoneLogin, signUp } from "../sign-in-calls";

jest.mock("axios", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock("@/lib/config", () => ({
  APPLE_SIGN_IN_ENDPOINT: "https://api.test/apple-login/",
  GOOGLE_SIGN_IN_ENDPOINT: "https://api.test/google-login/",
  LOGIN: "https://api.test/login/",
  OTP: "https://api.test/otp/",
  PHONE_LOGIN: "https://api.test/phone-login/",
  SIGN_UP: "https://api.test/signup/",
}));

const DEVICE = { device_id: "dev-1", device_name: "iPhone 15", platform: "ios" };
jest.mock("@/lib/device", () => ({
  getDeviceInfo: jest.fn(async () => ({ device_id: "dev-1", device_name: "iPhone 15", platform: "ios" })),
}));

type Call = jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
const http = axios as unknown as { get: Call; post: Call };
const apple = axiosInstance as unknown as { post: Call };

beforeEach(() => {
  jest.clearAllMocks();
  http.get.mockResolvedValue({ data: {} });
  http.post.mockResolvedValue({ data: {} });
  apple.post.mockResolvedValue({ data: {} });
});

describe("every sign-in says which phone it is", () => {
  it("the email-code check sends the three fields as query parameters", async () => {
    await otpCheck("asha@example.com", "123456");
    expect(http.get).toHaveBeenCalledWith("https://api.test/otp/", {
      params: { email: "asha@example.com", otp: "123456", ...DEVICE },
    });
  });

  it("phone sign-in sends them in the body", async () => {
    await phoneLogin("firebase-id-token");
    expect(http.post).toHaveBeenCalledWith("https://api.test/phone-login/", {
      id_token: "firebase-id-token",
      ...DEVICE,
    });
  });

  it("email and password sign-in sends them in the body", async () => {
    await emailLogin("asha@example.com", "secret");
    expect(http.post).toHaveBeenCalledWith("https://api.test/login/", {
      email: "asha@example.com",
      password: "secret",
      ...DEVICE,
    });
  });

  it("sign-up sends them beside the account's own fields", async () => {
    await signUp({ email: "asha@example.com", first_name: "Asha" });
    expect(http.post).toHaveBeenCalledWith("https://api.test/signup/", {
      email: "asha@example.com",
      first_name: "Asha",
      ...DEVICE,
    });
  });

  it("Google sign-in sends them in the body", async () => {
    await googleLogin("google-token");
    expect(http.post).toHaveBeenCalledWith("https://api.test/google-login/", {
      access_token: "google-token",
      ...DEVICE,
    });
  });

  it("Apple sign-in sends them at the top, beside the identity token under `data`", async () => {
    await appleLogin("apple-identity-token");
    expect(apple.post).toHaveBeenCalledWith("https://api.test/apple-login/", {
      data: { identityToken: "apple-identity-token" },
      ...DEVICE,
    });
  });

  it("the device fields cannot be overridden by a caller's body", async () => {
    await signUp({ device_id: "from-the-caller", platform: "web" });
    const [, body] = http.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.device_id).toBe("dev-1");
    expect(body.platform).toBe("ios");
  });
});
