import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Linking, Pressable, Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

let mockStatus: string | null = "denied";
const mockRefresh = jest.fn(async () => undefined);
jest.mock("expo-image-picker", () => ({ useCameraPermissions: () => [mockStatus ? { status: mockStatus } : null, jest.fn(), mockRefresh] }));
jest.mock("@/components/booking/use-app-active", () => ({ useAppActive: () => true }));
jest.mock("@/components/booking/parts", () => {
  const { Pressable: P, Text: T, View: V } = require("react-native");
  return {
    Notice: ({ children }: any) => <T>{children}</T>,
    TextButton: ({ label, onPress }: any) => (
      <P accessibilityRole="button" onPress={onPress}>
        <T>{label}</T>
      </P>
    ),
  };
});

// eslint-disable-next-line import/first
import { CameraOffNotice } from "../capture/camera-off";

const render = () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<CameraOffNotice>Camera access is off for Renit, so a photo can't be taken. Allow it in Settings.</CameraOffNotice>);
  });
  return renderer;
};
const texts = (renderer: any): string[] => renderer.root.findAllByType(Text).map((t: any) => String(t.props.children));

describe("the camera-off notice (D-25)", () => {
  beforeEach(() => {
    mockStatus = "denied";
    mockRefresh.mockClear();
  });

  it("says so up front, with the way to Settings, when the camera is off", () => {
    const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
    const renderer = render();
    expect(texts(renderer)).toEqual(["Camera access is off for Renit, so a photo can't be taken. Allow it in Settings.", "Open Settings"]);
    act(() => renderer.root.findByType(Pressable).props.onPress());
    expect(openSettings).toHaveBeenCalledTimes(1);
    // Asked again when the app is in front, as Settings is where it is switched back on.
    expect(mockRefresh).toHaveBeenCalled();
  });

  it("draws nothing while the camera is on, not asked for yet, or not known yet", () => {
    for (const status of ["granted", "undetermined", null]) {
      mockStatus = status;
      expect(render().toJSON()).toBeNull();
    }
  });
});
