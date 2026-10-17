import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({ color: { brand: "#635BE8", brandText: "#635BE8", onBrand: "#fff" } }),
}));
jest.mock("../core/text", () => {
  const { Text: T } = require("react-native");
  return { Text: ({ children }: any) => <T>{children}</T> };
});

// eslint-disable-next-line import/first
import { VerifiedBusinessBadge } from "../core/verified-business-badge";

const render = (element: React.ReactElement) => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(element);
  });
  return renderer;
};

describe("the Verified business badge (ENG-73)", () => {
  it("draws the mark and its words for a verified business, in both variants", () => {
    for (const variant of ["mark", "chip"] as const) {
      const renderer = render(<VerifiedBusinessBadge verified variant={variant} />);
      expect(renderer.root.findByType(Text).props.children).toBe("Verified");
      expect(renderer.root.findByProps({ accessibilityLabel: "Verified business" })).toBeTruthy();
    }
  });

  it("draws nothing for an unverified business or an API that does not say", () => {
    for (const verified of [false, undefined]) {
      expect(render(<VerifiedBusinessBadge verified={verified} />).toJSON()).toBeNull();
    }
  });
});
