import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// ENG-429 (01 2083:16201): the sheet's own title row is now the kit SheetHeader, with its close X and no grabber
// (gorhom draws the handle), and every spec is listed.
jest.mock("@/components/core/custom-bottom-sheet-modal", () => {
  const R = require("react");
  const { View } = require("react-native");
  return { __esModule: true, default: R.forwardRef(({ children }: any, _ref: any) => <View>{children}</View>) };
});
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("react-native-heroicons/mini", () => ({ CheckIcon: () => null, ChevronRightIcon: () => null }));
jest.mock("@/components/core", () => {
  const { Text: T, View } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    SheetHeader: (props: any) => <View testID="sheet-header" {...props} />,
    usePressFeedback: () => ({ pressStyle: null, onPressIn: () => {}, onPressOut: () => {} }),
  };
});

// eslint-disable-next-line import/first
import { AllSpecsSheet } from "../product-specs";

const specs = [
  { key: "author", label: "Author", value: "George Orwell", facet: "default" as const },
  { key: "weight", label: "Weight", value: "520 g", facet: "expanded" as const },
];

describe("AllSpecsSheet", () => {
  it("draws the kit SheetHeader with its close and every spec", () => {
    const onClose = jest.fn();
    let r: any;
    act(() => {
      r = TestRenderer.create(<AllSpecsSheet specs={specs} onClose={onClose} />);
    });
    const header = r.root.findByProps({ testID: "sheet-header" }).props;
    expect(header.title).toBe("Specifications");
    expect(header.grabber).toBe(false);
    header.onClose();
    expect(onClose).toHaveBeenCalled();
    const texts = r.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));
    expect(texts).toEqual(expect.arrayContaining(["Author", "George Orwell", "Weight", "520 g"]));
    act(() => r.unmount());
  });
});
