import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// @ts-ignore: no type package for it (it comes with jest-expo); the test only needs create and act.
import TestRenderer, { act } from "react-test-renderer";

const DUE = "2026-11-23T11:04:00Z";
const mockBooking = {
  number: "RN-30412",
  stage: "accepted",
  shop: { name: "HomeEase" },
  pay_now: null,
  money: { rent_due_at: DUE, pay_after_accept: "1240.00", deposit_with_rent: false },
};

jest.mock("@/backend/bookings", () => ({
  useBookings: () => ({ data: { pages: [{ results: [mockBooking] }] } }),
}));
jest.mock("@/backend/cart", () => ({ useCart: () => ({ cart: undefined }) }));
jest.mock("@/lib/events", () => ({ track: jest.fn() }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@/components/core", () => {
  const { Text } = require("react-native");
  return { Text: ({ children }: any) => <Text>{children}</Text>, IconButton: () => null };
});
jest.mock("@/components/booking/parts", () => {
  const { Text } = require("react-native");
  return { Pill: ({ label }: any) => <Text>{label}</Text> };
});

// eslint-disable-next-line import/first
import { RentStrip } from "../parts";

const texts = (renderer: any): string[] =>
  renderer.root.findAll((n: any) => typeof n.props.children === "string").map((n: any) => n.props.children);

let renderer: any;
afterEach(() => {
  act(() => renderer?.unmount());
  jest.restoreAllMocks();
});

describe("RentStrip", () => {
  it("draws a frozen `now` as one still frame: 4:12 left, and no tick", () => {
    const interval = jest.spyOn(global, "setInterval");
    act(() => {
      renderer = TestRenderer.create(<RentStrip now={new Date(Date.parse(DUE) - 252_000)} />);
    });
    expect(texts(renderer)).toEqual(
      expect.arrayContaining(["4:12 left", "HomeEase accepted. Pay by 4:34 pm or the request ends.", "Pay HomeEase ₹1,240"])
    );
    expect(interval).not.toHaveBeenCalled();
  });

  it("ticks every second without one", () => {
    const interval = jest.spyOn(global, "setInterval");
    act(() => {
      renderer = TestRenderer.create(<RentStrip />);
    });
    expect(interval).toHaveBeenCalledWith(expect.any(Function), 1000);
  });
});
