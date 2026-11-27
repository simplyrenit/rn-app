import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// @ts-ignore: no type package for it (it comes with jest-expo); the test only needs create and act.
import TestRenderer, { act } from "react-test-renderer";
import { todayIst } from "@/lib/booking";

// BookingDates under the ENG-429 design seed: `design.today` replaces todayIst() (the frames' October), `design.mode`
// selects Delivery once its quote says it works, and both are ignored outside __DEV__. Also the J check for the bar:
// each mode's figure comes from that mode's own quote (2089:28290 / 28473), which a fixture's one static quote can't show.
let mockParams: any;
const mockProduct = {
  name: "bluetooth-speaker-skyhire",
  title: "Bluetooth speaker",
  rate: "550.00",
  security_deposit: "3000.00",
  plans: [{ unit: "day", price: "550.00", min: 3 }],
  shop: { name: "SkyHire Rentals", locality: "Indiranagar", delivers: true, delivery_max_km: "10" },
  coordinates: { lat: 12.97, long: 77.64 },
  booked: [],
  location: "Indiranagar",
  requested: null,
};
const mockHome = {
  id: 1,
  address_type: "home",
  label: "",
  locality: "Indiranagar",
  postal_code: "560038",
  coordinates: { lat: 12.97, long: 77.64 },
  is_default: true,
};
const mockQuote = (mode: string) => ({
  days: 3,
  total: mode === "pickup" ? "1650.00" : "1820.00",
  pay_now: "99.00",
  blockers: [],
  delivery: { status: "ok", fee: "170.00", distance_km: "8", offer_pickup: true },
});

jest.mock("@/backend/bookings", () => ({
  usePublicProducts: () => [{ data: mockProduct, isLoading: false, isError: false }],
  useQuote: (input: any) => ({
    data: input ? mockQuote(input.delivery_mode) : undefined,
    isFetching: false,
    isPreviousData: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: jest.fn(),
  StackActions: { push: jest.fn() },
}));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }) }));
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ authTokens: { access_token: "t" }, isAuthenticated: true }),
}));
jest.mock("@/context/delivery-address", () => ({
  useDeliveryAddress: () => ({ address: mockHome, choose: jest.fn() }),
  deliveryAddressKey: () => "1",
}));
jest.mock("@/lib/distance", () => ({ useDistanceTo: () => "2.5 km away" }));
jest.mock("@/lib/events", () => ({ track: jest.fn(), trackLeftOut: jest.fn() }));
jest.mock("@/lib/uuid", () => ({ uuidv4: () => "attempt" }));
jest.mock("@/lib/toast", () => ({ toast: { info: jest.fn() } }));
jest.mock("@/lib/location-request", () => ({ createLocationRequest: jest.fn() }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("react-native-calendars", () => {
  const { View } = require("react-native");
  return { Calendar: (props: any) => <View testID="calendar" {...props} /> };
});
jest.mock("@/components/addresses/address-picker-sheet", () => {
  const R = require("react");
  return { AddressPickerSheet: R.forwardRef(() => null) };
});
jest.mock("@/components/booking/card-lines", () => ({ LineRow: () => null, ShopHead: () => null }));
jest.mock("@/components/cart/parts", () => ({ RentStrip: () => null }));
jest.mock("@/components/booking/parts", () => {
  const { View } = require("react-native");
  const Pass = ({ children }: any) => <View>{children}</View>;
  return {
    BookingLoadError: () => null,
    BookingLoading: () => null,
    BottomBar: (props: any) => <View testID="children-bar" {...props} />,
    Notice: Pass,
    Panel: Pass,
    TextButton: () => null,
  };
});
jest.mock("@/components/core", () => {
  const { Text, View } = require("react-native");
  return {
    Button: () => null,
    Skeleton: () => null,
    SubpageHeader: () => null,
    Text: ({ children }: any) => <Text>{children}</Text>,
    NonScrollableContainer: ({ children }: any) => <View>{children}</View>,
  };
});
jest.mock("@/components/core/non-scrollable-container", () => {
  const { View } = require("react-native");
  return { NonScrollableContainer: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/components/core/bottom-bar", () => {
  const { View } = require("react-native");
  return { BottomBar: (props: any) => <View testID="kit-bar" {...props} /> };
});

// eslint-disable-next-line import/first
import BookingDatesScreen from "../choose-dates";

let renderer: any;
const render = (params: any) => {
  mockParams = params;
  act(() => {
    renderer = TestRenderer.create(<BookingDatesScreen />);
  });
};
const g = globalThis as { __DEV__?: boolean };
afterEach(() => {
  act(() => renderer?.unmount());
  g.__DEV__ = true;
});
const calendar = () => renderer.root.find((n: any) => n.props.testID === "calendar" && typeof n.type !== "string");
const kitBar = () => renderer.root.find((n: any) => n.props.testID === "kit-bar" && typeof n.type !== "string");

const SEEDED = { product: "bluetooth-speaker-skyhire", design: { today: "2026-10-22" } };

describe("BookingDates design seed", () => {
  it("draws the seeded today: the frames' October, 22 as today", () => {
    render(SEEDED);
    expect(calendar().props).toMatchObject({ current: "2026-10-22", minDate: "2026-10-22" });
  });

  it("without a seed, today is the real day", () => {
    render({ product: "bluetooth-speaker-skyhire" });
    expect(calendar().props.minDate).toBe(todayIst());
  });

  it("ignores the seed outside __DEV__", () => {
    g.__DEV__ = false;
    render(SEEDED);
    expect(calendar().props.minDate).toBe(todayIst());
  });

  it("no dates: Summary+CTA reads Pick your dates, Continue off (2089:28666)", () => {
    render(SEEDED);
    expect(kitBar().props).toMatchObject({ layout: "summary-cta", value: "Pick your dates", unit: undefined, subLine: undefined });
    expect(kitBar().props.primary).toMatchObject({ label: "Continue", disabled: true });
  });
});

describe("BookingDates bar reads the chosen mode's own quote", () => {
  const picked = { first_day: "2026-10-24", last_day: "2026-10-26" };

  it("self pickup: the pickup quote's total", () => {
    render({ ...SEEDED, ...picked });
    expect(kitBar().props).toMatchObject({ value: "₹1,650", unit: "· 3 days", subLine: "Sat 24 – Mon 26 Oct" });
  });

  it("Delivery seeded: selected once its quote is in, and the bar reads the delivery quote (2089:28290)", () => {
    render({ ...SEEDED, ...picked, design: { today: "2026-10-22", mode: "owner_delivery" } });
    expect(kitBar().props).toMatchObject({ value: "₹1,820", unit: "· 3 days", subLine: "Sat 24 – Mon 26 Oct" });
    expect(kitBar().props.primary).toMatchObject({ label: "Continue", disabled: false });
  });
});
