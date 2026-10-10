import { describe, expect, it, jest } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock("expo-device", () => ({ modelName: "iPhone 15", deviceName: "Asha's iPhone" }));

import { makeDeviceInfo } from "../device";

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
