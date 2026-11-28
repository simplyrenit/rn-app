import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// The real useAuth runs; only its leaves are stubbed. otpCheck answers 401 as the server does for a wrong code.
const mockOtpCheck = jest.fn(async (..._args: unknown[]) => {
  throw { response: { status: 401, data: { error: "Invalid OTP" } } };
});
jest.mock("@/backend/sign-in-calls", () => ({
  otpCheck: (...args: unknown[]) => mockOtpCheck(...args),
  emailLogin: jest.fn(),
  phoneLogin: jest.fn(),
  signUp: jest.fn(),
}));
jest.mock("axios", () => ({ post: jest.fn(), get: jest.fn() }));
jest.mock("@/lib/firebase", () => ({
  authenticateFirebase: jest.fn(),
  initializeAppCheck: jest.fn(),
  setPhoneReauthInProgress: jest.fn(),
  signOutFirebase: jest.fn(),
}));
jest.mock("@/lib/config", () => ({ DEV_MODE: "QA", OTP: "/otp/" }));
jest.mock("@/lib/auth-fns", () => ({ getAuthTokens: jest.fn() }));
jest.mock("@/lib/unlock", () => ({ readIdToken: jest.fn() }));
jest.mock("@/lib/phone-change", () => ({ sendPhoneCodeWith: jest.fn() }));
jest.mock("@/backend/terms", () => ({ acceptOwnerTerms: jest.fn() }));
jest.mock("@/lib/return-to", () => ({ signInIntent: () => ({}), goAfterSignIn: jest.fn() }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { defaults: { headers: {} } } }));
jest.mock("@/context/auth-context", () => ({
  useAuthContext: () => ({ user: {}, saveUser: jest.fn(), clearUser: jest.fn() }),
}));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ setAuthTokens: jest.fn() }) }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: { email: "asha.k@example.com", verificationType: "otp" } }),
  StackActions: { replace: jest.fn() },
}));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }) }));
jest.mock("react-native-country-picker-modal", () => ({ __esModule: true, default: () => null, DARK_THEME: {} }));
jest.mock("react-native-heroicons/outline", () => ({ InformationCircleIcon: () => null, ChevronDownIcon: () => null }));
jest.mock("@/components/core", () => {
  const { Pressable, Text: T, View: V } = require("react-native");
  return {
    Text: ({ children, style }: any) => <T style={style}>{children}</T>,
    TextField: () => null,
    FieldLabel: () => null,
    FieldError: () => null,
    useFieldSurfaceStyle: () => ({}),
    SubpageHeader: () => null,
    NonScrollableContainer: ({ children }: any) => <V>{children}</V>,
    ScrollContainer: ({ children }: any) => <V>{children}</V>,
    BottomBar: ({ primary }: any) => (
      <Pressable testID="cta" accessibilityRole="button" onPress={primary.disabled ? undefined : primary.onPress}>
        <T>{primary.label}</T>
      </Pressable>
    ),
  };
});

// eslint-disable-next-line import/first
import VerifyCode from "../verify";

const texts = (renderer: any): string[] =>
  renderer.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));

describe("Verify, wrong code (2089:21903, copy from 02b)", () => {
  it("a 401 from the code check draws all six cells in dangerStrong and the message row", async () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<VerifyCode />);
    });
    act(() => renderer.root.findByType(TextInput).props.onChangeText("482139"));
    const cta = renderer.root.findByProps({ testID: "cta" });
    expect(cta.props.onPress).toBeDefined();
    await act(async () => {
      await cta.props.onPress();
    });

    expect(mockOtpCheck).toHaveBeenCalledWith("asha.k@example.com", "482139");
    expect(texts(renderer)).toContain("That code didn't work. Check it and try again.");
    const red = renderer.root
      .findAllByType(View)
      .map((v: any) => StyleSheet.flatten(v.props.style) ?? {})
      .filter((s: any) => s.borderColor === "#D92D20" && s.borderWidth === 1.5 && s.height === 52);
    expect(red).toHaveLength(6);
    act(() => renderer.unmount());
  });
});
