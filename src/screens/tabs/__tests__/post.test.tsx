import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// J2 (ENG-435): a fixture answers writes with 409, so the rejected gate's own error line is proved here.
const mockRequestReview = jest.fn(async () => {
  throw new Error("offline");
});

jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({
    theme: "light",
    authTokens: { access_token: "t" },
    isAuthenticated: true,
    userDetails: { username: "asha", account_type: "merchant", merchant_approval_status: "rejected" },
  }),
}));
jest.mock("@/backend/profile", () => ({
  useProfile: () => ({ requestMerchantReview: mockRequestReview, loading: false }),
}));
jest.mock("@/backend/use-refresh-details", () => ({ useRefreshDetailsOnFocus: () => undefined }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/profile/pre-auth/profile-pre-auth", () => () => null);
jest.mock("@/components/booking/parts", () => {
  const { Text: T, View: V } = require("react-native");
  return {
    Notice: ({ title, children }: any) => (
      <V>
        <T>{title}</T>
        <T>{children}</T>
      </V>
    ),
  };
});
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    Button: ({ children, onPress }: any) => (
      <P accessibilityRole="button" onPress={onPress}>
        <T>{children}</T>
      </P>
    ),
  };
});

// eslint-disable-next-line import/first
import Post from "../post";

const texts = (renderer: any) => renderer.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));

describe("Post tab gate", () => {
  it("shows the error line under Request review again when the request fails", async () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<Post />);
    });
    expect(texts(renderer)).toContain("Post");
    expect(texts(renderer)).toContain("Merchant approval required");
    const button = renderer.root.findAll((n: any) => n.props.accessibilityRole === "button" && n.props.onPress)[0];
    await act(async () => {
      await button.props.onPress();
    });
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(texts(renderer)).toContain("Unable to request review right now. Please try again.");
    act(() => renderer.unmount());
  });
});
