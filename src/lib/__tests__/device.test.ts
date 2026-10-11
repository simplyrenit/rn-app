import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock("expo-device", () => ({ modelName: "iPhone 15", deviceName: "Asha's iPhone" }));
jest.mock("../config", () => ({ ACCESS_DEVICES_ENDPOINT: "https://api.test/access/devices/" }));
jest.mock("../networkUtils", () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

import axiosInstance from "../networkUtils";
import { makeDeviceInfo, sessionBody, signOutCurrentDevice } from "../device";

const post = (axiosInstance as unknown as { post: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>> }).post;

describe("makeDeviceInfo", () => {
  it("reports the model name, the id and ios", () => {
    expect(makeDeviceInfo({ id: "abc", modelName: "iPhone 15", deviceName: "Asha's iPhone", os: "ios" })).toEqual({
      device_id: "abc",
      device_name: "iPhone 15",
      platform: "ios",
    });
  });

  it("falls back to the owner's name for the phone, then a plain word", () => {
    expect(makeDeviceInfo({ id: "a", modelName: " ", deviceName: "Asha's phone", os: "android" }).device_name).toBe(
      "Asha's phone"
    );
    expect(makeDeviceInfo({ id: "a", os: "android" }).device_name).toBe("Android phone");
    expect(makeDeviceInfo({ id: "a", os: "ios" }).device_name).toBe("iPhone");
  });

  it("treats anything that is not ios as android", () => {
    expect(makeDeviceInfo({ id: "a", os: "android" }).platform).toBe("android");
    expect(makeDeviceInfo({ id: "a", os: "web" }).platform).toBe("android");
  });

  it("keeps to the server's limits of 64 and 100 characters", () => {
    const info = makeDeviceInfo({ id: "x".repeat(80), modelName: "m".repeat(150), os: "ios" });
    expect(info.device_id).toHaveLength(64);
    expect(info.device_name).toHaveLength(100);
  });
});

describe("signOutCurrentDevice", () => {
  it("posts to the current device's sign-out without letting a 401 reach the refresh retry", async () => {
    post.mockResolvedValue({ status: 204 });
    await signOutCurrentDevice();
    expect(post).toHaveBeenCalledTimes(1);
    const [url, body, config] = post.mock.calls[0] as [string, unknown, { timeout: number; validateStatus: (s: number) => boolean }];
    expect(url).toBe("https://api.test/access/devices/current/sign-out/");
    expect(body).toEqual({});
    expect(config.timeout).toBeLessThanOrEqual(5000);
    // Every status, a 401 included, counts as an answer.
    expect(config.validateStatus(401)).toBe(true);
  });

  it("never throws, so a phone with no network still signs out", async () => {
    post.mockRejectedValue(new Error("offline"));
    await expect(signOutCurrentDevice()).resolves.toBeUndefined();
  });
});

describe("sessionBody", () => {
  const info = { device_id: "dev-1", device_name: "iPhone 15", platform: "ios" as const };

  it("carries the token with the device fields when the phone has one", () => {
    expect(sessionBody("ExponentPushToken[abc]", info)).toEqual({ expo_push_token: "ExponentPushToken[abc]", ...info });
  });

  it("carries the device fields alone when it has none", () => {
    expect(sessionBody(undefined, info)).toEqual(info);
    expect(sessionBody(null, info)).toEqual(info);
    expect(sessionBody("", info)).toEqual(info);
    expect(sessionBody(undefined, info)).not.toHaveProperty("expo_push_token");
  });
});
