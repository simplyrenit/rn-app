import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text as RNText, TouchableOpacity } from "react-native";
// @ts-ignore: no type package for it is installed (it comes with jest-expo).
import TestRenderer from "react-test-renderer";

jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("react-native-heroicons/solid", () => ({ CheckCircleIcon: () => require("react").createElement("View", { testID: "tick" }) }));
// The core barrel reaches AsyncStorage (Card → useSaved → global context); the row uses none of it.
jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));

// eslint-disable-next-line import/first
import { AddressRow } from "../address-row";
// eslint-disable-next-line import/first
import type { SavedAddress } from "@/lib/addresses";

const home: SavedAddress = {
  id: 1,
  address: "",
  address_line_1: "Flat 302, Sea Breeze CHS",
  address_line_2: "",
  locality: "Lokhandwala, Andheri West",
  address_type: "home",
  label: "",
  coordinates: { lat: 19.1364, long: 72.8296 },
  is_default: true,
};

function render(props: Partial<React.ComponentProps<typeof AddressRow>>) {
  const root = TestRenderer.create(<AddressRow address={home} first onPress={() => {}} {...props} />).root;
  const row = root.findAllByType(TouchableOpacity)[0];
  const texts = root.findAllByType(RNText).map((t: { props: { children: unknown } }) => t.props.children);
  return { root, row, style: StyleSheet.flatten(row.props.style), texts };
}

// ENG-427 D11: the picker row of 2089:32313. The list (`chevron`) and form (`change`) rows are ENG-438's and must not move.
describe("AddressRow", () => {
  it("radio: a 72pt radio row with no Default tag and no rule", () => {
    const { row, style, texts } = render({ trailing: "radio", first: false });
    expect(row.props.accessibilityRole).toBe("radio");
    expect(style).toMatchObject({ minHeight: 72, gap: 12 });
    expect(style.borderTopWidth).toBeUndefined();
    expect(texts).toContain("Home");
    expect(texts).not.toContain("Default");
  });

  it("radio: the tick is drawn on the chosen row only", () => {
    const ticks = (selected: boolean) => render({ trailing: "radio", selected }).root.findAll(
      (n: { props: { testID?: string } }) => n.props.testID === "tick"
    ).length;
    expect(ticks(true)).toBe(1);
    expect(ticks(false)).toBe(0);
    expect(render({ trailing: "radio", selected: true }).row.props.accessibilityState).toEqual({ selected: true });
  });

  it("chevron: still the list row with its Default tag", () => {
    const { row, texts } = render({ trailing: "chevron" });
    expect(row.props.accessibilityRole).toBe("button");
    expect(texts).toContain("Default");
  });

  it("change: still the form row with its Change action", () => {
    const { row, texts } = render({ trailing: "change" });
    expect(row.props.accessibilityRole).toBe("button");
    expect(texts).toContain("Change");
    expect(texts).not.toContain("Default");
  });
});
