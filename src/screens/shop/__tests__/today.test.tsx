import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";
import { ShopTodayView } from "../today";

// ENG-433 plan, J tests: the states no design fixture can reach (an error code, the phone's notification permission),
// the inline Accept's wiring, and the ring takeover with and without `design`.

let mockToday: any;
let mockPermission: any;
const mockNavigate = jest.fn();
const mockAcceptRing = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockSettleRing = jest.fn();
const mockRefetch = jest.fn(async () => undefined);
const mockToastError = jest.fn();
const mockAskOnce = jest.fn(async () => undefined);

jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ theme: "light", userDetails: { username: "mumbai_gear_hub" } }),
}));
jest.mock("@/backend/shop-today", () => ({
  useToday: () => mockToday,
  useOpenBlocks: () => ({ data: [] }),
  refreshShop: jest.fn(),
  blockReturned: jest.fn(),
  extendBlock: jest.fn(),
  removeBlock: jest.fn(),
}));
jest.mock("@/backend/shop", () => ({
  useShop: () => ({ data: mockShop, refetch: jest.fn() }),
  setOpenState: jest.fn(),
  shopQueryKey: (username?: string) => ["shop", username],
}));
jest.mock("@/backend/shop-ring", () => ({
  acceptRing: (...args: unknown[]) => mockAcceptRing(...args),
  settleRing: (...args: unknown[]) => mockSettleRing(...args),
  ringEndedQueryKey: (number: string) => ["shop-ring-ended", number],
}));
jest.mock("@/backend/ring-permission", () => ({ useRingPermission: () => mockPermission }));
jest.mock("@/components/booking/use-app-active", () => ({ useAppActive: () => true }));
jest.mock("@react-navigation/native", () => ({ useIsFocused: () => true }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("@/lib/toast", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args), success: jest.fn(), warning: jest.fn() },
}));
jest.mock("@gorhom/bottom-sheet", () => ({ BottomSheetModal: () => null }));
jest.mock("../quick-block", () => ({ QuickBlockSheet: require("react").forwardRef(() => null) }));
jest.mock("@/components/core/confirm-sheet", () => ({ ConfirmSheet: require("react").forwardRef(() => null) }));
jest.mock("@/components/shop/day-picker-modal", () => ({ DayPickerModal: () => null }));
jest.mock("@/components/core/switch", () => ({ AppSwitch: () => null }));
jest.mock("@/components/core/button", () => ({ useButtonLabelColor: () => "#635BE8" }));
jest.mock("react-native-heroicons/outline", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-heroicons/mini", () => new Proxy({}, { get: () => () => null }));
jest.mock("@/components/booking/parts", () => {
  const { Text: T } = require("react-native");
  return { Notice: ({ children }: any) => <T>{children}</T> };
});
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    Skeleton: () => null,
    StatusPill: ({ label }: any) => <T>{label}</T>,
    SectionHeader: ({ title }: any) => <T>{title}</T>,
    EmptyState: ({ title, body, actionLabel, onAction }: any) => (
      <V>
        <T>{title}</T>
        <T>{body}</T>
        {actionLabel ? (
          <P accessibilityRole="button" onPress={onAction}>
            <T>{actionLabel}</T>
          </P>
        ) : null}
      </V>
    ),
    Button: ({ children, onPress, accessibilityLabel }: any) => (
      <P accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
        {typeof children === "string" ? <T>{children}</T> : children}
      </P>
    ),
  };
});

const mockShop = {
  name: "Mumbai Gear Hub",
  open: { is_open: true, reason: "hours", opens_at: null, closes_at: "2026-11-22T20:00:00+05:30" },
  closed_until: null,
  can_take_bookings: true,
};

const ring = (number: string, lines?: unknown[]) => ({
  number,
  product: { name: "sony-a7-iv", title: "Sony A7 IV mirrorless camera", cover_image: null },
  first_day: "2026-11-24",
  last_day: "2026-11-26",
  days: 3,
  delivery_mode: "pickup",
  customer: { first_name: "Aarav", last_initial: "M", id_checked: true, rentals_completed: 3, area: "Andheri East", distance_km: "3.2" },
  units: { in_use: 2, quantity: 3 },
  you_earn: "3420",
  fee_shown: "270",
  fee_charged: "180",
  ring_state: "ringing",
  ring_at: "2026-11-22T09:41:00+05:30",
  ring_ends_at: "2026-11-22T09:51:00+05:30",
  ...(lines ? { lines } : {}),
});
const line = (id: number) => ({ id, n: id, ref: `L-${id}`, product: { name: null, title: `Item ${id}`, cover_image: null }, rent: "100", deposit: "0", state: "live" });

const feed = (ringing: unknown[] = []) => ({
  date: "2026-11-22",
  open: mockShop.open,
  ringing,
  waiting_to_ring: [],
  going_out: [],
  coming_back: [],
  needs_you: [],
});
// `dataUpdatedAt` is read against when Today came into view, so a feed "fetched" in the future counts as fresh.
const loaded = (data: unknown) => ({ data, isError: false, error: null, refetch: mockRefetch, dataUpdatedAt: Date.now() + 60_000 });
const permission = (state: string) => ({ state, ask: jest.fn(), askOnce: mockAskOnce, openSettings: jest.fn(), refresh: jest.fn() });
const apiFailure = (code: string, status = 409) => ({
  isAxiosError: true,
  response: { status, data: { error: { code, message: code, details: null } } },
});

let client: QueryClient;
let screen: any;

function render(design?: object) {
  act(() => {
    screen = TestRenderer.create(
      <QueryClientProvider client={client}>
        <ShopTodayView bottomPad={0} design={design} />
      </QueryClientProvider>
    );
  });
}

const texts = () =>
  screen.root.findAll((node: any) => typeof node.props.children === "string").map((node: any) => node.props.children as string);
const button = (label: string) =>
  screen.root
    .findAll((node: any) => node.props.accessibilityRole === "button" && node.props.onPress)
    .find((b: any) => b.props.accessibilityLabel === label || b.findAll((n: any) => n.props.children === label).length > 0);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { cacheTime: Infinity, retry: false } } });
  mockToday = loaded(feed());
  mockPermission = permission("unavailable");
  [mockNavigate, mockAcceptRing, mockSettleRing, mockRefetch, mockToastError, mockAskOnce].forEach((m) => m.mockClear());
});
afterEach(() => {
  act(() => screen?.unmount());
  client.clear();
});

describe("Today, not owner (2091:21309)", () => {
  it("says there is nothing here yet, with no button", () => {
    mockToday = { data: undefined, isError: true, error: apiFailure("not_owner", 403), refetch: mockRefetch, dataUpdatedAt: 0 };
    render({});
    expect(texts()).toContain("Nothing here yet");
    expect(texts()).toContain("Today and bookings show up here once you have listed something to rent out.");
    expect(button("Try again")).toBeUndefined();
  });
});

describe("Today, this phone's ring permission", () => {
  it.each([
    ["ask", "Turn on notifications to hear new requests", "Turn on notifications"],
    ["settings", "This phone will not ring", "Open settings"],
  ])("%s: the inline card and the caption say this phone won't ring", (state, title, link) => {
    mockPermission = permission(state);
    render();
    expect(texts()).toContain(title);
    expect(button(link)).toBeDefined();
    expect(texts()).toContain("Open until 8:00 pm · this phone won't ring");
  });

  it.each(["granted", "unavailable"])("%s: no card, no caption", (state) => {
    mockPermission = permission(state);
    render();
    expect(texts()).not.toContain("Turn on notifications to hear new requests");
    expect(texts()).not.toContain("This phone will not ring");
    expect(texts()).toContain("Open until 8:00 pm");
  });

  it("under a design fixture the seeded state wins and the system is never asked", () => {
    mockPermission = permission("ask");
    render({});
    expect(texts()).not.toContain("Turn on notifications to hear new requests");
    expect(texts()).toContain("Open until 8:00 pm");
    expect(mockAskOnce).not.toHaveBeenCalled();
  });

  it("without a fixture, the ask state asks once", () => {
    mockPermission = permission("ask");
    render();
    expect(mockAskOnce).toHaveBeenCalledTimes(1);
  });
});

describe("Today, the inline Accept (NEW, 2091:20977)", () => {
  it("accepts one item as the ring screen does, once, then opens the ring screen on how it ended", async () => {
    const sony = ring("RN-24852");
    mockToday = loaded(feed([sony]));
    let answer: (value: unknown) => void = () => undefined;
    mockAcceptRing.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    render({});
    const accept = button("Accept Sony A7 IV mirrorless camera");
    act(() => {
      accept.props.onPress();
      accept.props.onPress();
    });
    expect(mockAcceptRing).toHaveBeenCalledTimes(1);
    expect(mockAcceptRing).toHaveBeenCalledWith(client, "RN-24852", sony);
    await act(async () => answer({ answered: { at: "2026-11-22T09:43:00+05:30" } }));
    expect(mockSettleRing).toHaveBeenCalledWith(client, "RN-24852");
    expect(mockNavigate).toHaveBeenCalledWith("ShopRing", { number: "RN-24852" });
  });

  it("a basket has no Accept on its card", () => {
    mockToday = loaded(feed([ring("RN-24860", [line(1), line(2)])]));
    render({});
    expect(button("Accept Sony A7 IV mirrorless camera")).toBeUndefined();
  });

  it("a refusal that ends the request is written for the ring screen before it opens", async () => {
    mockToday = loaded(feed([ring("RN-24852")]));
    mockAcceptRing.mockRejectedValue(apiFailure("no_unit_free"));
    let ended: unknown = "unset";
    mockNavigate.mockImplementation(() => (ended = client.getQueryData(["shop-ring-ended", "RN-24852"])));
    render({});
    await act(async () => button("Accept Sony A7 IV mirrorless camera").props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith("ShopRing", { number: "RN-24852" });
    expect(ended).toEqual(expect.objectContaining({ system: true, reason: "no_unit" }));
    expect(mockSettleRing).toHaveBeenCalledWith(client, "RN-24852");
    mockNavigate.mockReset();
  });

  it("stage_not_allowed: no note, Today read again, nothing opened", async () => {
    mockToday = loaded(feed([ring("RN-24852")]));
    mockAcceptRing.mockRejectedValue(apiFailure("stage_not_allowed"));
    render({});
    mockRefetch.mockClear();
    await act(async () => button("Accept Sony A7 IV mirrorless camera").props.onPress());
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("update_required: the ring screen's words in a toast, nothing opened", async () => {
    mockToday = loaded(feed([ring("RN-24852")]));
    mockAcceptRing.mockRejectedValue(apiFailure("update_required"));
    render({});
    await act(async () => button("Accept Sony A7 IV mirrorless camera").props.onPress());
    expect(mockToastError).toHaveBeenCalledWith("Update the Renit app to accept courier bookings. This request is still ringing.");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe("Today, a new ring takes the screen", () => {
  // `ringToOpen` remembers each ring it opened (module state), so each case has its own number.
  it("without a fixture, as now", () => {
    const fresh = ring("RN-30001");
    mockToday = loaded(feed([fresh]));
    render();
    expect(mockNavigate).toHaveBeenCalledWith("ShopRing", { number: "RN-30001", ring: fresh });
  });

  it("never under a design fixture", () => {
    mockToday = loaded(feed([ring("RN-30002")]));
    render({});
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
