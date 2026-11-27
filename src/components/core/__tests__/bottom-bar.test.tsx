import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@/lib/haptics", () => ({ tapFeedback: () => {} }));
jest.mock("../use-press-feedback", () => ({
  usePressFeedback: () => ({ onPressIn: () => {}, onPressOut: () => {}, pressStyle: null }),
}));
jest.mock("@/lib/use-keyboard-inset", () => ({ useKeyboardInset: () => 0 }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// eslint-disable-next-line import/first
import { BottomBar, BottomBarProps } from "../bottom-bar";

const noop = () => {};
const render = (props: BottomBarProps) => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<BottomBar {...props} />);
  });
  return renderer;
};
const texts = (renderer: any): string[] => renderer.root.findAllByType(Text).map((t: any) => String(t.props.children));
const textNamed = (renderer: any, label: string) =>
  renderer.root.findAllByType(Text).find((t: any) => t.props.children === label);
const summary = { layout: "summary-cta" as const, value: "₹19", unit: "/day", subLine: "Deposit ₹1,000" };

describe("BottomBar labelSize and note (ENG-429)", () => {
  it("draws the note right-aligned in the primary's place when there is no primary (2089:22597)", () => {
    const bar = render({ ...summary, note: "Not taking bookings right now" });
    expect(texts(bar)).toEqual(["₹19", "/day", "Deposit ₹1,000", "Not taking bookings right now"]);
    const style = StyleSheet.flatten(textNamed(bar, "Not taking bookings right now").props.style);
    expect(style).toMatchObject({ fontSize: 14, lineHeight: 20, textAlign: "right", flex: 1 });
  });

  it("drops the note when there is a primary", () => {
    const bar = render({ ...summary, note: "Not taking bookings right now", primary: { label: "Book now", onPress: noop } });
    expect(texts(bar)).toEqual(["₹19", "/day", "Deposit ₹1,000", "Book now"]);
  });

  it("sets a compact label at 14/20 in the 52 box (2089:23201)", () => {
    const bar = render({
      layout: "secondary-primary",
      secondary: { label: "Add to cart", onPress: noop },
      primary: { label: "Book for the morning", onPress: noop, labelSize: "compact" },
    });
    const label = StyleSheet.flatten(textNamed(bar, "Book for the morning").props.style);
    expect(label).toMatchObject({ fontSize: 14, lineHeight: 20 });
    const button = bar.root.findAllByType(TouchableOpacity).find((b: any) => b.props.accessibilityLabel === "Book for the morning");
    expect(StyleSheet.flatten(button.props.style).minHeight).toBe(52);
  });

  it("keeps the default 16/24 label without labelSize", () => {
    const bar = render({ ...summary, primary: { label: "Book now", onPress: noop } });
    expect(StyleSheet.flatten(textNamed(bar, "Book now").props.style)).toMatchObject({ fontSize: 16, lineHeight: 24 });
  });
});
