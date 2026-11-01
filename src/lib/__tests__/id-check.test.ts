import { describe, expect, it, jest } from "@jest/globals";

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
      const navigation = { navigate: jest.fn() };
      startIdCheck(navigation as never, status);
      // Always on top of the price screen, which it goes back to.
      expect(navigation.navigate).toHaveBeenCalledWith(screen, { source: "booking" });
    }
  });
});
