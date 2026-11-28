import { describe, expect, it, jest } from "@jest/globals";

import { StackActions } from "@react-navigation/native";

import { resumable, startIdCheck } from "@/lib/id-check";

jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) } }));

describe("startIdCheck (ENG-351)", () => {
  it("starts at the explanation with nothing on file, and opens where it stands otherwise", () => {
    const cases = [
      [undefined, "KycIntro"],
      ["none", "KycIntro"],
      ["rejected", "KycStatus"], // its whole reason, and "Contact support" for a duplicate
      ["action_required", "KycStatus"],
      ["pending", "KycStatus"],
      ["in_review", "KycStatus"],
      ["verified", "KycStatus"],
    ] as const;
    for (const [status, screen] of cases) {
      const navigation = { dispatch: jest.fn(), getState: () => ({ routes: [{ name: "ReviewAndBook" }] }) };
      startIdCheck(navigation as never, status);
      // Always pushed on top of the price screen, which it goes back to, even when an earlier
      // ID check screen is already in the stack.
      expect(navigation.dispatch).toHaveBeenCalledWith(StackActions.push(screen, { source: "booking" }));
    }
  });

  it("does nothing on a second tap, while an ID check screen is already on top", () => {
    const navigation = { dispatch: jest.fn(), getState: () => ({ routes: [{ name: "ReviewAndBook" }, { name: "KycStatus" }] }) };
    startIdCheck(navigation as never, "rejected");
    expect(navigation.dispatch).not.toHaveBeenCalled();
  });
});

describe("resumable (ENG-447)", () => {
  const params = { item: { name: "PRO_1" }, first_day: "2026-12-05", last_day: "2026-12-06", delivery_mode: "pickup" };
  const at = Date.parse("2026-11-28T10:00:00Z");
  it("gives back the same account's price screen for a day, and nothing else", () => {
    expect(resumable({ user: "asha", at, params }, "asha", at + 23 * 3600e3)).toEqual(params);
    expect(resumable({ user: "asha", at, params }, "asha", at + 25 * 3600e3)).toBeNull(); // a day later
    expect(resumable({ user: "asha", at, params }, "ravi", at)).toBeNull(); // another account on this phone
    expect(resumable({ user: "asha", at, params }, undefined, at)).toBeNull(); // signed out
    expect(resumable({ user: "asha", at, params: {} }, "asha", at)).toBeNull();
    expect(resumable("junk", "asha", at)).toBeNull();
  });
});
