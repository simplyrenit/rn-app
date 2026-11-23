import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Linking } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// Plan §1: under a design seed About's Continue and the owner-terms link return early. The unseeded control fills
// the same merchant form and must reach saveUser / openURL, so the seeded assertion can't pass by never getting there.
const mockNavigate = jest.fn();
const mockSaveUser = jest.fn();
let mockParams: any;

jest.mock("@/context/auth-context", () => ({ useAuthContext: () => ({ saveUser: mockSaveUser }) }));
jest.mock("@/backend/terms", () => ({
  usePublicTerms: () => ({ data: { owner: { version: "v1", url: "https://example.test/owner", accepted: null } }, isError: false }),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("@/components/auth/headerIndicator", () => ({ HeaderIndicator: () => null }));
jest.mock("react-native-heroicons/outline", () => ({ InformationCircleIcon: () => null }));
jest.mock("react-native-heroicons/mini", () => ({ ChevronDownIcon: () => null }));
jest.mock("@/components/core/checkbox", () => {
  const { Pressable } = require("react-native");
  return { CheckBox: ({ onPress, accessibilityLabel }: any) => <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} /> };
});
jest.mock("@/components/terms/owner-terms-tick", () => {
  const { Pressable, View: V } = require("react-native");
  return {
    OwnerTermsTick: ({ onChange, onOpenTerms }: any) => (
      <V>
        <Pressable accessibilityLabel="owner-tick" onPress={() => onChange(true)} />
        <Pressable accessibilityLabel="owner-link" onPress={onOpenTerms} />
      </V>
    ),
  };
});
jest.mock("@/components/core", () => {
  const { Pressable, Text: T, TextInput, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    TextField: ({ label, value, onChangeText }: any) => <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} />,
    FieldShell: ({ children }: any) => <V>{children}</V>,
    Button: ({ children, onPress }: any) => <Pressable onPress={onPress}><T>{children}</T></Pressable>,
    NonScrollableContainer: ({ children }: any) => <V>{children}</V>,
    ScrollContainer: ({ children }: any) => <V>{children}</V>,
    BottomBar: ({ primary }: any) => (
      <Pressable accessibilityLabel="continue" onPress={primary.disabled ? undefined : primary.onPress}>
        <T>{primary.label}</T>
      </Pressable>
    ),
  };
});

// eslint-disable-next-line import/first
import About from "../about";

const mounted: any[] = [];
const render = (params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<About />);
  });
  mounted.push(renderer);
  return renderer;
};
const byLabel = (r: any, label: string) =>
  r.root.find((n: any) => n.props.accessibilityLabel === label && (n.props.onPress || n.props.onChangeText));
const tap = (r: any, label: string) => act(() => byLabel(r, label).props.onPress());
const type = (r: any, label: string, text: string) => act(() => byLabel(r, label).props.onChangeText(text));

const merchantSeed = {
  design: {
    merchant: true,
    businessName: "Kapoor Camera Rentals",
    firstName: "Asha",
    lastName: "Kapoor",
    ownerTerms: { version: "design", url: "https://example.test/seed", accepted: null },
    ownerTermsAccepted: true,
    agreed: true,
  },
};

let openURL: any;
beforeEach(() => {
  jest.clearAllMocks();
  openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
});
afterEach(() => {
  act(() => mounted.splice(0).forEach((r) => r.unmount()));
  openURL.mockRestore();
});

describe("About seed guards", () => {
  it("unseeded: a filled merchant form saves, moves on and opens the owner terms", () => {
    const r = render(undefined);
    tap(r, "Are you a merchant?");
    type(r, "Legal name of the business", "Kapoor Camera Rentals");
    type(r, "Owner’s first name", "Asha");
    type(r, "Owner’s last name", "Kapoor");
    tap(r, "owner-tick");
    tap(r, "I agree to provide accurate and verifiable information");
    tap(r, "continue");
    expect(mockSaveUser).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("Password");
    tap(r, "owner-link");
    expect(openURL).toHaveBeenCalledWith("https://example.test/owner");
  });

  it("seeded: Continue and the owner-terms link do nothing, even with a valid form and a URL", () => {
    const r = render(merchantSeed);
    tap(r, "continue");
    tap(r, "owner-link");
    expect(mockSaveUser).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(openURL).not.toHaveBeenCalled();
  });
});
