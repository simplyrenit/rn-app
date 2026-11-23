import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// ENG-429 (2089:31103): the picker's seeded pin-dropped state, and the permission-denied and location-off branches
// that no seed draws. Under a seed nothing asks for location, geocodes, fetches places or resolves the request.
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAxiosGet = jest.fn(async (..._args: any[]) => ({ data: { results: [] } }));
const mockResolve = jest.fn();
let mockParams: any;

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted", canAskAgain: true, granted: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: "granted", canAskAgain: true, granted: true })),
  hasServicesEnabledAsync: jest.fn(async () => true),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async (): Promise<any> => {
    throw new Error("no fix");
  }),
  reverseGeocodeAsync: jest.fn(async () => []),
}));
const mockLocation: Record<string, jest.Mock<any>> = require("expo-location");
jest.mock("axios", () => ({ __esModule: true, default: { get: (...args: any[]) => mockAxiosGet(...args) } }));
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  const Map = ({ children }: any) => <View testID="live-map">{children}</View>;
  return { __esModule: true, default: Map, Marker: ({ children }: any) => <View>{children}</View>, PROVIDER_GOOGLE: "google" };
});
jest.mock("react-native-google-places-autocomplete", () => ({ GooglePlacesAutocomplete: () => null }));
jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");
  return { GestureHandlerRootView: ({ children }: any) => <View>{children}</View> };
});
jest.mock("assets/mapJSON/darkModeMapStyle.json", () => [], { virtual: true });
jest.mock("@/components/modals/AddressChoiceModalProps", () => () => null);
jest.mock("@/backend/auth", () => ({ useAuth: () => ({ signUpUser: jest.fn(), loading: false }) }));
jest.mock("@/context/auth-context", () => ({ useAuthContext: () => ({ saveUser: jest.fn(), user: null }) }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ theme: "light", setAuthTokens: jest.fn() }) }));
jest.mock("@/lib/config", () => ({ GOOGLE_MAP_API_KEY: "test" }));
jest.mock("@/lib/geocode", () => ({ googleReverseGeocode: jest.fn(async () => null) }));
jest.mock("@/lib/location-request", () => ({
  cancelLocationRequest: jest.fn(),
  resolveLocationRequest: (...args: any[]) => mockResolve(...args),
}));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }) }));
jest.mock("react-native-heroicons/outline", () => {
  const icon = () => null;
  return { MagnifyingGlassIcon: icon, MapPinIcon: icon };
});
jest.mock("react-native-heroicons/mini", () => ({ ViewfinderCircleIcon: () => null }));
jest.mock("@/components/core", () => {
  const { Pressable, Text: T, View: V } = require("react-native");
  const action = (a: any) => (
    <Pressable accessibilityRole="button" onPress={a.disabled ? undefined : a.onPress}>
      <T>{a.label}</T>
    </Pressable>
  );
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    MapPlaceholder: () => <V testID="map-placeholder" />,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    BottomBar: ({ layout, primary, secondary }: any) => (
      <V testID={`bar-${layout ?? "full-cta"}`}>
        {action(primary)}
        {secondary ? action(secondary) : null}
      </V>
    ),
  };
});

// eslint-disable-next-line import/first
import LocationModal from "../location-modal";

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
    renderer = TestRenderer.create(<LocationModal />);
  });
  mounted.push(renderer);
  await settle();
  return renderer;
};
afterEach(() => act(() => mounted.splice(0).forEach((r) => r.unmount())));

const texts = (renderer: any) => renderer.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));

const has = (renderer: any, testID: string) => renderer.root.findAllByProps({ testID }).length > 0;

const press = async (renderer: any, label: string) => {
  const button = renderer.root.find(
    (node: any) =>
      node.props.accessibilityRole === "button" &&
      typeof node.props.onPress === "function" &&
      node.findAllByType(Text).some((t: any) => [].concat(t.props.children).join("") === label)
  );
  await act(async () => {
    await button.props.onPress();
  });
};

const nearby = (place_id: string, name: string) => ({
  place_id,
  name,
  vicinity: "Indiranagar, Bengaluru",
  geometry: { location: { lat: 12.97, lng: 77.64 } },
});
const design = {
  pin: { latitude: 12.9719, longitude: 77.6412 },
  selectedAddress: "12, 4th Cross, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
  nearby: [nearby("p1", "Indiranagar Metro Station"), nearby("p2", "CMH Road, Indiranagar")],
};

const g = globalThis as { __DEV__?: boolean };
const dev = g.__DEV__;
beforeEach(() => {
  jest.clearAllMocks();
  g.__DEV__ = dev;
});

describe("LocationModal (2089:31103)", () => {
  it("seeded: the dropped pin on the kit map, its address, the places and the CTA+Text bar, and nothing asks", async () => {
    const r = await render({ requestId: "design-31103", design });
    expect(texts(r)).toEqual(
      expect.arrayContaining([
        "Choose address",
        "Selected address:",
        design.selectedAddress,
        "Use current location",
        "Indiranagar Metro Station",
        "CMH Road, Indiranagar",
        "Confirm location",
        "Skip for now",
      ])
    );
    expect(has(r, "map-placeholder")).toBe(true);
    expect(has(r, "live-map")).toBe(false);
    expect(has(r, "bar-cta-text")).toBe(true);

    await press(r, "Confirm location");
    await press(r, "Skip for now");
    await press(r, "Use current location");
    expect(mockResolve).not.toHaveBeenCalled();
    expect(mockLocation.getForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(mockLocation.reverseGeocodeAsync).not.toHaveBeenCalled();
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it("live: Skip resolves the request (control for the seeded Skip)", async () => {
    const r = await render({ requestId: "r1" });
    expect(has(r, "live-map")).toBe(true);
    await press(r, "Skip for now");
    expect(mockResolve).toHaveBeenCalledWith("r1", null, null);
  });

  it("the seed is ignored when __DEV__ is false", async () => {
    g.__DEV__ = false;
    const r = await render({ requestId: "r2", design });
    expect(mockLocation.getForegroundPermissionsAsync).toHaveBeenCalled();
    expect(has(r, "map-placeholder")).toBe(false);
    expect(texts(r)).not.toContain(design.selectedAddress);
  });

  it("permission denied: the Location is off banner and 'No location chosen yet'", async () => {
    mockLocation.getForegroundPermissionsAsync.mockImplementationOnce(async () => ({
      status: "denied",
      canAskAgain: false,
      granted: false,
    }));
    const r = await render({ requestId: "r3" });
    expect(texts(r)).toEqual(
      expect.arrayContaining(["Location is off", "No location chosen yet", "Search or tap the map to choose a spot."])
    );
  });

  it("location services off: the message, and Confirm stays off with nothing chosen", async () => {
    mockLocation.hasServicesEnabledAsync.mockImplementationOnce(async () => false);
    const r = await render({ requestId: "r4" });
    expect(texts(r)).toEqual(
      expect.arrayContaining(["Location services are turned off. Please enable them and try again.", "Your address:"])
    );
    await press(r, "Skip for now");
    const confirm = r.root.find(
      (n: any) => n.props.accessibilityRole === "button" && n.findAllByType(Text).some((t: any) => t.props.children === "Confirm location")
    );
    expect(confirm.props.onPress).toBeUndefined();
  });
});
