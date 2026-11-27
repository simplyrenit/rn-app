import { describe, expect, it, jest } from "@jest/globals";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// 2097:30474 (bank-account · not an owner). A design fixture serves only 200 or 404, so the 403 `not_owner` is checked
// here: a real AxiosError, because apiError() reads the code only from an axios failure's response body.

const mockNotOwner = new AxiosError("Forbidden", "ERR_BAD_REQUEST", undefined, undefined, {
  status: 403,
  statusText: "Forbidden",
  headers: {},
  config: { headers: new AxiosHeaders() },
  data: { error: { code: "not_owner", message: "Not an owner" } },
});

jest.mock("@/backend/bank", () => ({
  bankQueryKey: (username: string) => ["bank-account", username],
  fetchBankAccount: jest.fn(),
  saveBankAccount: jest.fn(),
  verifyBankAccount: jest.fn(),
  useBankAccount: () => ({ data: undefined, error: mockNotOwner, isLoading: false, isIdle: false, refetch: jest.fn() }),
}));
jest.mock("@/backend/ring-permission", () => ({ useRingPermission: () => ({ state: "unavailable" }) }));
jest.mock("@/backend/shop", () => ({ useShop: () => ({ data: undefined }) }));
jest.mock("@/backend/unlock", () => ({ fetchUnlock: jest.fn() }));
jest.mock("@/components/bank/unlock-sheet", () => ({ UnlockSheet: require("react").forwardRef(() => null) }));
jest.mock("@/components/shop/ring-permission-card", () => ({ RingPermissionCard: () => null }));
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ userDetails: { username: "mumbai_gear_hub" }, userDetailsFailed: false, fetchUserDetails: jest.fn(), theme: "light" }),
}));
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: undefined }) }));
const mockNavigate = jest.fn();
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("react-query", () => ({ useQueryClient: () => ({ setQueryData: jest.fn() }) }));
jest.mock("@/lib/toast", () => ({ toast: { info: jest.fn(), error: jest.fn(), success: jest.fn() } }));
jest.mock("react-native-keyboard-aware-scroll-view", () => ({ KeyboardAwareScrollView: ({ children }: any) => children }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/core", () => {
  const { Text: T, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    Skeleton: () => null,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    EmptyState: (props: any) => <V testID="empty-state" {...props} />,
    BottomBar: () => null,
    Button: () => null,
    StatusPill: () => null,
    TextField: () => null,
  };
});

// eslint-disable-next-line import/first
import BankAccountScreen from "../bank-account";
// eslint-disable-next-line import/first
import { lightColors } from "@/lib/design-tokens";
// eslint-disable-next-line import/first
import { BanknotesIcon } from "react-native-heroicons/outline";

describe("BankAccountScreen, not an owner (2097:30474)", () => {
  it("draws the EmptyState with the brand banknotes glyph and a Primary List an item", () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<BankAccountScreen />);
    });
    const empty = renderer.root.findByProps({ testID: "empty-state" }).props;
    expect(empty).toMatchObject({
      title: "A bank account is for owners",
      body: "List your first item and you can add the account Renit pays you into.",
      actionLabel: "List an item",
      actionTone: "primary",
    });
    expect(empty.variant).toBeUndefined();
    expect(empty.icon.type).toBe(BanknotesIcon);
    expect(empty.icon.props.color).toBe(lightColors.brandText);

    act(() => empty.onAction());
    expect(mockNavigate).toHaveBeenCalledWith("ListAddPhotos");
  });
});
