import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { TouchableOpacity } from "react-native";
// @ts-ignore: no type package for it (it comes with jest-expo); the test only needs create and act.
import TestRenderer, { act } from "react-test-renderer";

// The decision of 2089:26744 / 26814: one shop's Check out is the screen's bar, unless another booking's rent waits or
// the shop has Check out off; several shops keep per-card footers whose Check out is a text link.
let mockCart: any;
let mockBookings: any[] = [];

jest.mock("@/backend/cart", () => ({
  useCart: () => ({ cart: mockCart, query: { refetch: jest.fn(), isLoading: false, isIdle: false }, signedIn: true, add: jest.fn(), remove: jest.fn() }),
}));
jest.mock("@/backend/bookings", () => ({
  useBookings: () => ({ data: { pages: [{ results: mockBookings }] }, refetch: jest.fn() }),
}));
jest.mock("@/backend/useSaved", () => ({
  __esModule: true,
  default: () => ({ favorites: [], saveFavorite: jest.fn(), deleteFavorite: jest.fn() }),
}));
jest.mock("@react-navigation/native", () => ({ useFocusEffect: jest.fn(), useRoute: () => ({ params: undefined }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock("@/lib/toast", () => ({ toast: {} }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
jest.mock("@/components/core", () => {
  const { Text, View } = require("react-native");
  return {
    Text: ({ children, style }: any) => <Text style={style}>{children}</Text>,
    SubpageHeader: () => null,
    EmptyState: () => null,
    BottomBar: (props: any) => <View testID="bar" {...props} />,
  };
});
jest.mock("@/components/core/non-scrollable-container", () => {
  const { View } = require("react-native");
  return { NonScrollableContainer: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/components/booking/parts", () => ({ BookingLoading: () => null, Notice: () => null, Thumb: () => null }));
jest.mock("@/components/booking/card-lines", () => ({ ShopHead: () => null }));
jest.mock("@/components/cart/parts", () => ({ CartChip: () => null, RentStrip: () => null }));

// eslint-disable-next-line import/first
import CartScreen from "../cart";

const line = (name: string) => ({
  product: { name, title: name, cover_image: null, rate: "550.00", deposit: "3000.00" },
  warning: null,
  booking: null,
  added_at: null,
});
const card = (key: string, warning: any = null) => ({
  shop: { key, name: key, locality: "Indiranagar", delivers: true, verified: true },
  warning,
  lines: [line(`${key}-a`), line(`${key}-b`)],
});
const accepted = { number: "RN-1", stage: "accepted", shop: { name: "HomeEase" }, money: { rent_due_at: "2026-11-23T11:04:00Z" } };

let renderer: any;
const render = (cards: any[], bookings: any[] = []) => {
  mockCart = { count: cards.length * 2, cards };
  mockBookings = bookings;
  act(() => {
    renderer = TestRenderer.create(<CartScreen />);
  });
};
afterEach(() => act(() => renderer?.unmount()));

const bar = () => renderer.root.findAll((n: any) => n.props.testID === "bar" && typeof n.type !== "string");
const checkOutLinks = () =>
  renderer.root.findAll((n: any) => n.type === TouchableOpacity && /^Check out /.test(n.props.accessibilityLabel ?? ""));

describe("Cart: where Check out goes", () => {
  it("one shop: the Summary+CTA bar, and no card footer", () => {
    render([card("SkyHire")]);
    expect(bar()).toHaveLength(1);
    expect(bar()[0].props).toMatchObject({
      layout: "summary-cta",
      value: "2 items",
      subLine: "Deposit ₹6,000 (refundable)",
      primary: expect.objectContaining({ label: "Check out" }),
    });
    expect(checkOutLinks()).toHaveLength(0);
  });

  it("one shop while another booking's rent waits: the card footer's link, no bar", () => {
    render([card("SkyHire")], [accepted]);
    expect(bar()).toHaveLength(0);
    expect(checkOutLinks()).toHaveLength(1);
  });

  it("one shop with Check out off: the card footer, its link at half opacity", () => {
    render([card("Party", { code: "one_item_only" })]);
    expect(bar()).toHaveLength(0);
    const [link] = checkOutLinks();
    expect(link.props.disabled).toBe(true);
    expect(link.props.style).toMatchObject({ opacity: 0.5 });
    expect(link.props.accessibilityState).toEqual({ disabled: true });
  });

  it("two shops: a text link per card, no bar", () => {
    render([card("SkyHire"), card("Party")]);
    expect(bar()).toHaveLength(0);
    const links = checkOutLinks();
    expect(links).toHaveLength(2);
    expect(links[0].props.style).toMatchObject({ opacity: 1 });
  });
});
