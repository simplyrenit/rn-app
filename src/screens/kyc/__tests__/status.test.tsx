import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

let mockAccountType = "merchant";
const mockRefetch = jest.fn(async () => undefined);
let mockResolveResume: (value: unknown) => void = () => undefined;
const mockResume = jest.fn(() => new Promise((resolve) => (mockResolveResume = resolve)));
const actionRequired = {
  kyc_status: "action_required",
  case_ref: "kyc_01",
  business_verified: false,
  business_verified_at: null,
  reason_code: null,
  next_action: { type: "resume" },
  updated_at: null,
};

jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ userDetails: { username: "asha", account_type: mockAccountType } }),
}));
jest.mock("@/backend/kyc", () => ({
  // The real query is disabled for a non-merchant; it answers here so the guard is what is tested.
  useKycStatus: () => ({ data: actionRequired, error: null, isLoading: false, refetch: mockRefetch }),
  useResumeKyc: () => mockResume,
  useWithdrawKyc: () => ({ mutateAsync: jest.fn() }),
  useKycBadgeSync: () => undefined,
  openDigiLocker: jest.fn(async () => false),
}));
jest.mock("@react-navigation/native", () => {
  const { useEffect } = require("react");
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    useIsFocused: () => true,
    useRoute: () => ({ params: undefined }),
  };
});
jest.mock("@/lib/types", () => ({
  useTypedNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn(), isFocused: () => true }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/kyc/kyc-chip", () => ({ KycChip: () => null }));
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    Skeleton: () => null,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    EmptyState: ({ title, body }: any) => (
      <V>
        <T>{title}</T>
        <T>{body}</T>
      </V>
    ),
    Button: ({ children, onPress }: any) => (
      <P accessibilityRole="button" onPress={onPress}>
        <T>{children}</T>
      </P>
    ),
  };
});
jest.mock("@/lib/events", () => ({ track: jest.fn() }));
jest.mock("@/lib/haptics", () => ({ successFeedback: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { info: jest.fn(), error: jest.fn(), success: jest.fn() } }));

// eslint-disable-next-line import/first
import KycStatusScreen from "../status";

let mounted: any[] = [];
const render = () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<KycStatusScreen />);
  });
  mounted.push(renderer);
  return renderer;
};
const texts = (renderer: any): string[] => renderer.root.findAllByType(Text).map((t: any) => String(t.props.children));

describe("the verification status screen", () => {
  // Unmounted, so a polling timer the screen started does not outlive the test.
  afterEach(() => {
    act(() => mounted.forEach((renderer) => renderer.unmount()));
    mounted = [];
  });

  beforeEach(() => {
    mockAccountType = "merchant";
    mockRefetch.mockClear();
    mockResume.mockClear();
  });

  it("tells a non-merchant it is for business accounts, and does not ask the server", () => {
    // A return link or a kyc_status push can open it for anyone signed in.
    mockAccountType = "personal";
    const shown = texts(render());
    expect(shown).toContain("Verification is for business accounts");
    expect(shown).not.toContain("Continue verification");
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("shows a merchant their state, read again on arrival", () => {
    const shown = texts(render());
    expect(shown).toContain("Finish verifying with DigiLocker");
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("asks for one DigiLocker session when Continue is tapped twice in one frame", async () => {
    const renderer = render();
    const button = renderer.root
      .findAll((node: any) => node.props.accessibilityRole === "button" && typeof node.props.onPress === "function")
      .find((node: any) => node.findAllByType(Text).some((t: any) => t.props.children === "Continue verification"));
    act(() => {
      button.props.onPress();
      button.props.onPress();
    });
    expect(mockResume).toHaveBeenCalledTimes(1);
    await act(async () => mockResolveResume({ ...actionRequired, next_action: { type: "wait" } }));
  });
});
