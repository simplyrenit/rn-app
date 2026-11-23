import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// merchant-status-card · states (2095:26235): the board is checked here, one render per state.
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
// Kit components as prop-keeping stand-ins, so the test reads the props the card passes.
jest.mock("@/components/core", () => {
  const { Text: T } = require("react-native");
  return {
    Text: ({ children, ...props }: any) => <T {...props}>{children}</T>,
    StatusPill: (_: any) => null,
    Button: (_: any) => null,
  };
});

// eslint-disable-next-line import/first
import { MerchantStatusCard } from "../merchant-status-card";

const core = require("@/components/core");
const NOTE = "Listings will be enabled after merchant approval.";
const FAILED = "Unable to request review right now. Please try again.";

const render = (status: string, extra: { loading?: boolean; error?: string | null } = {}) => {
  const onRequestReview = jest.fn();
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(
      <MerchantStatusCard status={status} onRequestReview={onRequestReview} loading={!!extra.loading} error={extra.error ?? null} />
    );
  });
  const texts = renderer.root.findAllByType(core.Text).map((t: any) => String(t.props.children));
  const pill = renderer.root.findByType(core.StatusPill).props;
  const buttons = renderer.root.findAllByType(core.Button);
  return { renderer, texts, pill, buttons, onRequestReview };
};

describe("MerchantStatusCard (2095:26235)", () => {
  it("approved: the status line only, with a success pill", () => {
    const { texts, pill, buttons } = render("approved");
    expect(texts).toEqual(["Merchant status"]);
    expect(pill).toMatchObject({ label: "Approved", tone: "success" });
    expect(buttons).toHaveLength(0);
  });

  it("pending: the warning pill and the listings note", () => {
    const { texts, pill, buttons } = render("pending");
    expect(texts).toEqual(["Merchant status", NOTE]);
    expect(pill).toMatchObject({ label: "Pending approval", tone: "warning" });
    expect(buttons).toHaveLength(0);
  });

  it("not approved: the danger pill, the note and a full-width Secondary 'Request review again'", () => {
    const { texts, pill, buttons, onRequestReview } = render("rejected");
    expect(texts).toEqual(["Merchant status", NOTE]);
    expect(pill).toMatchObject({ label: "Not approved", tone: "danger" });
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props).toMatchObject({
      variant: "outline",
      size: "compact",
      disabled: false,
      style: { alignSelf: "stretch" },
      children: "Request review again",
    });
    expect(buttons[0].props.tone).toBeUndefined();
    buttons[0].props.onPress();
    expect(onRequestReview).toHaveBeenCalledTimes(1);
  });

  it("not approved, busy: 'Requesting review...' and disabled", () => {
    const { buttons } = render("rejected", { loading: true });
    expect(buttons[0].props).toMatchObject({ disabled: true, children: "Requesting review..." });
  });

  it("request failed: the error line under the button, 12/16 Medium dangerStrong", () => {
    const { texts, renderer } = render("rejected", { error: FAILED });
    expect(texts).toEqual(["Merchant status", NOTE, FAILED]);
    const line = renderer.root.findAllByType(core.Text)[2].props;
    expect(line).toMatchObject({ fontSize: "text-xs", fontWeight: "font-medium", style: { color: "#D92D20" } });
  });
});
