import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// ENG-429 (2089:31157, 2089:31227): "Change" stays over the map (seeded: the kit map tile), the seed names the pin
// without the geocoder, a taken type says "Already saved" and cannot be chosen, and both validation errors can
// stand together without a request (31227's two-tap sequence).
const mockCreate = jest.fn(async (..._args: any[]) => ({}));
const mockUpdate = jest.fn(async (..._args: any[]) => ({}));
const mockPlaceFor = jest.fn(async (..._args: any[]) => ({ locality: "Geocoded", postalCode: "111111" }));
const mockNavigate = jest.fn();
let mockParams: any;
let mockAddresses: any[] = [];

jest.mock("@/backend/list-flow/pickup-location", () => ({ placeFor: (...args: any[]) => mockPlaceFor(...args) }));
jest.mock("@/backend/useAddresses", () => ({
  __esModule: true,
  default: () => ({
    addresses: mockAddresses,
    loading: false,
    isError: false,
    create: mockCreate,
    update: mockUpdate,
    remove: jest.fn(),
  }),
}));
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  const Map = ({ children }: any) => <View testID="live-map">{children}</View>;
  return { __esModule: true, default: Map, Marker: () => null, PROVIDER_GOOGLE: "google" };
});
jest.mock("react-native-keyboard-aware-scroll-view", () => {
  const { View } = require("react-native");
  return { KeyboardAwareScrollView: ({ children }: any) => <View>{children}</View> };
});
jest.mock("assets/mapJSON/darkModeMapStyle.json", () => [], { virtual: true });
jest.mock("@/screens/post-screens/location-modal", () => ({
  ADDRESS_NOT_FOUND: "Address not found",
  ADDRESS_UNAVAILABLE: "Unable to retrieve address",
}));
jest.mock("@/lib/location-request", () => ({
  cancelLocationRequest: jest.fn(),
  createLocationRequest: jest.fn(() => "req"),
  resolveLocationRequest: jest.fn(),
}));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({
  useTypedNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: () => () => undefined,
  }),
}));
jest.mock("react-native-heroicons/outline", () => ({ TrashIcon: () => null }));
jest.mock("@/components/core/confirm-sheet", () => {
  const R = require("react");
  return { ConfirmSheet: R.forwardRef(() => null) };
});
jest.mock("@/components/core/checkbox", () => ({ CheckBox: () => null }));
jest.mock("@/components/core/non-scrollable-container", () => {
  const { View } = require("react-native");
  return { NonScrollableContainer: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/components/core", () => {
  const { Pressable, Text: T, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    Skeleton: () => null,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    FieldLabel: ({ label }: any) => <T>{label}</T>,
    FieldError: ({ children }: any) => (children ? <T>{children}</T> : null),
    MapPlaceholder: () => <V testID="map-placeholder" />,
    TextField: ({ label, value, error, hint, onChangeText }: any) => (
      <V testID={`field-${label}`} value={value} onChangeText={onChangeText}>
        <T>{error ?? hint ?? ""}</T>
      </V>
    ),
    Chip: ({ label, selected, onPress }: any) => (
      <Pressable testID={`chip-${label}`} accessibilityState={{ selected }} onPress={onPress}>
        <T>{label}</T>
      </Pressable>
    ),
    BottomBar: ({ primary }: any) => (
      <Pressable testID="bar" accessibilityRole="button" onPress={primary.disabled ? undefined : primary.onPress}>
        <T>{primary.label}</T>
      </Pressable>
    ),
  };
});

// eslint-disable-next-line import/first
import AddressDetailsScreen from "../address-details";

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};
const mounted: any[] = [];
const render = async (params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<AddressDetailsScreen />);
  });
  mounted.push(renderer);
  await settle();
  return renderer;
};
afterEach(() => act(() => mounted.splice(0).forEach((r) => r.unmount())));

const texts = (r: any) => r.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));
const has = (r: any, testID: string) => r.root.findAllByProps({ testID }).length > 0;
const field = (r: any, label: string) => r.root.findByProps({ testID: `field-${label}` });
const type = (r: any, label: string, text: string) => act(() => field(r, label).props.onChangeText(text));
const save = (r: any) =>
  act(async () => {
    await r.root.findByProps({ testID: "bar" }).props.onPress();
  });

const LINE = "HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038";
const place = { locality: "Indiranagar", postalCode: "560038" };
const coordinates = { lat: 12.9719, long: 77.6412 };
const address = (id: number, address_type: string, over: object = {}) => ({
  id,
  address: LINE,
  address_line_1: "Floor 3, Indiqube Orion",
  address_line_2: "Near Indiranagar Club",
  locality: "Indiranagar",
  address_type,
  label: "",
  coordinates,
  is_default: id === 1,
  postal_code: "560038",
  ...over,
});

const g = globalThis as { __DEV__?: boolean };
const dev = g.__DEV__;
beforeEach(() => {
  jest.clearAllMocks();
  mockAddresses = [];
  g.__DEV__ = dev;
});

describe("AddressDetails", () => {
  it("add, seeded (31157): Change over the kit map, the seeded place and PIN, no geocoder", async () => {
    const r = await render({ pin: { ...coordinates, address: LINE }, design: { place } });
    expect(has(r, "map-placeholder")).toBe(true);
    expect(has(r, "live-map")).toBe(false);
    expect(texts(r)).toEqual(expect.arrayContaining(["Address details", "Change", "Indiranagar", LINE, "Save address"]));
    expect(field(r, "PIN code").props.value).toBe("560038");
    expect(mockPlaceFor).not.toHaveBeenCalled();
    // A seeded "Change" never opens the live picker.
    const change = r.root.find((n: any) => n.props.accessibilityLabel === "Change location" && n.props.onPress);
    act(() => change.props.onPress());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("add, live: Change over the live map, and the geocoder names the pin", async () => {
    const r = await render({ pin: { ...coordinates, address: LINE } });
    expect(has(r, "live-map")).toBe(true);
    expect(texts(r)).toContain("Change");
    expect(mockPlaceFor).toHaveBeenCalledWith(coordinates.lat, coordinates.long);
    const change = r.root.find((n: any) => n.props.accessibilityLabel === "Change location" && n.props.onPress);
    act(() => change.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith("LocationModal", expect.anything());
  });

  it("the seed is ignored when __DEV__ is false", async () => {
    g.__DEV__ = false;
    const r = await render({ pin: { ...coordinates, address: LINE }, design: { place } });
    expect(has(r, "map-placeholder")).toBe(false);
    expect(mockPlaceFor).toHaveBeenCalled();
  });

  it("edit with errors (31227): Home is taken, and both errors stand without a request", async () => {
    mockAddresses = [address(1, "home"), address(2, "work")];
    const r = await render({ address: address(2, "work"), design: { place } });
    expect(texts(r)).toEqual(expect.arrayContaining(["Edit address", "Already saved", "Save changes", "Delete address"]));
    // Home is drawn as a chip but cannot be pressed.
    const home = r.root.findByProps({ testID: "chip-Home" });
    const holder = r.root.find((n: any) => n.props.pointerEvents === "none" && n.findAllByProps({ testID: "chip-Home" }).length > 0);
    expect(holder.props.accessibilityState).toEqual({ disabled: true });
    expect(home.props.accessibilityState).toEqual({ selected: false });
    expect(r.root.findByProps({ testID: "chip-Work" }).props.accessibilityState).toEqual({ selected: true });

    type(r, "PIN code", "40005");
    await save(r);
    expect(texts(r)).toContain("Enter a 6-digit PIN code");

    type(r, "Flat, house no. or building", "");
    await save(r);
    expect(texts(r)).toEqual(
      expect.arrayContaining(["Enter your flat, house number or building", "Enter a 6-digit PIN code"])
    );
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
