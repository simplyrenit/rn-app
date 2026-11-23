import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// Plan §1: under a design seed every send/check/save handler returns early, so a fixture can never send a code,
// an SMS or a check. Each seeded press is paired with the same press unseeded, which must reach the mock, so the
// seeded assertion cannot pass just because the press never got there.
const mockAuth = {
  sendOTP: jest.fn(async () => ({ message: "ok" })),
  sendPhoneOTP: jest.fn(async () => undefined),
  verifyOTP: jest.fn(async () => ({ access: "a", refresh: "r" })),
  verifyPhoneOTP: jest.fn(async () => ({ access_token: "a", refresh_token: "r" })),
  loginUser: jest.fn(async () => null),
  loading: false,
};
const mockNavigate = jest.fn();
const mockSaveUser = jest.fn();
let mockParams: any;

jest.mock("@/backend/auth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/context/auth-context", () => ({ useAuthContext: () => ({ saveUser: mockSaveUser }) }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ setAuthTokens: jest.fn() }) }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { defaults: { headers: {} } } }));
jest.mock("@/lib/return-to", () => ({ goAfterSignIn: jest.fn() }));
jest.mock("@/lib/sign-in-proof", () => ({ emailProof: jest.fn(), phoneProof: jest.fn() }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("@/components/auth/headerIndicator", () => ({ HeaderIndicator: () => null }));
jest.mock("react-native-heroicons/outline", () => {
  const icon = () => null;
  return { InformationCircleIcon: icon, CheckCircleIcon: icon, EyeIcon: icon, EyeSlashIcon: icon };
});
jest.mock("@/components/core", () => {
  const { Pressable, Text: T, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    TextField: () => null,
    FieldLabel: () => null,
    useFieldSurfaceStyle: () => ({}),
    NonScrollableContainer: ({ children }: any) => <V>{children}</V>,
    ScrollContainer: ({ children }: any) => <V>{children}</V>,
    BottomBar: ({ primary }: any) => (
      <Pressable accessibilityRole="button" onPress={primary.disabled ? undefined : primary.onPress}>
        <T>{primary.label}</T>
      </Pressable>
    ),
  };
});

// eslint-disable-next-line import/first
import ConfirmPassword from "../confirm-password";
// eslint-disable-next-line import/first
import LoginWithEmail from "../email";
// eslint-disable-next-line import/first
import SetPassword from "../password";
// eslint-disable-next-line import/first
import LoginWithPhone from "../phone";
// eslint-disable-next-line import/first
import VerifyEmail from "../verify";

const mounted: any[] = [];
const render = (Screen: React.ComponentType, params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<Screen />);
  });
  mounted.push(renderer);
  return renderer;
};
afterEach(() => act(() => mounted.splice(0).forEach((r) => r.unmount())));

/** Presses the enabled button labelled `label`; fails if it is missing or disabled (that would prove nothing). */
const press = async (renderer: any, label: string) => {
  const button = renderer.root.find(
    (node: any) =>
      node.props.accessibilityRole === "button" &&
      node.findAllByType(Text).some((t: any) => [].concat(t.props.children).join("") === label)
  );
  expect(typeof button.props.onPress).toBe("function");
  expect(button.props.disabled).toBeFalsy();
  await act(async () => {
    await button.props.onPress();
  });
};

const asha = "asha.k@example.com";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("design seeds never send (plan §1)", () => {
  it("Email: 'Email me a code' and 'Use my password'", async () => {
    const seeded = render(LoginWithEmail, { design: { email: asha } });
    await press(seeded, "Email me a code");
    await press(seeded, "Use my password");
    expect(mockAuth.sendOTP).not.toHaveBeenCalled();
    expect(mockSaveUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Control: unseeded, the same press sends. The address arrives by typing; the seed is gone.
    const live = render(LoginWithEmail, undefined);
    act(() => live.root.find((n: any) => n.props.label === "Enter your email").props.onChangeText(asha));
    await press(live, "Email me a code");
    expect(mockAuth.sendOTP).toHaveBeenCalledWith(asha);
  });

  it("Phone: Continue", async () => {
    await press(render(LoginWithPhone, { design: { phone: "+919812345678" } }), "Continue with Mobile OTP");
    expect(mockAuth.sendPhoneOTP).not.toHaveBeenCalled();

    const live = render(LoginWithPhone, undefined);
    act(() => live.root.find((n: any) => n.props.label === "Mobile number").props.onChangeText("+919812345678"));
    await press(live, "Continue with Mobile OTP");
    expect(mockAuth.sendPhoneOTP).toHaveBeenCalledWith("+919812345678");
  });

  it("Verify: Continue and Resend OTP, by email and by phone", async () => {
    const email = render(VerifyEmail, { email: asha, verificationType: "otp", design: { code: "482193" } });
    await press(email, "Continue");
    await press(email, "Resend OTP");
    const phone = render(VerifyEmail, { phone: "+919812345678", verificationType: "phone", design: { code: "482193" } });
    await press(phone, "Continue");
    await press(phone, "Resend OTP");
    const pwd = render(VerifyEmail, { email: asha, verificationType: "password", design: { password: "renit@2026" } });
    await press(pwd, "Continue");
    expect(mockAuth.verifyOTP).not.toHaveBeenCalled();
    expect(mockAuth.verifyPhoneOTP).not.toHaveBeenCalled();
    expect(mockAuth.sendOTP).not.toHaveBeenCalled();
    expect(mockAuth.sendPhoneOTP).not.toHaveBeenCalled();
    expect(mockAuth.loginUser).not.toHaveBeenCalled();

    const live = render(VerifyEmail, { email: asha, verificationType: "otp" });
    const { TextInput } = require("react-native");
    act(() => live.root.findByType(TextInput).props.onChangeText("482193"));
    await press(live, "Continue");
    await press(live, "Resend OTP");
    expect(mockAuth.verifyOTP).toHaveBeenCalledWith(asha, "482193");
    expect(mockAuth.sendOTP).toHaveBeenCalledWith(asha);
  });

  it("Password and Confirm password: Continue", async () => {
    await press(render(SetPassword, { design: { password: "renit@2026" } }), "Continue");
    await press(render(ConfirmPassword, { enteredPassword: "renit@2026", design: { password: "renit@2026" } }), "Continue");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSaveUser).not.toHaveBeenCalled();
  });
});
