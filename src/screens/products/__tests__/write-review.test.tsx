import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Pressable, Text, TextInput } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// ENG-429 (2089:25101 / 2089:25181): Submit is the kit Full CTA bar, disabled until both reviews and both ratings are
// in; the summary prints the frame's "/day" unit.
const mockWrite = jest.fn(async (..._args: any[]) => undefined);
let mockUser: any = { username: "meera_nair" };

jest.mock("@/backend/reviews", () => ({
  __esModule: true,
  default: () => ({ writeAReview: mockWrite, isLoading: false }),
}));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ userDetails: mockUser }) }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({
    params: {
      product: { name: "speaker", title: "Bluetooth speaker", cover_image: null, location: "Indiranagar, Bengaluru", rate: 550 },
      owner: { username: "karan_rao", first_name: "Karan", last_name: "Rao" },
    },
  }),
}));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ goBack: jest.fn() }) }));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("@/icons/conditions", () => ({ BadCondition: () => null, ExcellentCondition: () => null, GoodCondition: () => null }));
jest.mock("react-native-heroicons/mini", () => ({ ChevronDownIcon: () => null }));
jest.mock("react-native-element-dropdown", () => ({ Dropdown: () => null }));
jest.mock("react-native-keyboard-aware-scroll-view", () => {
  const { View } = require("react-native");
  return { KeyboardAwareScrollView: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/components/core/non-scrollable-container", () => {
  const { View } = require("react-native");
  return { NonScrollableContainer: ({ children }: any) => <View>{children}</View> };
});
jest.mock("@/components/core/rating", () => {
  const { Pressable } = require("react-native");
  return {
    __esModule: true,
    default: ({ onChange, size, gap }: any) => <Pressable testID="rating" size={size} gap={gap} onPress={() => onChange(4)} />,
  };
});
jest.mock("@/components/core", () => {
  const { Text: T, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    BottomBar: ({ primary, layout }: any) => <V testID="bar" layout={layout} primary={primary} />,
  };
});

// eslint-disable-next-line import/first
import WriteReviewScreen from "../write-review";

const mounted: any[] = [];
const render = () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<WriteReviewScreen />);
  });
  mounted.push(renderer);
  return renderer;
};
afterEach(() => act(() => mounted.splice(0).forEach((r) => r.unmount())));

const texts = (r: any) => r.root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));
const bar = (r: any) => r.root.findByProps({ testID: "bar" }).props;

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { username: "meera_nair" };
});

describe("Write a review", () => {
  it("Submit is the kit bar, disabled until both reviews and both ratings are in", async () => {
    const r = render();
    expect(texts(r)).toEqual(expect.arrayContaining(["Write a review", "Bluetooth speaker", "₹550", "/day"]));
    expect(bar(r).layout).toBeUndefined(); // full-cta
    expect(bar(r).primary).toEqual(expect.objectContaining({ label: "Submit feedback", disabled: true }));

    const [product, owner] = r.root.findAllByType(TextInput);
    act(() => product.props.onChangeText("Loud, clear sound."));
    act(() => owner.props.onChangeText("On time at the handover."));
    expect(bar(r).primary.disabled).toBe(true);

    const [productStars, ownerStars] = r.root.findAllByType(Pressable);
    expect(productStars.props.size).toBe(28);
    expect(productStars.props.gap).toBe(8);
    act(() => productStars.props.onPress());
    expect(bar(r).primary.disabled).toBe(true);
    act(() => ownerStars.props.onPress());
    expect(bar(r).primary.disabled).toBe(false);

    await act(async () => {
      await bar(r).primary.onPress();
    });
    expect(mockWrite).toHaveBeenCalledWith(
      expect.objectContaining({ productReview: "Loud, clear sound.", productRating: 4, ownerRating: 4 })
    );
  });

  it("the owner never gets an enabled Submit", () => {
    mockUser = { username: "karan_rao" };
    const r = render();
    const [product, owner] = r.root.findAllByType(TextInput);
    act(() => product.props.onChangeText("a"));
    act(() => owner.props.onChangeText("b"));
    r.root.findAllByType(Pressable).forEach((s: any) => act(() => s.props.onPress()));
    expect(bar(r).primary.disabled).toBe(true);
  });
});
