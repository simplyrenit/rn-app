import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@/lib/haptics", () => ({ tapFeedback: () => {} }));
// The press dip reads AccessibilityInfo, which jest-expo leaves unmocked; it is not what these tests check.
jest.mock("../core/use-press-feedback", () => ({
  usePressFeedback: () => ({ onPressIn: () => {}, onPressOut: () => {}, pressStyle: null }),
}));
jest.mock("@/lib/use-keyboard-inset", () => ({ useKeyboardInset: () => 0 }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// eslint-disable-next-line import/first
import { BottomBar, BottomBarProps } from "../core/bottom-bar";

const noop = () => {};
const render = (props: BottomBarProps) => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<BottomBar {...props} />);
  });
  return renderer;
};
const texts = (renderer: any): string[] =>
  renderer.root.findAllByType(Text).map((t: any) => String(t.props.children));
const root = (renderer: any) => StyleSheet.flatten(renderer.toJSON().props.style);

describe("BottomBar on the 2.1 kit (ENG-426)", () => {
  it("draws every layout with its labels", () => {
    expect(texts(render({ primary: { label: "Continue", onPress: noop } }))).toEqual(["Continue"]);
    expect(
      texts(render({ layout: "summary-cta", value: "₹1,200", unit: "/day", subLine: "Deposit ₹2,000", primary: { label: "Book now", onPress: noop } }))
    ).toEqual(["₹1,200", "/day", "Deposit ₹2,000", "Book now"]);
    expect(
      texts(render({ layout: "secondary-primary", secondary: { label: "Add to cart", onPress: noop }, primary: { label: "Book now", onPress: noop } }))
    ).toEqual(["Add to cart", "Book now"]);
    expect(
      texts(render({ layout: "cta-text", primary: { label: "Continue", onPress: noop }, secondary: { label: "Not now", onPress: noop } }))
    ).toEqual(["Continue", "Not now"]);
  });

  it("pads the strip 16/24 with a hairline and adds the home-indicator inset below it", () => {
    expect(root(render({ primary: { label: "Continue", onPress: noop } }))).toMatchObject({
      borderTopWidth: 1,
      borderTopColor: "#E6E6E6",
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 16 + 34,
      flexDirection: "row",
      gap: 12,
    });
    // CTA+Text: 4 under the link, which brings its own 44.
    expect(
      root(render({ layout: "cta-text", primary: { label: "Continue", onPress: noop }, secondary: { label: "Not now", onPress: noop } }))
    ).toMatchObject({
      paddingBottom: 4 + 34,
      gap: 4,
      alignItems: "center",
    });
  });

  it("passes legacy children through in a column, ignoring the layout", () => {
    const renderer = render({ layout: "summary-cta", value: "₹9", children: <Text>legacy</Text> });
    expect(texts(renderer)).toEqual(["legacy"]);
    expect(root(renderer).flexDirection).toBeUndefined();
  });
});
