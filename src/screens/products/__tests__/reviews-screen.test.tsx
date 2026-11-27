import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// ENG-429 (2089:24972 / 2089:25040): the frame's copy, the score from the stats, the 5–1 histogram, the brand
// "Write a review" row and the `list` cards; with no reviews, "No reviews yet" twice and no cards.
let mockStats: any[] = [];
let mockList: any[] = [];
const mockNavigate = jest.fn();

jest.mock("@/backend/reviews", () => ({
  __esModule: true,
  default: () => ({ getReviewStats: async () => mockStats }),
}));
jest.mock("@/backend/product", () => ({ useProduct: () => ({ fetchReviews: async () => mockList }) }));
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ isAuthenticated: true, userDetails: { username: "meera_nair" } }),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => {
  const R = require("react");
  return {
    useRoute: () => ({
      params: {
        reviews: [],
        product: { name: "speaker" },
        owner: { username: "karan_rao", first_name: "Karan", last_name: "Rao" },
      },
    }),
    // Runs once on mount, as focus does.
    useFocusEffect: (fn: () => void) => R.useEffect(fn, []),
  };
});
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }) }));
jest.mock("react-native-heroicons/mini", () => ({ ChevronRightIcon: () => null }));
jest.mock("react-native-heroicons/solid", () => ({ StarIcon: () => null }));
jest.mock("@/components/core/non-scrollable-container", () => {
  const { View } = require("react-native");
  return { NonScrollableContainer: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/components/product/review-card", () => {
  const { View } = require("react-native");
  return { ReviewCard: (props: any) => <View testID="review-card" {...props} /> };
});
jest.mock("@/components/core", () => {
  const { Text: T } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
  };
});

// eslint-disable-next-line import/first
import ReviewsScreen from "../reviews-screen";

const settle = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};
const mounted: any[] = [];
const render = async () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<ReviewsScreen />);
  });
  mounted.push(renderer);
  await settle();
  return renderer;
};
afterEach(() => act(() => mounted.splice(0).forEach((r) => r.unmount())));

const texts = (r: any) => r.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));
const review = (username: string) => ({
  rating: "5",
  comment: "Good",
  created_at: "2026-10-12T10:00:00+05:30",
  moderation_labels: [],
  user: { username, first_name: "A", last_name: "B", image: null },
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("All reviews", () => {
  it("24 reviews (24972): score, histogram counts, the write row and 24 list cards", async () => {
    mockStats = [
      { rating: 0, count: 0 },
      { rating: 1, count: 1 },
      { rating: 2, count: 1 },
      { rating: 3, count: 2 },
      { rating: 4, count: 6 },
      { rating: 5, count: 14 },
    ];
    mockList = Array.from({ length: 24 }, (_, i) => review(`u${i}`));
    const r = await render();
    expect(texts(r)).toEqual(
      expect.arrayContaining(["All reviews", "Product reviews", "4.3", "•", "Write a review", "14", "6"])
    );
    expect(texts(r).filter((t: string) => t === "24 reviews")).toHaveLength(2);
    const cards = r.root.findAll((n: any) => n.props.testID === "review-card" && typeof n.type !== "string", { deep: false });
    expect(cards).toHaveLength(24);
    expect(cards[0].props.variant).toBe("list");
  });

  it("no reviews yet (25040): the empty copy twice, no cards", async () => {
    mockStats = [];
    mockList = [];
    const r = await render();
    expect(texts(r).filter((t: string) => t === "No reviews yet")).toHaveLength(2);
    expect(r.root.findAll((n: any) => n.props.testID === "review-card")).toHaveLength(0);
  });
});
