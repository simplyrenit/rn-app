import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";
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
jest.mock("../core/use-press-feedback", () => ({
  usePressFeedback: () => ({ onPressIn: () => {}, onPressOut: () => {}, pressStyle: null }),
}));

// eslint-disable-next-line import/first
import DateRangePicker from "../core/date-range-picker";
// eslint-disable-next-line import/first
import { lightColors } from "@/lib/design-tokens";

/**
 * date-range-picker · Range picked (Figma 2089:29905): November 2026, Nov 28 – Nov 30. The device check only works
 * while the 28th is ahead and on an en-US region, so this render is the lasting check: the clock is pinned before
 * the 28th and the header copy is read in en-US (skipped on another locale; run with LANG=en_US.UTF-8).
 */
describe("DateRangePicker on the 2.1 frame (ENG-427)", () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 10, 23, 10, 0, 0) });
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  const render = () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <DateRangePicker
          // Noon UTC: the picker keys days by toISOString (UTC) and prints them in local time, and noon is the
          // same calendar day for both in every timezone from UTC-11 to UTC+11.
          startDate={new Date(Date.UTC(2026, 10, 28, 12))}
          endDate={new Date(Date.UTC(2026, 10, 30, 12))}
          onConfirm={() => {}}
          onCancel={() => {}}
          maxDaysAhead={180}
        />
      );
    });
    return renderer;
  };
  const textNode = (renderer: any, copy: string | number) =>
    renderer.root.findAll((node: any) => node.type === Text && node.props.children === copy)[0];
  const style = (node: any) => StyleSheet.flatten(node.props.style);
  /** The day's touchable: the nearest ancestor with an accessibility label that is the ISO date. */
  const dayCell = (renderer: any, iso: string) =>
    renderer.root.findAll((node: any) => node.props.accessibilityLabel === iso && node.props.style)[0];

  // The picker formats with the device locale, so the copy is only checked where that is en-US.
  const enUS = Intl.DateTimeFormat().resolvedOptions().locale.startsWith("en-US");
  (enUS ? it : it.skip)("prints the frame's header in en-US", () => {
    const renderer = render();
    expect(textNode(renderer, "When do you need it?")).toBeTruthy();
    const range = textNode(renderer, "Nov 28 — Nov 30");
    expect(range).toBeTruthy();
    expect(style(range)).toMatchObject({ color: lightColors.brandText, fontSize: 14, lineHeight: 20 });
    expect(textNode(renderer, "November 2026")).toBeTruthy();
    const letters = renderer.root
      .findAll((node: any) => node.type === Text && /^[SMTWF]$/.test(String(node.props.children)))
      .map((node: any) => node.props.children);
    expect(letters).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
  });

  it("draws the frames' 40% scrim in light (ENG-427 D1), not the 45% ink.scrim token", () => {
    const renderer = render();
    const scrim = renderer.root.findAll(
      (node: any) => node.props.accessibilityLabel === "Dismiss date picker" && node.props.style
    )[0];
    expect(style(scrim).backgroundColor).toBe("#00000066");
  });

  it("marks the range as one band capped on the outer sides, with discs on the ends", () => {
    const renderer = render();
    const start = style(dayCell(renderer, "2026-11-28"));
    const middle = style(dayCell(renderer, "2026-11-29"));
    const end = style(dayCell(renderer, "2026-11-30"));
    expect(start).toMatchObject({ backgroundColor: lightColors.brandPanel, borderTopLeftRadius: 20, borderTopRightRadius: 0, height: 40 });
    expect(middle).toMatchObject({ backgroundColor: lightColors.brandPanel, borderTopLeftRadius: 0, borderTopRightRadius: 0 });
    expect(end).toMatchObject({ backgroundColor: lightColors.brandPanel, borderTopLeftRadius: 0, borderTopRightRadius: 20 });
    expect(style(textNode(renderer, 28))).toMatchObject({ color: lightColors.onBrand });
    expect(style(textNode(renderer, 29))).toMatchObject({ color: lightColors.text });
    // Today is the brand numeral; a day before it is greyed.
    expect(style(textNode(renderer, 23))).toMatchObject({ color: lightColors.brandText });
    expect(style(textNode(renderer, 22))).toMatchObject({ color: lightColors.textDim });
    // No cells from the months either side.
    expect(dayCell(renderer, "2026-12-01")).toBeUndefined();
  });

  it("has the kit Text link Cancel and a live Primary Confirm", () => {
    const renderer = render();
    expect(style(textNode(renderer, "Cancel"))).toMatchObject({ color: lightColors.brandText, fontSize: 14, lineHeight: 20 });
    const confirm = renderer.root.findAll(
      (node: any) => node.props.accessibilityRole === "button" && node.props.accessibilityState?.disabled === false
    );
    expect(confirm.length).toBeGreaterThan(0);
    expect(textNode(renderer, "Confirm")).toBeTruthy();
  });
});
