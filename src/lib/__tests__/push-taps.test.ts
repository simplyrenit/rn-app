import { describe, expect, it } from "@jest/globals";
import { createTapLedger } from "../push-taps";

describe("createTapLedger", () => {
  it("a tap that was dealt with is not dealt with again when the listeners are set up again", () => {
    const taps = createTapLedger();
    expect(taps.handled("n1")).toBe(false);
    taps.mark("n1");
    expect(taps.handled("n1")).toBe(true);
    expect(taps.handled("n2")).toBe(false);
  });

  it("a tap made while signed out is dropped: after the next sign-in the system hands it out again and it is already dealt with", () => {
    const taps = createTapLedger();
    // Signed out: the ring in the tray is tapped, and the app drops it.
    taps.mark("ring-for-shop-A");
    // Signed in as someone else: the router asks for the last tap and finds it handled.
    expect(taps.handled("ring-for-shop-A")).toBe(true);
  });

  it("a newer tap is a new one", () => {
    const taps = createTapLedger();
    taps.mark("old");
    expect(taps.handled("new")).toBe(false);
    taps.mark("new");
    expect(taps.handled("old")).toBe(false);
  });
});
