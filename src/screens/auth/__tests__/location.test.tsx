import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Alert, Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// Plan §6 (group C): the Location screen's state branches, by seed and live. Under a seed no handler reaches
// sign-up, the location APIs or Google Places; live, a failed fix still raises today's alert and message.
const mockSignUpUser = jest.fn(async (..._args: any[]) => ({ ok: true }));
const mockNavigate = jest.fn();
const mockAxiosGet = jest.fn(async (..._args: any[]) => ({ data: { results: [] } }));
let mockParams: any;

// Built inside the factory: the screen is imported (hoisted) before this file's consts exist.
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
const mockLocation: Record<string, jest.Mock> = require("expo-location");
jest.mock("axios", () => ({ __esModule: true, default: { get: (...args: any[]) => mockAxiosGet(...args) } }));
jest.mock("react-native-maps", () => {
  const { View } = require("react-native");
  const Map = ({ children }: any) => <View>{children}</View>;
  return { __esModule: true, default: Map, Marker: Map, PROVIDER_GOOGLE: "google" };
});
jest.mock("@gorhom/bottom-sheet", () => {
  const { FlatList, View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
    BottomSheetFlatList: (props: any) => <FlatList {...props} />,
  };
});
jest.mock("react-native-google-places-autocomplete", () => ({ GooglePlacesAutocomplete: () => null }));
jest.mock("react-native-svg", () => {
  const none = () => null;
  return { __esModule: true, default: none, Defs: none, LinearGradient: none, Polygon: none, RadialGradient: none, Rect: none, Stop: none };
});
jest.mock("assets/mapJSON/darkModeMapStyle.json", () => [], { virtual: true });
jest.mock("@/backend/auth", () => ({ useAuth: () => ({ signUpUser: mockSignUpUser, loading: false }) }));
jest.mock("@/context/auth-context", () => ({ useAuthContext: () => ({ saveUser: jest.fn() }) }));
jest.mock("@/lib/config", () => ({ GOOGLE_MAP_API_KEY: "test" }));
jest.mock("@/lib/return-to", () => ({ goAfterSignIn: jest.fn() }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("@/components/auth/headerIndicator", () => ({ HeaderIndicator: () => null }));
jest.mock("@/components/core/ring-spinner", () => {
  const { View } = require("react-native");
  return { RingSpinner: (props: any) => <View testID="ring-spinner" {...props} /> };
});
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
    MapPlaceholder: () => null,
    NonScrollableContainer: ({ children }: any) => <V>{children}</V>,
    BottomBar: ({ layout, primary, secondary }: any) => (
      <V testID={`bar-${layout ?? "full-cta"}`}>
        {action(primary)}
        {secondary ? action(secondary) : null}
      </V>
    ),
  };
});

// eslint-disable-next-line import/first
import LocationScreen from "../location";

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const render = async (params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<LocationScreen />);
  });
  await settle();
  return renderer;
};

const texts = (renderer: any) => renderer.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));

/** Presses the enabled button labelled `label`; fails if it is missing or disabled (that would prove nothing). */
const press = async (renderer: any, label: string) => {
  const button = renderer.root.find(
    (node: any) =>
      node.props.accessibilityRole === "button" &&
      node.findAllByType(Text).some((t: any) => [].concat(t.props.children).join("") === label)
  );
  expect(typeof button.props.onPress).toBe("function");
  await act(async () => {
    await button.props.onPress();
  });
};

const place = (place_id: string, name: string, lat: number, lng: number) => ({
  place_id,
  name,
  vicinity: "Bandra West, Mumbai",
  geometry: { location: { lat, lng } },
});
const mapDesign = {
  state: "map",
  coords: { latitude: 19.0596, longitude: 72.8295 },
  selected: { latitude: 19.0656, longitude: 72.8221 },
  address: "Hill Road, Bandra West, Mumbai, Maharashtra 400050",
  selectedAddress: "Carter Road, Bandra West, Mumbai, Maharashtra 400050",
  nearby: [place("design-1", "Bandra Railway Station", 19.0544, 72.8406), place("design-2", "Linking Road", 19.0622, 72.8344)],
};

const expectNothingSent = () => {
  expect(mockSignUpUser).not.toHaveBeenCalled();
  expect(mockAxiosGet).not.toHaveBeenCalled();
  expect(mockLocation.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(mockLocation.reverseGeocodeAsync).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

describe("Location states", () => {
  it("live: a failed fix raises the alert, shows the real message and the CTA+Text bar (28104 live)", async () => {
    const r = await render(undefined);
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalled();
    const message = "We couldn’t fetch your current location. Please try again.";
    expect(Alert.alert).toHaveBeenCalledWith("Unable to fetch location", message);
    expect(texts(r)).toEqual(expect.arrayContaining(["We need your current location", message, "Try again", "Skip for now"]));
    expect(r.root.findAllByProps({ testID: "bar-cta-text" }).length).toBeGreaterThan(0);

    // Control for the seeded Skip below: live, it signs up.
    await press(r, "Skip for now");
    expect(mockSignUpUser).toHaveBeenCalled();
  });

  it("seed failed (28104): the default body, and neither button sends", async () => {
    const r = await render({ design: { state: "failed" } });
    expect(texts(r)).toEqual(
      expect.arrayContaining(["Location access is granted, but we couldn’t fetch your current location yet."])
    );
    await press(r, "Try again");
    await press(r, "Skip for now");
    expectNothingSent();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("seed no-permission (28033): no permission check, and neither button asks or sends", async () => {
    const r = await render({ design: { state: "no-permission" } });
    expect(texts(r)).toEqual(expect.arrayContaining(["Allow location"]));
    await press(r, "Provide location access");
    await press(r, "Skip for now");
    expectNothingSent();
  });

  it("seed fetching (28076): a still ring", async () => {
    const r = await render({ design: { state: "fetching" } });
    expect(r.root.findByProps({ testID: "ring-spinner" }).props.spinning).toBe(false);
    expect(texts(r)).toEqual(expect.arrayContaining(["Fetching your current location..."]));
    expectNothingSent();
  });

  it("seed map (28140): the seeded sheet; Confirm, current location and a place press never send", async () => {
    const r = await render({ design: mapDesign });
    expect(texts(r)).toEqual(
      expect.arrayContaining([
        "Your address",
        mapDesign.address,
        "Selected address",
        mapDesign.selectedAddress,
        "Bandra Railway Station",
        "Linking Road",
      ])
    );
    expect(r.root.findAllByProps({ testID: "bar-full-cta" }).length).toBeGreaterThan(0);
    await press(r, "Confirm location");
    await press(r, "Use current location");
    await press(r, "Bandra Railway Station");
    expectNothingSent();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
