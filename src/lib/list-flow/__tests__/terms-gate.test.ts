import { describe, expect, it } from "@jest/globals";
import { TermsState, termsGate, termsHold, termsHoldLine } from "../terms-gate";

const base: TermsState = { accepted: undefined, read: false, failed: false, fetching: false, refused: false };

describe("termsGate", () => {
  it("shows the tick once the terms say they are not accepted", () => {
    expect(termsGate({ ...base, accepted: false, read: true })).toBe("tick");
  });

  it("shows nothing for an owner who has accepted", () => {
    expect(termsGate({ ...base, accepted: true, read: true })).toBe("none");
  });

  it("shows nothing while the first read is on its way, unless a submit was refused", () => {
    expect(termsGate({ ...base, fetching: true })).toBe("none");
    expect(termsGate({ ...base, fetching: true, refused: true })).toBe("checking");
  });

  it("says the read failed, with or without a refusal", () => {
    expect(termsGate({ ...base, failed: true })).toBe("failed");
    expect(termsGate({ ...base, failed: true, refused: true })).toBe("failed");
  });

  it("goes to the tick when the read after a refusal says not accepted", () => {
    expect(termsGate({ ...base, accepted: false, read: true, refused: true, fetching: false })).toBe("tick");
  });
});

describe("termsHold", () => {
  it("holds Continue for the tick until it is ticked", () => {
    expect(termsHold("tick", false, false)).toBe(true);
    expect(termsHold("tick", true, false)).toBe(false);
  });

  it("holds nothing back for a failed read before any refusal", () => {
    expect(termsHold("failed", false, false)).toBe(false);
    expect(termsHold("none", false, false)).toBe(false);
  });

  it("holds Continue after a refusal until the terms have been read", () => {
    expect(termsHold("failed", false, true)).toBe(true);
    expect(termsHold("checking", false, true)).toBe(true);
    expect(termsHold("none", false, true)).toBe(false);
  });
});

describe("the line that says what unlocks Continue (test run D-14)", () => {
  it("says to tick the owner terms while they are the thing holding the buttons", () => {
    expect(termsHoldLine("tick", false)).toBe("Tick the owner terms to continue.");
  });

  it("says nothing once they are ticked, when there is nothing to tick, or when the read has its own words", () => {
    expect(termsHoldLine("tick", true)).toBeNull();
    expect(termsHoldLine("none", false)).toBeNull();
    expect(termsHoldLine("failed", false)).toBeNull();
    expect(termsHoldLine("checking", false)).toBeNull();
  });

  it("is said exactly when the tick holds the buttons", () => {
    for (const ticked of [true, false]) {
      expect(Boolean(termsHoldLine("tick", ticked))).toBe(termsHold("tick", ticked, false));
    }
  });
});
