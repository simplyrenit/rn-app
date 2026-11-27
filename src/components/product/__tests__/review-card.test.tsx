import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// ENG-429: `list` is the All reviews card (2089:24972), `detail` the rail card (2083:16177); `default` is untouched.
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false, shadow: { shadowOpacity: 0.1 } }) };
});
jest.mock("@/components/core", () => {
  const { Text: T, View: V } = require("react-native");
  return {
    Text: ({ children, ...props }: any) => <T {...props}>{children}</T>,
    Avatar: () => <V testID="avatar" />,
  };
});

// eslint-disable-next-line import/first
import { ExpandableText } from "../expandable-text";
// eslint-disable-next-line import/first
import { ReviewCard } from "../review-card";

const mounted: any[] = [];
const render = (variant?: "default" | "detail" | "list") => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(
      <ReviewCard
        variant={variant}
        reviewText="Exactly as described."
        reviewerName="Aarav Mehta"
        reviewDate="2026-10-12T10:00:00+05:30"
        reviewerImage=""
      />
    );
  });
  mounted.push(renderer);
  return renderer;
};
afterEach(() => act(() => mounted.splice(0).forEach((r) => r.unmount())));

const order = (r: any) => {
  // Document order of the avatar and the body, the two blocks whose order differs between the cards.
  const all = r.root.findAll((n: any) => n.props.testID === "avatar" || n.type === ExpandableText);
  return all.map((n: any) => (n.type === ExpandableText ? "body" : "author")).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
};

describe("ReviewCard", () => {
  it("list (24972): author first, two lines of 70% body, the 20-high link control, no box", () => {
    const r = render("list");
    expect(order(r)).toEqual(["author", "body"]);
    expect(r.root.findByType(ExpandableText).props).toEqual(
      expect.objectContaining({ lines: 2, tone: "body", control: "link", controlLineHeight: 20, controlGap: 8 })
    );
    const outer = StyleSheet.flatten(r.root.findAllByType(View)[0].props.style);
    expect(outer.borderWidth).toBeUndefined();
    expect(outer.gap).toBe(8);
    expect(r.root.findAllByType(Text).some((t: any) => t.props.children === "Aarav Mehta")).toBe(true);
  });

  it("detail (16177): the 182 rail card, body then author, the 18-high link control", () => {
    const r = render("detail");
    expect(order(r)).toEqual(["body", "author"]);
    expect(r.root.findByType(ExpandableText).props).toEqual(
      expect.objectContaining({ lines: 3, collapsedHeight: 64, control: "link", controlLineHeight: 18, controlGap: 4 })
    );
    const outer = StyleSheet.flatten(r.root.findAllByType(View)[0].props.style);
    expect(outer).toEqual(expect.objectContaining({ minHeight: 182, padding: 15, borderWidth: 1, gap: 24 }));
  });

  it("default is unchanged: its own body and author, no ExpandableText", () => {
    const r = render();
    expect(r.root.findAllByType(ExpandableText)).toHaveLength(0);
    expect(r.root.findAllByType(Text).some((t: any) => t.props.children === "Exactly as described.")).toBe(true);
  });
});
