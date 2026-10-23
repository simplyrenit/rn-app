import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { QueryClient, QueryClientProvider } from "react-query";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));
jest.mock("@/lib/my-details", () => ({ cancelMyDetailsRequest: jest.fn(), fetchMyDetailsRequest: jest.fn() }));
jest.mock("@/lib/auth-fns", () => ({
  getAuthTokens: jest.fn(async () => null),
  getHasSeenWelcome: jest.fn(async () => true),
  removeAuthTokens: jest.fn(async () => undefined),
  setAuthTokens: jest.fn(async () => undefined),
  setHasSeenWelcome: jest.fn(async () => undefined),
}));
jest.mock("@/lib/config", () => ({ GET_CATEGORIES: "categories/", MY_DETAILS_ENDPOINT: "me/" }));
jest.mock("@/lib/session-end", () => ({ sessionEndText: () => ({ title: "", message: "" }) }));
jest.mock("@/lib/sign-out", () => ({ endSessionOnServer: jest.fn(async () => undefined) }));
jest.mock("@/lib/firebase", () => ({
  authenticateFirebase: jest.fn(async () => undefined),
  signOutFirebase: jest.fn(async () => undefined),
}));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { defaults: { headers: {} }, get: jest.fn(async () => ({ data: [] })) },
  resetSessionExpiryNotice: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));

// eslint-disable-next-line import/first
import { GlobalProvider, useGlobalContext } from "../global-context";

let ctx: ReturnType<typeof useGlobalContext>;
function Probe() {
  ctx = useGlobalContext();
  return null;
}

describe("logout", () => {
  it("leaves nothing of the account in the query cache for the next one", async () => {
    // No garbage-collection timers, which would keep Jest running if this ever fails.
    const queryClient = new QueryClient({ defaultOptions: { queries: { cacheTime: Infinity } } });
    await act(async () => {
      TestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <GlobalProvider>
            <Probe />
          </GlobalProvider>
        </QueryClientProvider>
      );
    });
    // The two keys that name no account, and one that does.
    queryClient.setQueryData(["favorites"], [{ name: "PRO_asha_1" }]);
    queryClient.setQueryData(["booking", "RN-24831"], { number: "RN-24831" });
    queryClient.setQueryData(["bookings", "asha", true], []);

    await act(async () => {
      await ctx.logout();
    });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getQueryData(["favorites"])).toBeUndefined();
    expect(queryClient.getQueryData(["booking", "RN-24831"])).toBeUndefined();
  });
});
