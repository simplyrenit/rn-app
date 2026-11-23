import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";
import { hereEnding } from "@/lib/shop-ring";
import ShopRingScreen from "../ring";

let mockParams: any = { number: "RN-24852" };
let mockLive: any = undefined;
const mockAcceptRing = jest.fn(async (..._args: unknown[]) => ({ answered: { at: "2026-11-22T10:40:00+05:30" }, money: {} }));

jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ theme: "light" }) }));
jest.mock("@/backend/shop-ring", () => ({
  ringEndedQueryKey: (number: string) => ["shop-ring-ended", number],
  useLive: () => ({ data: mockLive, isError: false, refetch: jest.fn(async () => undefined) }),
  useShopBooking: () => ({ data: undefined, isError: false, error: null, dataUpdatedAt: 0, refetch: jest.fn() }),
  acceptRing: (...args: unknown[]) => mockAcceptRing(...args),
  settleRing: jest.fn(),
  refuseBooking: jest.fn(),
}));
jest.mock("@react-navigation/native", () => ({
  StackActions: { replace: jest.fn() },
  useIsFocused: () => true,
  useRoute: () => ({ params: mockParams }),
}));
jest.mock("@/lib/types", () => ({
  useTypedNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn(), goBack: jest.fn(), canGoBack: () => true }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("@/lib/haptics", () => ({ errorFeedback: jest.fn(), successFeedback: jest.fn(), tapFeedback: jest.fn() }));
jest.mock("react-native-heroicons/outline", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-heroicons/mini", () => new Proxy({}, { get: () => () => null }));
jest.mock("react-native-heroicons/solid", () => new Proxy({}, { get: () => () => null }));
jest.mock("@/components/shop/refuse-sheet", () => ({ RefuseSheet: require("react").forwardRef(() => null) }));
jest.mock("@/components/shop/untick-sheet", () => ({ UntickSheet: require("react").forwardRef(() => null) }));
jest.mock("@/components/booking/parts", () => {
  const { Text: T, View: V } = require("react-native");
  return {
    Panel: ({ children }: any) => <V>{children}</V>,
    MoneyLine: ({ label, amount }: any) => <T>{`${label} ${amount}`}</T>,
    Notice: ({ title }: any) => <T>{title}</T>,
  };
});
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T, View: V } = require("react-native");
  const Btn = ({ label, onPress }: any) => (
    <P accessibilityRole="button" onPress={onPress}>
      <T>{label}</T>
    </P>
  );
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    Skeleton: () => null,
    StatusPill: ({ label }: any) => <T>{label}</T>,
    EmptyState: ({ title }: any) => <T>{title}</T>,
    Button: ({ children, onPress }: any) => <Btn label={children} onPress={onPress} />,
    BottomBar: ({ children, primary, secondary }: any) => (
      <V>
        {children}
        {secondary ? <Btn {...secondary} /> : null}
        {primary ? <Btn {...primary} /> : null}
      </V>
    ),
  };
});

const ring = (number: string) => ({
  number,
  product: { name: "PRO_1", title: "Sony A7 IV mirrorless camera", cover_image: null },
  first_day: "2026-11-24",
  last_day: "2026-11-26",
  days: 3,
  delivery_mode: "pickup",
  customer: { first_name: "Aarav", last_initial: "M", id_checked: true, rentals_completed: 3, area: "Andheri East", distance_km: "3.2" },
  units: { in_use: 2, quantity: 3 },
  you_earn: "3420.00",
  fee_shown: "270.00",
  fee_charged: "180.00",
  ring_state: "ringing",
  ring_at: "2026-11-22T10:30:00+05:30",
  ring_ends_at: "2026-11-22T10:40:00+05:30",
});
const live = (...rings: ReturnType<typeof ring>[]) => ({
  server_time: "2026-11-22T10:31:00+05:30",
  poll_after_ms: 3000,
  open: { is_open: true, reason: "hours", opens_at: null, closes_at: null },
  ringing: rings,
  waiting_to_ring: [],
  recent: [],
  needs_you_count: 0,
});

let client: QueryClient;
let screen: any;

function render() {
  act(() => {
    screen = TestRenderer.create(
      <QueryClientProvider client={client}>
        <ShopRingScreen />
      </QueryClientProvider>
    );
  });
}

const texts = () =>
  screen.root
    .findAll((node: any) => typeof node.props.children === "string")
    .map((node: any) => node.props.children as string);
const buttons = () => screen.root.findAll((node: any) => node.props.accessibilityRole === "button" && node.props.onPress);
const button = (label: string) =>
  buttons().find((b: any) => b.findAll((n: any) => n.props.children === label).length > 0);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { cacheTime: Infinity, retry: false } } });
  mockParams = { number: "RN-24852" };
  mockAcceptRing.mockClear();
});
afterEach(() => {
  act(() => screen?.unmount());
  client.clear();
});

describe("the ring screen", () => {
  it("opens on the accepted ending written by the shared accept, never on a stale ringing view", () => {
    mockLive = live(ring("RN-24852"));
    client.setQueryData(["shop-ring-ended", "RN-24852"], hereEnding("accepted", "2026-11-22T10:40:00+05:30"));
    render();
    expect(texts()).toContain("You accepted this booking");
    expect(button("Accept")).toBeUndefined();
    expect(texts()).not.toContain("New booking");
  });

  it("ended with another request waiting: Next request, See booking and Done", () => {
    mockLive = live(ring("RN-24853"));
    client.setQueryData(["shop-ring-ended", "RN-24852"], hereEnding("accepted", "2026-11-22T10:40:00+05:30"));
    render();
    expect(button("Next request (1 waiting)")).toBeDefined();
    expect(button("See booking")).toBeDefined();
    expect(button("Done")).toBeDefined();
  });

  it("ended with none waiting: See booking and Done only", () => {
    mockLive = live(ring("RN-24852"));
    client.setQueryData(["shop-ring-ended", "RN-24852"], hereEnding("accepted", "2026-11-22T10:40:00+05:30"));
    render();
    const labels = new Set(buttons().map((b: any) => b.findAll((n: any) => typeof n.props.children === "string")[0].props.children));
    expect([...labels].sort()).toEqual(["Done", "See booking"]);
  });

  it("Accept on a single item goes through the shared accept with the ring, once", async () => {
    mockLive = live(ring("RN-24852"));
    render();
    expect(texts()).toContain("New booking");
    expect(button("Can't do it")).toBeDefined();
    await act(async () => {
      button("Accept").props.onPress();
      button("Accept").props.onPress();
    });
    expect(mockAcceptRing).toHaveBeenCalledTimes(1);
    expect(mockAcceptRing).toHaveBeenCalledWith(client, "RN-24852", expect.objectContaining({ number: "RN-24852" }), []);
    expect(texts()).toContain("You accepted this booking");
  });
});
