import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// @ts-ignore: no type package is installed for it (it comes with jest-expo).
import TestRenderer, { act } from "react-test-renderer";

const mockGetCoordinates = jest.fn(async () => ({ lat: 19.1, long: 72.8 }));
jest.mock("@/lib/location", () => ({ getDiscoveryCoordinates: () => mockGetCoordinates() }));

let mockSession: { user: { coordinates: { lat: number; long: number } } } | null = null;
jest.mock("@/dev/design-fixtures/session", () => ({ designSession: () => mockSession }));

// eslint-disable-next-line import/first
import { useViewerCoordinates } from "../distance";

const g = globalThis as unknown as { __DEV__: boolean };

async function viewer() {
  let seen: unknown = undefined;
  function Probe() {
    seen = useViewerCoordinates();
    return null;
  }
  await act(async () => {
    TestRenderer.create(React.createElement(Probe));
  });
  return seen;
}

afterEach(() => {
  mockSession = null;
  g.__DEV__ = true;
  mockGetCoordinates.mockClear();
});

describe("useViewerCoordinates design-session seam (ENG-429)", () => {
  it("returns the session user's coordinates and never asks for location", async () => {
    mockSession = { user: { coordinates: { lat: 19.165, long: 72.849 } } };
    expect(await viewer()).toEqual({ lat: 19.165, long: 72.849 });
    expect(mockGetCoordinates).not.toHaveBeenCalled();
  });

  it("asks for location as before with no session", async () => {
    expect(await viewer()).toEqual({ lat: 19.1, long: 72.8 });
    expect(mockGetCoordinates).toHaveBeenCalledTimes(1);
  });

  it("ignores a 0/0 session user", async () => {
    mockSession = { user: { coordinates: { lat: 0, long: 0 } } };
    expect(await viewer()).toEqual({ lat: 19.1, long: 72.8 });
    expect(mockGetCoordinates).toHaveBeenCalledTimes(1);
  });

  it("ignores the seed when __DEV__ is false", async () => {
    mockSession = { user: { coordinates: { lat: 19.165, long: 72.849 } } };
    g.__DEV__ = false;
    expect(await viewer()).toEqual({ lat: 19.1, long: 72.8 });
    expect(mockGetCoordinates).toHaveBeenCalledTimes(1);
  });
});
