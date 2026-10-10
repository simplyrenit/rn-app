import { describe, expect, it } from "@jest/globals";
import { lockedItems, needsOwnerTerms, publishLockedMessage } from "../publish-locked";

describe("lockedItems", () => {
  it("reads the missing list", () => {
    expect(lockedItems({ missing: ["owner_terms", "bank_account"] })).toEqual(["owner_terms", "bank_account"]);
  });

  it("is empty without one", () => {
    expect(lockedItems(null)).toEqual([]);
    expect(lockedItems({})).toEqual([]);
    expect(lockedItems({ missing: "owner_terms" })).toEqual([]);
    expect(lockedItems({ missing: ["id_check", 3] })).toEqual(["id_check"]);
  });
});

describe("needsOwnerTerms", () => {
  it("is true when the terms are among the things in the way", () => {
    expect(needsOwnerTerms(["id_check", "owner_terms"])).toBe(true);
    expect(needsOwnerTerms(["id_check"])).toBe(false);
  });
});

describe("publishLockedMessage", () => {
  it("names one thing", () => {
    expect(publishLockedMessage(["id_check"])).toBe("Still needed: your ID check.");
  });

  it("names several with a comma and an and", () => {
    expect(publishLockedMessage(["shop_approval", "id_check", "bank_account"])).toBe(
      "Still needed: Renit's approval of your shop, your ID check and a verified bank account."
    );
    expect(publishLockedMessage(["id_check", "bank_account"])).toBe(
      "Still needed: your ID check and a verified bank account."
    );
  });

  it("says something for a list it cannot read", () => {
    expect(publishLockedMessage([])).toBe("You can't publish yet.");
    expect(publishLockedMessage(["something_new"])).toBe("You can't publish yet.");
  });
});
