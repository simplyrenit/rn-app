import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { ArrowRightOnRectangleIcon } from "react-native-heroicons/outline";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// Profile, signed in (2095:25572 / 25822). Logout is never tapped on a device (it ends the device's real QA session),
// so its row is checked here: a kit List row in the danger tone whose press is the screen's logout handler.
let mockUser: any = { name: "Riya Sharma", email: "riya.sharma@gmail.com", account_type: "user", merchant_approval_status: null };

jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ theme: "light", userDetails: mockUser }),
}));
jest.mock("@/backend/profile", () => ({ useProfile: () => ({ requestMerchantReview: jest.fn(), loading: false }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
// Other files and other builders' sheets: not what this checks.
jest.mock("../profile-img", () => () => null);
jest.mock("../sheets/AppearanceSheet", () => () => null);
jest.mock("../sheets/PersonaldetailsSheet", () => () => null);
jest.mock("../sheets/currency-sheet", () => ({ CurrencySheet: () => null }));
jest.mock("@/components/kyc/kyc-card", () => ({ KycCard: (_: any) => null }));
jest.mock("../merchant-status-card", () => ({ MerchantStatusCard: (_: any) => null }));
// Kit components as prop-keeping stand-ins.
jest.mock("@/components/core/list-row", () => ({ ListRow: (_: any) => null }));
jest.mock("@/components/core", () => {
  const { Text: T } = require("react-native");
  return {
    ListRow: require("@/components/core/list-row").ListRow,
    Text: ({ children, ...props }: any) => <T {...props}>{children}</T>,
  };
});

// eslint-disable-next-line import/first
import ProfilePostAuth from "../profile-post-auth";

const { ListRow } = require("@/components/core/list-row");
const { MerchantStatusCard } = require("../merchant-status-card");

const render = () => {
  const handleLogout = jest.fn();
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<ProfilePostAuth isDarkMode={false} handleLogout={handleLogout} />);
  });
  const rows = renderer.root.findAllByType(ListRow).map((r: any) => r.props);
  return { renderer, rows, handleLogout };
};

describe("ProfilePostAuth (2095:25572)", () => {
  it("lists the frame's rows, Business billing included for a customer, and Logout last", () => {
    const { rows, renderer } = render();
    expect(rows.map((r: any) => r.label)).toEqual([
      "Today and bookings",
      "My products",
      "Rental settings",
      "Bank account",
      "Saved addresses",
      "Business billing",
      "Appearance",
      "FAQs",
      "Report a problem",
      "Feedback & review",
      "Contact us",
      "Who we are",
      "Request an item",
      "Terms & conditions",
      "Privacy policy",
      "Logout",
    ]);
    expect(renderer.root.findAllByType(MerchantStatusCard)).toHaveLength(0);
  });

  it("Logout is a danger List row with no chevron whose press is the logout handler", () => {
    const { rows, handleLogout } = render();
    const logout = rows[rows.length - 1];
    expect(logout).toMatchObject({ label: "Logout", tone: "danger", chevron: false, leadingIcon: ArrowRightOnRectangleIcon });
    expect(logout.onPress).toBe(handleLogout);
    expect(handleLogout).not.toHaveBeenCalled();
  });

  it("a shop gets the merchant status and no Business billing", () => {
    mockUser = { ...mockUser, name: "Lens House", account_type: "merchant", merchant_approval_status: "rejected" };
    const { rows, renderer } = render();
    expect(rows.map((r: any) => r.label)).not.toContain("Business billing");
    expect(renderer.root.findByType(MerchantStatusCard).props).toMatchObject({ status: "rejected", loading: false, error: null });
  });
});
