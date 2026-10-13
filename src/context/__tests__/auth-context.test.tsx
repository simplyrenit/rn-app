import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create, update and act.
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

let mockAuthenticated: boolean | undefined = false;
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ isAuthenticated: mockAuthenticated }),
}));

// eslint-disable-next-line import/first
import { AuthProvider, useAuthContext } from "../auth-context";

type Ctx = ReturnType<typeof useAuthContext>;
let ctx: Ctx;
function Probe() {
  ctx = useAuthContext();
  return null;
}

type AnyMock = jest.Mock<(...args: any[]) => Promise<any>>;
const storage = AsyncStorage as unknown as { setItem: AnyMock; removeItem: AnyMock; getItem: AnyMock };

async function mount() {
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
  });
  return renderer;
}

const rerender = async (renderer: any) => {
  await act(async () => {
    renderer.update(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthenticated = false;
});

describe("the sign-up details between screens (review app-6 r1 #1)", () => {
  it("are kept in memory, and nothing is ever written to storage: not the password, not the proof token", async () => {
    await mount();
    await act(async () => {
      ctx.saveUser({ email: "asha@example.com", email_verified: true, proof_token: "signed.token" });
      ctx.saveUser({ first_name: "Asha", password: "s3cret-pass" });
    });
    expect(ctx.user).toMatchObject({ email: "asha@example.com", proof_token: "signed.token", first_name: "Asha", password: "s3cret-pass" });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("remove the record an older build left in storage, which took its plain-text password off the disk too", async () => {
    await mount();
    expect(storage.removeItem).toHaveBeenCalledWith("user");
  });

  it("are not read back from storage: a sign-up cannot be picked up after the app was closed", async () => {
    storage.getItem.mockResolvedValue(JSON.stringify({ email: "old@example.com", password: "old-secret", proof_token: "old.token" }));
    await mount();
    expect(ctx.user).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it("go when the sign-up ends, by hand", async () => {
    await mount();
    await act(async () => ctx.saveUser({ password: "s3cret-pass", proof_token: "signed.token" }));
    expect(ctx.user?.proof_token).toBe("signed.token");
    await act(async () => ctx.clearUser());
    expect(ctx.user).toBeNull();
  });

  it("go when the person is signed in, which is how a finished sign-up ends, and when they sign out", async () => {
    const renderer = await mount();
    await act(async () => ctx.saveUser({ password: "s3cret-pass", proof_token: "signed.token" }));
    mockAuthenticated = true;
    await rerender(renderer);
    expect(ctx.user).toBeNull();
    await act(async () => ctx.saveUser({ password: "another" }));
    mockAuthenticated = false;
    await rerender(renderer);
    expect(ctx.user).toBeNull();
  });
});
