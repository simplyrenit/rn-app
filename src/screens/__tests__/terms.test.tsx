import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// Frames 2089:28209 (loading) and 2089:28232 (bundled fallback): the fallback cannot be reached
// live on QA, which serves a terms URL, so the states are proven here and by the design seed.
let mockParams: any = undefined;
let mockOpened: (opened: boolean) => void = () => undefined;
const mockOpenCustomerTerms = jest.fn(() => new Promise<boolean>((resolve) => (mockOpened = resolve)));
const mockGoBack = jest.fn();

jest.mock("@/lib/terms-link", () => ({ openCustomerTerms: () => mockOpenCustomerTerms() }));
jest.mock("@/backend/terms", () => ({ fetchPublicTerms: jest.fn() }));
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
// RingSpinner is group B's (plan §3); virtual so this test does not depend on it landing first.
jest.mock(
  "@/components/core/ring-spinner",
  () => {
    const { View } = require("react-native");
    return { RingSpinner: (props: any) => <View testID="ring-spinner" {...props} /> };
  },
  { virtual: true }
);
jest.mock("@/components/core", () => {
  const { Text: T } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
  };
});

import Terms from "../terms";

const texts = (root: any) => root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));
const spinner = (root: any) => root.findAllByProps({ testID: "ring-spinner" })[0];

describe("Terms", () => {
  beforeEach(() => {
    mockParams = undefined;
    mockOpenCustomerTerms.mockClear();
    mockGoBack.mockClear();
  });

  it("shows the spinning ring while the server page is read, then the bundled text when it cannot open", async () => {
    let r: any;
    await act(async () => {
      r = TestRenderer.create(<Terms />);
    });
    expect(mockOpenCustomerTerms).toHaveBeenCalledTimes(1);
    expect(spinner(r.root).props.spinning).toBe(true);
    expect(texts(r.root)).not.toContain("Last updated: 10/11/2024");

    await act(async () => mockOpened(false));
    expect(r.root.findAllByProps({ testID: "ring-spinner" })).toHaveLength(0);
    expect(texts(r.root)).toEqual(expect.arrayContaining(["Last updated: 10/11/2024", "1. Acceptance of Terms"]));
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it("steps back once the browser has opened the server page", async () => {
    await act(async () => {
      TestRenderer.create(<Terms />);
    });
    await act(async () => mockOpened(true));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it("design seed `loading` draws a still ring and never reads or opens the terms", async () => {
    mockParams = { design: { state: "loading" } };
    let r: any;
    await act(async () => {
      r = TestRenderer.create(<Terms />);
    });
    expect(spinner(r.root).props.spinning).toBe(false);
    expect(mockOpenCustomerTerms).not.toHaveBeenCalled();
  });

  it("design seed `fallback` draws the bundled text and never reads or opens the terms", async () => {
    mockParams = { design: { state: "fallback" } };
    let r: any;
    await act(async () => {
      r = TestRenderer.create(<Terms />);
    });
    expect(texts(r.root)).toEqual(expect.arrayContaining(["Last updated: 10/11/2024", "2. General Terms"]));
    expect(mockOpenCustomerTerms).not.toHaveBeenCalled();
  });
});
