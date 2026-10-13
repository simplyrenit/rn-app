import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";

const root = path.join(__dirname, "..", "..", "..");
const appJson = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const plist = fs.readFileSync(path.join(root, "ios", "Renit", "Info.plist"), "utf8");

/** The camera's reason as the checked-in Info.plist says it. */
const plistReason = /<key>NSCameraUsageDescription<\/key>\s*<string>([^<]*)<\/string>/.exec(plist)?.[1];
const configReason: string = appJson.expo.ios.infoPlist.NSCameraUsageDescription;
const pickerReason: string | undefined = appJson.expo.plugins
  .filter((p: unknown) => Array.isArray(p) && p[0] === "expo-image-picker")
  .map((p: [string, { cameraPermission?: string }]) => p[1]?.cameraPermission)[0];

const micPlist = /<key>NSMicrophoneUsageDescription<\/key>\s*<string>([^<]*)<\/string>/.exec(plist)?.[1];
const micConfig: string = appJson.expo.ios.infoPlist.NSMicrophoneUsageDescription;
const micPicker: string | undefined = appJson.expo.plugins
  .filter((p: unknown) => Array.isArray(p) && p[0] === "expo-image-picker")
  .map((p: [string, { microphonePermission?: string }]) => p[1]?.microphonePermission)[0];

describe("the iOS microphone prompt (review before merge, R-5)", () => {
  it("gives a reason: the sound of the short video record at handover and return", () => {
    expect(micConfig).toBe(
      "Renit uses your microphone for the sound of the short video record of an item at handover and return."
    );
  });

  it("is the same in app.json, in the image picker's plugin and in the checked-in Info.plist", () => {
    expect(micPlist).toBe(micConfig);
    expect(micPicker).toBe(micConfig);
  });
});

describe("the iOS camera prompt (test run D-21)", () => {
  it("says the camera is for the photos of items and for the record at handover and return, in plain words", () => {
    expect(configReason).toMatch(/photos of your items/);
    expect(configReason).toMatch(/photo and video record of an item at handover and return/);
    expect(configReason).not.toMatch(/product photos\./);
  });

  it("is the same in app.json, in the image picker's plugin and in the checked-in Info.plist, so a prebuild cannot change it", () => {
    expect(plistReason).toBe(configReason);
    expect(pickerReason).toBe(configReason);
  });
});
