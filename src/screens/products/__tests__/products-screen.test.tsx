import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// ENG-429 (01 2083:15971, 04 2089:22597 / 22896 / 23201 / 23523 / 23841): which kit bar each state draws, the
// requested line still above it in both the summary and the cart layouts, the wrapper's onLayout kept for the toasts,
// and the dev seed read only under __DEV__.
let mockProduct: any;
let mockCart: any;
let mockUser: any;
let mockParams: any;

jest.mock("@/backend/chat", () => ({ useChat: () => ({ startChat: jest.fn() }) }));
jest.mock("@/backend/product", () => ({
  useProduct: () => ({
    fetchProduct: async () => mockProduct,
    fetchSimilarProducts: async () => [],
    fetchReviews: async () => [],
  }),
}));
jest.mock("@/backend/profile", () => ({ useProfile: () => ({ getMyProductDetails: async () => ({ status: "live" }) }) }));
jest.mock("@/backend/useSaved", () => ({ __esModule: true, default: () => ({ favorites: [] }) }));
jest.mock("@/backend/cart", () => ({
  useCart: () => ({ cart: mockCart, query: { isFetched: true }, add: jest.fn() }),
}));
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ isAuthenticated: true, userDetails: mockUser }),
}));
jest.mock("@/context/delivery-address", () => ({ useDeliveryAddress: () => ({ address: null }) }));
jest.mock("@/lib/events", () => ({ track: jest.fn() }));
jest.mock("@/lib/distance", () => ({ useDistanceTo: () => null }));
jest.mock("@/lib/location", () => ({ getDiscoveryLocationData: async () => null }));
jest.mock("@/lib/return-to", () => ({ rememberReturnTo: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));
jest.mock("@/lib/category-icons", () => ({ CategoryIcon: () => null }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => {
  const R = require("react");
  return {
    useRoute: () => ({ params: mockParams }),
    useFocusEffect: (fn: () => void) => R.useEffect(fn, []),
    useIsFocused: () => true,
    useNavigation: () => ({ push: jest.fn() }),
  };
});
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn(), setParams: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => {
  const { View } = require("react-native");
  return {
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: ({ children }: any) => <View>{children}</View>,
  };
});
jest.mock("react-native-heroicons/outline", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-heroicons/mini", () => new Proxy({}, { get: () => () => null }));
jest.mock("@/components/cart/parts", () => {
  const { View } = require("react-native");
  return { CartButton: () => null, RequestedLine: () => <View testID="requested-line" /> };
});
jest.mock("@/components/core", () => {
  const { Text: T, View } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    BackButton: () => null,
    Button: ({ children }: any) => <T>{children}</T>,
    Card: () => null,
    CrossFade: ({ children }: any) => <View>{children}</View>,
    BottomBar: (props: any) => <View testID="bottom-bar" {...props} />,
  };
});
jest.mock("@/components/core/condition-renderer", () => ({ ConditionRenderer: () => null }));
jest.mock("@/components/core/icon-button", () => ({ IconButton: () => null }));
jest.mock("@/components/core/empty-state", () => ({ EmptyState: () => null }));
jest.mock("@/components/booking/booking-facts", () => ({ BookingFacts: () => null }));
jest.mock("@/components/product/detail-section", () => {
  const { View } = require("react-native");
  return { DetailSection: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/components/product/expandable-text", () => ({ ExpandableText: () => null }));
jest.mock("@/components/product/moderation-banner", () => ({ ModerationBanner: () => null }));
jest.mock("@/components/product/listing-status", () => ({ ListingStatusPill: () => null, HeldChange: () => null }));
jest.mock("@/components/product/product-hero", () => {
  const { View } = require("react-native");
  return { GALLERY_HEIGHT: 390, ProductHero: (props: any) => <View testID="hero" {...props} /> };
});
jest.mock("@/components/product/spec-strip", () => ({ SpecStrip: () => null }));
jest.mock("@/components/product/product-map", () => {
  const { View } = require("react-native");
  return { ProductMap: (props: any) => <View testID="map" {...props} /> };
});
jest.mock("@/components/product/product-specs", () => {
  const R = require("react");
  return { AllSpecsSheet: R.forwardRef(() => null), SpecsCard: () => null };
});
jest.mock("@/components/product/product-owner", () => ({ AboutOwner: () => null }));
jest.mock("@/components/product/review-card", () => ({ ReviewCard: () => null }));
jest.mock("@/components/product/stars", () => ({ Stars: () => null }));
jest.mock("@/components/product/use-focused-status-bar", () => ({ useFocusedStatusBar: () => undefined }));
jest.mock("../products-skeleton", () => ({ ProductsSkeleton: () => null }));

// eslint-disable-next-line import/first
import DetailsScreen from "../products-screen";

const settle = async () => {
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};
const mounted: any[] = [];
const render = async () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<DetailsScreen />);
  });
  mounted.push(renderer);
  await settle();
  return renderer;
};
afterEach(() => act(() => mounted.splice(0).forEach((r) => r.unmount())));

const bar = (r: any) => r.root.findByProps({ testID: "bottom-bar" }).props;
const hasRequested = (r: any) => r.root.findAllByProps({ testID: "requested-line" }).length > 0;

const PRODUCT = {
  name: "nineteen-eighty-four",
  title: "1984 – George Orwell",
  description: "",
  security_deposit: "1000.00",
  rate: "19.00",
  plans: [{ unit: "day", price: "19.00", min: 2 }],
  condition: "excellent",
  category: { title: "Fiction", parent: { title: "Books" } },
  moderation_labels: [],
  images: [],
  cover_image: "",
  coordinates: { lat: 19.1, long: 72.8 },
  location: "Goregaon, Mumbai",
  owner: { username: "rohan_mehta", first_name: "Rohan", last_name: "Mehta" },
  live_booking: true,
  can_add_to_cart: false,
};
const IN_CART = { count: 1, cards: [{ shop: { key: "rohan_mehta" }, warning: null, lines: [{ product: { name: PRODUCT.name } }] }] };

beforeEach(() => {
  mockProduct = { ...PRODUCT };
  mockCart = { count: 0, cards: [] };
  mockUser = { username: "aditi_sharma" };
  mockParams = { id: PRODUCT.name };
});

describe("ProductDetail bottom bar", () => {
  it("live booking (15971): Summary+CTA, ₹19 /day over the deposit, Book now", async () => {
    const props = bar(await render());
    expect(props.layout).toBe("summary-cta");
    expect([props.value, props.unit, props.subLine]).toEqual(["₹19", "/day", "Deposit ₹1,000"]);
    expect(props.primary.label).toBe("Book now");
    expect(props.primary.labelSize).toBeUndefined();
  });

  it("closed now, no cart (22295): Book for the morning at the full 16/24 beside the summary", async () => {
    mockProduct = { ...PRODUCT, live_booking: false, book_for_morning: true };
    const props = bar(await render());
    expect(props.layout).toBe("summary-cta");
    expect(props.primary.label).toBe("Book for the morning");
    expect(props.primary.labelSize).toBeUndefined();
  });

  it("not taking bookings (22597): Summary with the note in the primary's place", async () => {
    mockProduct = { ...PRODUCT, live_booking: false };
    const props = bar(await render());
    expect(props.layout).toBe("summary-cta");
    expect(props.primary).toBeUndefined();
    expect(props.note).toBe("Not taking bookings right now");
  });

  it("cart, live (22896): Add to cart beside Book now", async () => {
    mockProduct = { ...PRODUCT, can_add_to_cart: true };
    const props = bar(await render());
    expect(props.layout).toBe("secondary-primary");
    expect(props.secondary.label).toBe("Add to cart");
    expect(props.primary.label).toBe("Book now");
  });

  it("in cart, closed now (23201): ✓ In cart · View beside a compact Book for the morning", async () => {
    mockProduct = { ...PRODUCT, live_booking: false, book_for_morning: true, can_add_to_cart: true };
    mockCart = IN_CART;
    const props = bar(await render());
    expect(props.layout).toBe("secondary-primary");
    expect(props.secondary.label).toBe("✓ In cart · View");
    expect(props.primary).toMatchObject({ label: "Book for the morning", labelSize: "compact" });
  });

  it("cart, no booking (23523): Add to cart is the one Full CTA", async () => {
    mockProduct = { ...PRODUCT, live_booking: false, can_add_to_cart: true };
    const props = bar(await render());
    expect(props.layout).toBe("full-cta");
    expect(props.primary.label).toBe("Add to cart");
  });

  it("owner (23841): Summary+CTA with Edit product", async () => {
    mockUser = { username: "rohan_mehta" };
    const props = bar(await render());
    expect(props.layout).toBe("summary-cta");
    expect(props.primary.label).toBe("Edit product");
  });

  it("keeps the requested line above the bar in the summary and the cart layouts, and the wrapper's onLayout", async () => {
    mockProduct = { ...PRODUCT, requested: { number: "RN-21345" } };
    let r = await render();
    expect(hasRequested(r)).toBe(true);
    expect(bar(r).layout).toBe("summary-cta");
    // The wrapper measures itself so the cart's toasts sit above the bar.
    const wrappers = r.root.findAll(
      (n: any) => typeof n.type === "string" && n.props.onLayout && n.findAllByProps({ testID: "bottom-bar" }).length > 0
    );
    expect(wrappers.length).toBeGreaterThan(0);

    mockProduct = { ...PRODUCT, requested: { number: "RN-21345" }, can_add_to_cart: true };
    r = await render();
    expect(hasRequested(r)).toBe(true);
    expect(bar(r).layout).toBe("secondary-primary");
  });
});

describe("ProductDetail dev seed", () => {
  const g = global as unknown as { __DEV__: boolean };
  afterEach(() => {
    g.__DEV__ = true;
  });

  it("opens the photo viewer and draws the neutral map when seeded, and neither unseeded", async () => {
    mockParams = { id: PRODUCT.name, design: { open: "photo" } };
    let r = await render();
    expect(r.root.findByProps({ testID: "hero" }).props.initialViewerOpen).toBe(true);
    expect(r.root.findByProps({ testID: "map" }).props.placeholder).toBe(true);

    mockParams = { id: PRODUCT.name };
    r = await render();
    expect(r.root.findByProps({ testID: "hero" }).props.initialViewerOpen).toBe(false);
    expect(r.root.findByProps({ testID: "map" }).props.placeholder).toBe(false);
  });

  it("ignores the seed outside a dev build", async () => {
    g.__DEV__ = false;
    mockParams = { id: PRODUCT.name, design: { open: "photo" } };
    const r = await render();
    expect(r.root.findByProps({ testID: "hero" }).props.initialViewerOpen).toBe(false);
    expect(r.root.findByProps({ testID: "map" }).props.placeholder).toBe(false);
  });
});
