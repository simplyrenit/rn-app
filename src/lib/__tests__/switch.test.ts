import { describe, expect, it } from "@jest/globals";
import { IOS_26_SWITCH_OVERHANG, switchInset } from "../switch";

describe("the room a switch needs on the right (test run D-11)", () => {
  it("on iOS 26 the native switch is wider than the layout's frame, and the row gives it 12 pt", () => {
    expect(IOS_26_SWITCH_OVERHANG).toBe(12);
    expect(switchInset("ios", "26.0")).toBe(12);
    expect(switchInset("ios", "26.1.2")).toBe(12);
    expect(switchInset("ios", 27)).toBe(12);
  });

  it("anywhere else the frame is right and nothing is added", () => {
    expect(switchInset("ios", "18.4")).toBe(0);
    expect(switchInset("ios", "17.0")).toBe(0);
    expect(switchInset("android", 34)).toBe(0);
    expect(switchInset("android", "26")).toBe(0);
    expect(switchInset("ios", undefined)).toBe(0);
    expect(switchInset("ios", "not a version")).toBe(0);
  });
});
