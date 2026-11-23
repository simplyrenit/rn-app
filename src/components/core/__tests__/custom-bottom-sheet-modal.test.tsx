import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Keyboard, Platform, Text } from "react-native";
// @ts-ignore: no type package for it is installed (it comes with jest-expo).
import TestRenderer, { act } from "react-test-renderer";

// ENG-438: a numeric (content-sized) sheet used to be scaled by 0.9 with the keyboard up, which put the name, email
// and phone sheets behind the iOS keyboard and cut their Save in half on Android.

jest.mock("@gorhom/bottom-sheet", () => {
  const R = require("react");
  return {
    BottomSheetBackdrop: () => null,
    BottomSheetModal: R.forwardRef((props: any, _ref: any) => R.createElement("Sheet", props, props.children)),
  };
});
jest.mock("react-native-gesture-handler", () => {
  const R = require("react");
  return { ScrollView: (props: any) => R.createElement("Scroll", props, props.children) };
});
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ theme: "light" }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34 }) }));
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844 }),
}));

import CustomBottomSheetModal from "../custom-bottom-sheet-modal";

const os = Platform.OS;
afterEach(() => {
  Platform.OS = os;
  jest.restoreAllMocks();
});

function render(snapPoints: number[] | string[]) {
  const listeners: Record<string, (event: any) => void> = {};
  jest.spyOn(Keyboard, "addListener").mockImplementation(((name: string, cb: (event: any) => void) => {
    listeners[name] = cb;
    return { remove: () => {} };
  }) as any);
  let root: any;
  act(() => {
    root = TestRenderer.create(
      <CustomBottomSheetModal snapPoints={snapPoints} isDark={false}>
        <Text>body</Text>
      </CustomBottomSheetModal>
    );
  });
  const sheet = () => root.root.findByType("Sheet" as any).props;
  const scroll = () => root.root.findByType("Scroll" as any).props;
  const keyboard = (height: number) =>
    act(() => {
      const ios = Platform.OS === "ios";
      if (height > 0) listeners[ios ? "keyboardWillShow" : "keyboardDidShow"]({ endCoordinates: { height } });
      else listeners[ios ? "keyboardWillHide" : "keyboardDidHide"]({});
    });
  return { sheet, scroll, keyboard };
}

const padding = (style: any[]) => Object.assign({}, ...style).paddingBottom;

describe("CustomBottomSheetModal with the keyboard up", () => {
  it("iOS: grows a numeric sheet by the keyboard less the inset and pads its content by the same", () => {
    Platform.OS = "ios";
    const { sheet, scroll, keyboard } = render([300]);
    expect(sheet().snapPoints).toEqual([300]);
    keyboard(336);
    expect(sheet().snapPoints).toEqual([300 + 302]);
    expect(padding(scroll().contentContainerStyle)).toBe(302);
    keyboard(0);
    expect(sheet().snapPoints).toEqual([300]);
    expect(padding(scroll().contentContainerStyle)).toBe(0);
  });

  it("iOS: never past the space below the status bar", () => {
    Platform.OS = "ios";
    const { sheet, keyboard } = render([600]);
    keyboard(336);
    expect(sheet().snapPoints).toEqual([844 - 47]);
  });

  it("Android: keeps the height (adjustResize lifts it), capped to the room above the keyboard", () => {
    Platform.OS = "android";
    const { sheet, scroll, keyboard } = render([300]);
    keyboard(300);
    expect(sheet().snapPoints).toEqual([300]);
    expect(padding(scroll().contentContainerStyle)).toBe(0);
    const tall = render([600]);
    tall.keyboard(300);
    expect(tall.sheet().snapPoints).toEqual([844 - 47 - 300]);
  });

  it("percentage sheets still go to 90%", () => {
    Platform.OS = "ios";
    const { sheet, scroll, keyboard } = render(["50%"]);
    keyboard(336);
    expect(sheet().snapPoints).toEqual(["90%"]);
    expect(padding(scroll().contentContainerStyle)).toBe(0);
  });
});
