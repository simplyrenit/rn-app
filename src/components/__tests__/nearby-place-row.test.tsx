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

// eslint-disable-next-line import/first
import { NearbyPlaceRow } from "../search/nearby-place-row";
// eslint-disable-next-line import/first
import { lightColors } from "@/lib/design-tokens";

/**
 * search-where-sheet · Nearby places (Figma 2089:29793). The rows are Google nearbysearch results, which a design
 * fixture cannot serve (bare axios), so the row is checked here.
 */
describe("NearbyPlaceRow (ENG-427)", () => {
  const render = (vicinity?: string, onPress = () => {}) => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<NearbyPlaceRow name="Lokhandwala Market" vicinity={vicinity} onPress={onPress} />);
    });
    return renderer;
  };
  const texts = (renderer: any) => renderer.root.findAllByType(Text);

  it("draws the name over the vicinity in a 64pt row", () => {
    const renderer = render("Andheri West, Mumbai");
    const [name, vicinity] = texts(renderer);
    expect(name.props.children).toBe("Lokhandwala Market");
    expect(StyleSheet.flatten(name.props.style)).toMatchObject({ fontSize: 16, lineHeight: 24, color: lightColors.text });
    expect(vicinity.props.children).toBe("Andheri West, Mumbai");
    expect(StyleSheet.flatten(vicinity.props.style)).toMatchObject({ fontSize: 14, lineHeight: 20, color: lightColors.textDim });
    const row = renderer.root.findAll((node: any) => node.props.accessibilityRole === "button" && node.props.style)[0];
    expect(StyleSheet.flatten(row.props.style)).toMatchObject({ minHeight: 64, flexDirection: "row", gap: 12 });
    expect(row.props.accessibilityLabel).toBe("Lokhandwala Market, Andheri West, Mumbai");
  });

  it("shows the name alone without a vicinity, and picks the place on tap", () => {
    const onPress = jest.fn();
    const renderer = render(undefined, onPress);
    expect(texts(renderer).map((node: any) => node.props.children)).toEqual(["Lokhandwala Market"]);
    const row = renderer.root.findAll((node: any) => node.props.accessibilityRole === "button" && node.props.onPress)[0];
    act(() => row.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
