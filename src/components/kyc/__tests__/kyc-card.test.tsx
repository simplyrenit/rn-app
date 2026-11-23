import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { TouchableOpacity } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// kyc-card · states (2095:26508): the board is checked here, one render per state, with the real copy (lib/kyc.ts).
let mockAccountType = "merchant";
let mockData: any = null;
const mockNavigate = jest.fn();

jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ userDetails: { username: "lens_house", account_type: mockAccountType } }),
}));
jest.mock("@/backend/kyc", () => ({
  useKycStatus: () => ({ data: mockData, errorUpdatedAt: 0 }),
  useKycBadgeSync: () => undefined,
}));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("../kyc-chip", () => ({ KycChip: (_: any) => null }));
// Kit components as prop-keeping stand-ins, so the test reads the props the card passes.
jest.mock("@/components/core", () => {
  const { Text: T } = require("react-native");
  return {
    Text: ({ children, ...props }: any) => <T {...props}>{children}</T>,
    Button: (_: any) => null,
    Skeleton: (_: any) => null,
  };
});

// eslint-disable-next-line import/first
import { KycCard } from "../kyc-card";

const core = require("@/components/core");
const { KycChip } = require("../kyc-chip");

const status = (over: any) => ({
  kyc_status: "none",
  case_ref: "kyc_01",
  business_verified: false,
  business_verified_at: null,
  reason_code: null,
  next_action: null,
  updated_at: null,
  ...over,
});

const render = () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<KycCard isDark={false} />);
  });
  const texts = renderer.root.findAllByType(core.Text).map((t: any) => String(t.props.children));
  const buttons = renderer.root.findAllByType(core.Button);
  const chip = renderer.root.findByType(KycChip).props;
  return { renderer, texts, buttons, chip };
};

// [board label, account, status, title, body, CTA or null, chip icon, chip tone]
const STATES: [string, string, any, string, string, string | null, string, string][] = [
  ["Merchant · none", "merchant", { case_ref: null }, "Get a Verified business badge", "Show renters your business is real. It takes a few minutes.", "Verify my business", "shield", "brand"],
  ["Pending", "merchant", { kyc_status: "pending" }, "Checking your details", "This usually takes a minute.", null, "clock", "info"],
  ["Action required", "merchant", { kyc_status: "action_required" }, "Finish verifying with DigiLocker", "One more step: confirm your Aadhaar with DigiLocker.", "Continue verification", "identification", "warning"],
  ["In review", "merchant", { kyc_status: "in_review" }, "Under review", "Our team is reviewing your details. We'll notify you.", null, "clock", "info"],
  ["Verified", "merchant", { kyc_status: "verified", business_verified: true }, "Verified business", "Your badge shows on your profile and listings.", null, "shield-solid", "brand"],
  ["Rejected", "merchant", { kyc_status: "rejected", reason_code: "gstin_name_mismatch" }, "We couldn't verify your business", "The name on your GSTIN didn't match the name on your PAN.", "Try again", "exclamation", "warning"],
  ["Timed out", "merchant", { reason_code: "case_expired" }, "Your verification timed out", "The DigiLocker step wasn't finished in time, so we closed it. Start again whenever you're ready.", "Start again", "exclamation", "warning"],
  ["Badge removed", "merchant", { reason_code: "gstin_inactive" }, "Your Verified badge was removed", "The GST records no longer show your GSTIN as active, so we've taken the badge off your shop.", "Verify again", "exclamation", "warning"],
  ["Person · none", "user", {}, "Check your ID", "Needed once, before you rent some higher-value items.", "Start ID check", "shield", "brand"],
  ["Person · verified", "user", { kyc_status: "verified", business_verified: true }, "ID check passed", "You can book items that need an ID check.", null, "shield-solid", "brand"],
  ["Person · rejected", "user", { kyc_status: "rejected", reason_code: "pan_invalid" }, "We couldn't verify your ID", "We couldn't verify the PAN you entered.", "Try again", "exclamation", "warning"],
];

describe("KycCard (2095:26508)", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it.each(STATES)("%s", (_label, account, over, title, body, cta, icon, tone) => {
    mockAccountType = account;
    mockData = status(over);
    const { texts, buttons, chip, renderer } = render();
    expect(texts).toEqual([title, body]);
    expect(chip).toMatchObject({ icon, tone });
    if (cta === null) {
      expect(buttons).toHaveLength(0);
    } else {
      expect(buttons).toHaveLength(1);
      // Secondary tonal 44, not the old compact primary.
      expect(buttons[0].props).toMatchObject({ variant: "outline", tone: "tonal", size: "compact", children: cta });
    }
    // The card: r12, 1pt line border, padding 16, gap 12.
    const card = renderer.root.findByType(TouchableOpacity).props;
    expect(Object.assign({}, ...[card.style].flat(2).filter(Boolean))).toMatchObject({
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#E6E6E6",
      padding: 16,
      gap: 12,
    });
  });

  it("is absent for a person with nothing on file", () => {
    mockAccountType = "user";
    mockData = status({ case_ref: null });
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<KycCard isDark={false} />);
    });
    expect(renderer.toJSON()).toBeNull();
  });
});
