import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text as RNText, View } from "react-native";
// @ts-ignore: no type package for it is installed (it comes with jest-expo).
import TestRenderer from "react-test-renderer";

jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("expo-image", () => ({ Image: () => null }));

// eslint-disable-next-line import/first
import { Avatar } from "../avatar";
// eslint-disable-next-line import/first
import { lightColors } from "@/lib/design-tokens";

// ENG-427 D3: the frames' "Avatar (initials)" (03 2089:36248 / 36523 at 72, 2089:24740 at 40).
function render(props: React.ComponentProps<typeof Avatar>) {
  const root = TestRenderer.create(<Avatar {...props} />).root;
  const disc = StyleSheet.flatten(root.findAllByType(View)[0].props.style);
  const label = root.findAllByType(RNText)[0];
  return { disc, label: label && { text: label.props.children, style: StyleSheet.flatten(label.props.style) } };
}

describe("Avatar with no photo", () => {
  it("40: #EDEDFC disc, no ring, SemiBold 14/20 initials at 70% black", () => {
    const { disc, label } = render({ name: "Aditi Iyer", size: 40 });
    expect(disc).toMatchObject({ width: 40, height: 40, backgroundColor: lightColors.brandPanel, borderWidth: 0 });
    expect(lightColors.brandPanel).toBe("#EDEDFC");
    expect(label.text).toBe("AI");
    expect(label.style).toMatchObject({ fontSize: 14, lineHeight: 20, color: lightColors.textBody });
  });

  it("72: SemiBold 20/28 initials in brand", () => {
    const { disc, label } = render({ name: "Rohan Mehta", size: 72 });
    expect(disc).toMatchObject({ backgroundColor: lightColors.brandPanel, borderWidth: 0 });
    expect(label.text).toBe("RM");
    expect(label.style).toMatchObject({ fontSize: 20, lineHeight: 28, color: "#635BE8" });
  });

  it("a photo keeps its hairline ring and draws no initials", () => {
    const { disc, label } = render({ name: "Rohan Mehta", uri: "https://example.com/a.jpg", size: 40 });
    expect(disc).toMatchObject({ borderWidth: 1, borderColor: lightColors.line });
    expect(label).toBeUndefined();
  });
});
