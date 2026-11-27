import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// J1 (ENG-435): under a design seed Submitted never clears the (not per-account) draft, never tracks, never navigates
// and never asks for notifications. Without one, the same paths run.
let mockParams: any = {};
const mockClearSubmitted = jest.fn();
const mockNavigation = { navigate: jest.fn(), reset: jest.fn() };
const mockTrack = jest.fn();
const mockRequestPermissions = jest.fn(async () => ({}));
let mockPermission: any = null;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn() },
}));
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ userDetails: { username: "design_kapoor_books", account_type: "merchant" } }),
}));
jest.mock("@/context/list-draft-context", () => ({
  useListDraft: () => ({ draft: { attemptId: "real" }, clearSubmitted: mockClearSubmitted }),
}));
jest.mock("@/backend/kyc", () => ({ useKycStatus: () => ({ data: { kyc_status: "none", reason_code: null } }) }));
jest.mock("@/backend/shop", () => ({ useShop: () => ({ data: { can_take_bookings: true } }) }));
jest.mock("@/backend/ring-permission", () => ({
  useRingPermission: () => ({
    state: "unavailable",
    ask: mockRequestPermissions,
    askOnce: mockRequestPermissions,
    openSettings: mockRequestPermissions,
  }),
}));
jest.mock("@/components/shop/ring-permission-card", () => ({
  RingPermissionCard: ({ permission }: any) => {
    mockPermission = permission;
    return null;
  },
}));
jest.mock("@/lib/events", () => ({ track: (...args: any[]) => mockTrack(...args) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => mockNavigation }));
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/kyc/kyc-chip", () => ({ KycChip: () => null }));
jest.mock("@/components/product/listing-status", () => ({ ListingStatusPill: () => null }));
jest.mock("@/components/list-flow/motion", () => ({ FLOW_SPRING: { damping: 1, stiffness: 1 } }));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  const anim = { duration: () => anim, springify: () => anim, damping: () => anim, stiffness: () => anim };
  return { __esModule: true, default: { View }, FadeIn: anim, ZoomIn: anim };
});
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T } = require("react-native");
  const button = (label: string, onPress: () => void) => (
    <P key={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <T>{label}</T>
    </P>
  );
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    useReduceMotion: () => true,
    Button: ({ children, onPress }: any) => button(children, onPress),
    BottomBar: ({ primary, secondary }: any) => [secondary && button(secondary.label, secondary.onPress), button(primary.label, primary.onPress)],
  };
});

// eslint-disable-next-line import/first
import AsyncStorage from "@react-native-async-storage/async-storage";
// eslint-disable-next-line import/first
import { fixtures } from "@/dev/design-fixtures/10";
// eslint-disable-next-line import/first
import ListSubmittedScreen from "../submitted";

const flush = () => act(async () => await Promise.resolve());
const press = (renderer: any, label: string) =>
  act(() => renderer.root.find((n: any) => n.props.accessibilityLabel === label && n.props.onPress).props.onPress());
const texts = (renderer: any) => renderer.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));

let mounted: any[] = [];
const render = async (params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<ListSubmittedScreen />);
  });
  await flush();
  mounted.push(renderer);
  return renderer;
};

afterEach(() => {
  mounted.forEach((r) => act(() => r.unmount()));
  mounted = [];
  jest.clearAllMocks();
});

describe("Submitted under a design seed", () => {
  it("does not clear the draft with the 2096:29435 params", async () => {
    await render(fixtures["2096:29435"].params);
    expect(mockClearSubmitted).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it("clears the draft without a seed", async () => {
    await render({ productName: "1984", status: "checking" });
    expect(mockClearSubmitted).toHaveBeenCalledTimes(1);
  });

  it("shows the KYC nudge inert: no flag, no event, no navigation", async () => {
    const renderer = await render(fixtures["2096:29335"].params);
    expect(texts(renderer)).toContain("Get a Verified business badge");
    press(renderer, "Verify my business");
    renderer.root.findAll((n: any) => n.props.accessibilityRole === "button" && n.props.onPress)
      .filter((n: any) => texts({ root: n }).includes("Not now"))
      .forEach((n: any) => act(() => n.props.onPress()));
    press(renderer, "List another item");
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockNavigation.reset).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("hands the ring card the seeded permission with inert actions", async () => {
    await render(fixtures["2097:31046"].params);
    expect(mockPermission.state).toBe("ask");
    await act(async () => {
      await mockPermission.askOnce();
      await mockPermission.ask();
      mockPermission.openSettings();
    });
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("without a seed the nudge's Verify reaches navigation", async () => {
    const renderer = await render({ productName: "1984", status: "checking" });
    press(renderer, "Verify my business");
    expect(mockTrack).toHaveBeenCalledWith("kyc_nudge", { action: "opened" });
    expect(mockNavigation.navigate).toHaveBeenCalledWith("KycIntro", { source: "post_listing" });
  });
});
