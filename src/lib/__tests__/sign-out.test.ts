import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock("axios", () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock("../config", () => ({
  ACCESS_DEVICES_ENDPOINT: "https://api.test/access/devices/",
  GET_REFRESH_TOKEN: "https://api.test/token/refresh/",
  DEV_MODE: "QA",
  SERVERURL: "https://api.test/",
}));
jest.mock("../auth-fns", () => ({ getAuthTokens: jest.fn() }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { getAuthTokens } from "../auth-fns";
import {
  PENDING_SIGN_OUT_KEY,
  SignOutDeps,
  endSessionOnServer,
  repeatSignOut,
  retryPendingSignOut,
  shouldDropPush,
  signOutIsSettled,
} from "../sign-out";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mock = jest.Mock<(...args: any[]) => any>;

const storage = AsyncStorage as unknown as Record<"getItem" | "setItem" | "removeItem", Mock>;
const http = axios as unknown as { post: Mock };
const tokens = getAuthTokens as unknown as Mock;

const pending = { access_token: "access-1", refresh_token: "refresh-1" };

function deps(partial: Partial<SignOutDeps>): SignOutDeps & { signOut: Mock; refresh: Mock } {
  return {
    signOut: jest.fn(async () => 204),
    refresh: jest.fn(async () => ({ status: 200, access: "access-2" })),
    ...partial,
  } as SignOutDeps & { signOut: Mock; refresh: Mock };
}

beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
});

describe("signOutIsSettled", () => {
  it("is true when the server ended it or has nothing to end", () => {
    for (const status of [200, 204, 400, 403, 404]) expect(signOutIsSettled(status)).toBe(true);
  });

  it("is false when the call has to be repeated", () => {
    for (const answer of ["network", 401, 408, 429, 500, 502, 503] as const) {
      expect(signOutIsSettled(answer)).toBe(false);
    }
  });
});

describe("repeatSignOut", () => {
  it("is done when the kept session signs out", async () => {
    const d = deps({});
    await expect(repeatSignOut(pending, d)).resolves.toBe("done");
    expect(d.signOut).toHaveBeenCalledWith("access-1", expect.any(Number));
    expect(d.refresh).not.toHaveBeenCalled();
  });

  it("waits for the network when the call does not reach the server", async () => {
    await expect(repeatSignOut(pending, deps({ signOut: jest.fn(async () => "network" as const) }))).resolves.toBe("later");
    await expect(repeatSignOut(pending, deps({ signOut: jest.fn(async () => 503) }))).resolves.toBe("later");
  });

  it("renews an access token that has run out, then signs out with the new one", async () => {
    const signOut = jest.fn(async (access: string) => (access === "access-1" ? 401 : 204));
    const d = deps({ signOut });
    await expect(repeatSignOut(pending, d)).resolves.toBe("done");
    expect(d.refresh).toHaveBeenCalledWith("refresh-1");
    expect(signOut).toHaveBeenLastCalledWith("access-2", expect.any(Number));
  });

  it("is done when the refresh is refused: the session is already over", async () => {
    const d = deps({ signOut: jest.fn(async () => 401), refresh: jest.fn(async () => ({ status: 401 })) });
    await expect(repeatSignOut(pending, d)).resolves.toBe("done");
  });

  it("waits when the refresh itself cannot reach the server", async () => {
    const d = deps({ signOut: jest.fn(async () => 401), refresh: jest.fn(async () => ({ status: "network" as const })) });
    await expect(repeatSignOut(pending, d)).resolves.toBe("later");
    const d2 = deps({ signOut: jest.fn(async () => 401), refresh: jest.fn(async () => ({ status: 502 })) });
    await expect(repeatSignOut(pending, d2)).resolves.toBe("later");
  });

  it("is done when even the new token is refused", async () => {
    const d = deps({ signOut: jest.fn(async () => 401) });
    await expect(repeatSignOut(pending, d)).resolves.toBe("done");
  });
});

describe("shouldDropPush", () => {
  it("drops a ring while no one is signed in", () => {
    expect(shouldDropPush({ type: "ring", booking: "RN-24831" }, false)).toBe(true);
  });

  it("keeps a ring for a signed-in phone, and drops nothing else", () => {
    expect(shouldDropPush({ type: "ring" }, true)).toBe(false);
    expect(shouldDropPush({ type: "accepted" }, false)).toBe(false);
    expect(shouldDropPush(undefined, false)).toBe(false);
    expect(shouldDropPush(null, false)).toBe(false);
  });
});

describe("endSessionOnServer", () => {
  it("does nothing when no one is signed in", async () => {
    tokens.mockResolvedValue(null);
    await endSessionOnServer();
    expect(http.post).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("forgets nothing aside when the server ended the session", async () => {
    tokens.mockResolvedValue(pending);
    http.post.mockResolvedValue({ status: 204 });
    await endSessionOnServer();
    const [url, , config] = http.post.mock.calls[0] as [string, unknown, { headers: { Authorization: string }; timeout: number }];
    expect(url).toBe("https://api.test/access/devices/current/sign-out/");
    expect(config.headers.Authorization).toBe("Bearer access-1");
    expect(config.timeout).toBeLessThanOrEqual(3000);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("keeps the session's tokens aside when the call cannot reach the server", async () => {
    tokens.mockResolvedValue(pending);
    http.post.mockRejectedValue(new Error("offline"));
    await expect(endSessionOnServer()).resolves.toBeUndefined();
    expect(storage.setItem).toHaveBeenCalledWith(PENDING_SIGN_OUT_KEY, JSON.stringify(pending));
  });

  it("never throws", async () => {
    tokens.mockRejectedValue(new Error("storage"));
    await expect(endSessionOnServer()).resolves.toBeUndefined();
  });
});

describe("retryPendingSignOut", () => {
  it("does nothing when nothing was kept", async () => {
    await retryPendingSignOut();
    expect(http.post).not.toHaveBeenCalled();
  });

  it("signs the kept session out and then forgets the tokens", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify(pending));
    http.post.mockResolvedValue({ status: 204 });
    await retryPendingSignOut();
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(storage.removeItem).toHaveBeenCalledWith(PENDING_SIGN_OUT_KEY);
  });

  it("keeps the tokens while the network is still away", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify(pending));
    http.post.mockRejectedValue(new Error("offline"));
    await retryPendingSignOut();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("ignores a stored value it cannot read", async () => {
    storage.getItem.mockResolvedValue("not json");
    await retryPendingSignOut();
    expect(http.post).not.toHaveBeenCalled();
  });
});
