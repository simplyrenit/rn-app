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
  signUpUser: jest.fn(async () => ({ access_token: "a", refresh_token: "r" })),
  loading: false,
};
const mockProfile = { updateMyDetails: jest.fn(async () => ({})), loading: false };
const mockNavigate = jest.fn();
const mockSaveUser = jest.fn();
let mockParams: any;

jest.mock("@/backend/auth", () => ({ useAuth: () => mockAuth }));
jest.mock("@/context/auth-context", () => ({ useAuthContext: () => ({ saveUser: mockSaveUser }) }));
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ setAuthTokens: jest.fn(), isAuthenticated: false, userDetails: null, fetchUserDetails: jest.fn() }),
}));
jest.mock("@/backend/profile", () => ({ useProfile: () => mockProfile }));
// The sign-in screen's providers and terms are their own components; this test is about its number field.
jest.mock("@/components/auth", () => ({ LoginOptions: () => null, TermsAndPolicy: () => null }));
jest.mock("react-native-country-picker-modal", () => ({ __esModule: true, default: () => null, DARK_THEME: {} }));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("expo-linear-gradient", () => ({ LinearGradient: () => null }));
jest.mock("@/lib/networkUtils", () => ({ __esModule: true, default: { defaults: { headers: {} } } }));
jest.mock("@/lib/return-to", () => ({ goAfterSignIn: jest.fn() }));
jest.mock("@/lib/sign-in-proof", () => ({ emailProof: jest.fn(), phoneProof: jest.fn() }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }) }));
jest.mock("react-native-heroicons/outline", () => {
  const icon = () => null;
  return { InformationCircleIcon: icon, ChevronDownIcon: icon };
});
jest.mock("@/components/core", () => {
  const { Pressable, Text: T, TextInput: TI, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    // A plain input, so an unseeded control can type into it (found by its label).
    TextField: (props: any) => <TI {...props} />,
    FieldLabel: () => null,
    FieldError: ({ children }: any) => <T>{children}</T>,
    SubpageHeader: () => null,
    Button: ({ children, onPress, disabled }: any) => (
      <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
        <T>{children}</T>
      </Pressable>
    ),
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
import SignInScreen from "../../welcome";
// eslint-disable-next-line import/first
import LoginWithEmail from "../email";
// eslint-disable-next-line import/first
import VerifyCode from "../verify";
// eslint-disable-next-line import/first
import YourName from "../your-name";

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

const type = (renderer: any, label: string, value: string) =>
  act(() =>
    renderer.root
      .findAll((n: any) => (n.props.accessibilityLabel === label || n.props.label === label) && typeof n.props.onChangeText === "function")[0]
      .props.onChangeText(value)
  );

const asha = "asha.k@example.com";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("design seeds never send (plan §1)", () => {
  it("Sign in: Continue with a number", async () => {
    await press(render(SignInScreen, { design: { phone: "98123 45678" } }), "Continue");
    expect(mockAuth.sendPhoneOTP).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Control: unseeded, the typed 10 digits go out as +91 E.164 and the code screen opens.
    const live = render(SignInScreen, undefined);
    type(live, "Mobile number", "98123 45678");
    await press(live, "Continue");
    expect(mockAuth.sendPhoneOTP).toHaveBeenCalledWith("+919812345678");
    expect(mockNavigate).toHaveBeenCalledWith("Verify", { phone: "+919812345678", verificationType: "phone" });
  });

  it("Email: Send code", async () => {
    await press(render(LoginWithEmail, { design: { email: asha } }), "Send code");
    expect(mockAuth.sendOTP).not.toHaveBeenCalled();
    expect(mockSaveUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    const live = render(LoginWithEmail, undefined);
    type(live, "Email", asha);
    await press(live, "Send code");
    expect(mockAuth.sendOTP).toHaveBeenCalledWith(asha);
    expect(mockNavigate).toHaveBeenCalledWith("Verify", { email: asha, verificationType: "otp" });
  });

  it("Verify: Continue and Resend code, by email and by phone", async () => {
    const email = render(VerifyCode, { email: asha, verificationType: "otp", design: { code: "482193", resendIn: 0 } });
    await press(email, "Continue");
    await press(email, "Resend code");
    const phone = render(VerifyCode, { phone: "+919812345678", verificationType: "phone", design: { code: "482193", resendIn: 0 } });
    await press(phone, "Continue");
    await press(phone, "Resend code");
    expect(mockAuth.verifyOTP).not.toHaveBeenCalled();
    expect(mockAuth.verifyPhoneOTP).not.toHaveBeenCalled();
    expect(mockAuth.sendOTP).not.toHaveBeenCalled();
    expect(mockAuth.sendPhoneOTP).not.toHaveBeenCalled();

    // Control: unseeded, Continue checks the code, and Resend opens once the 30 s are up.
    jest.useFakeTimers();
    try {
      const live = render(VerifyCode, { email: asha, verificationType: "otp" });
      const { TextInput } = require("react-native");
      act(() => live.root.findByType(TextInput).props.onChangeText("482193"));
      await press(live, "Continue");
      expect(mockAuth.verifyOTP).toHaveBeenCalledWith(asha, "482193");
      for (let i = 0; i < 30; i++) act(() => jest.advanceTimersByTime(1000));
      await press(live, "Resend code");
      expect(mockAuth.sendOTP).toHaveBeenCalledWith(asha);
    } finally {
      jest.useRealTimers();
    }
  });

  it("Your name: Continue", async () => {
    await press(render(YourName, { design: { firstName: "Asha", lastName: "Kapoor" } }), "Continue");
    expect(mockAuth.signUpUser).not.toHaveBeenCalled();
    expect(mockProfile.updateMyDetails).not.toHaveBeenCalled();

    // Control: signed out after a code, Continue makes the account with the name.
    const live = render(YourName, undefined);
    type(live, "First name", "Asha");
    type(live, "Last name", "Kapoor");
    await press(live, "Continue");
    expect(mockAuth.signUpUser).toHaveBeenCalledWith({ first_name: "Asha", last_name: "Kapoor" });
  });
});
