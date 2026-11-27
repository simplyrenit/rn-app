import { describe, expect, it, jest } from "@jest/globals";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// 2097:29835 (delivery-areas · no shop address). The pincodes read answers 409 `shop_address_missing`, which a design
// fixture can't serve (200 or 404 only), so it is checked here with a real AxiosError: apiError() reads the code only
// from an axios failure's response body.

const mockMissing = new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
  status: 409,
  statusText: "Conflict",
  headers: {},
  config: { headers: new AxiosHeaders() },
  data: { error: { code: "shop_address_missing", message: "Add the shop address first" } },
});

jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
jest.mock("@/backend/shop", () => ({
  useShop: () => ({
    data: { delivers: true, delivery_max_km: 5, delivery_base_fee: 50, delivery_per_km_fee: 15, excluded_pincodes: [] },
  }),
  useAreas: () => ({ data: undefined, error: mockMissing, isLoading: false, refetch: jest.fn() }),
}));
jest.mock("@/lib/delivery-draft", () => ({ deliveryDraft: { set: jest.fn() }, useDeliveryDraft: () => null }));
const mockNavigate = jest.fn();
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/core", () => {
  const { Text: T, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    Skeleton: () => null,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    BottomBar: (props: any) => <V testID="bottom-bar" {...props} />,
    Button: (props: any) => <V testID="button" {...props} />,
  };
});

// eslint-disable-next-line import/first
import DeliveryAreasScreen from "../delivery-areas";

describe("DeliveryAreasScreen, no shop address (2097:29835)", () => {
  it("draws the line and a tonal compact Add shop address that opens ShopAddress", () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<DeliveryAreasScreen />);
    });
    const texts = renderer.root.findAllByType(require("react-native").Text).map((t: any) => t.props.children);
    expect(texts).toContain("Add your shop address first.");
    const button = renderer.root.findByProps({ testID: "button" }).props;
    expect(button).toMatchObject({ variant: "outline", tone: "tonal", size: "compact", children: "Add shop address" });
    act(() => button.onPress());
    expect(mockNavigate).toHaveBeenCalledWith("ShopAddress");
    expect(renderer.root.findByProps({ testID: "bottom-bar" }).props.primary.label).toBe("Back to delivery");
  });
});
