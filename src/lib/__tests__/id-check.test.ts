import { describe, expect, it, jest } from "@jest/globals";

import { StackActions } from "@react-navigation/native";

import { startIdCheck } from "@/lib/id-check";

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
