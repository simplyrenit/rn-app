import { describe, expect, it } from "@jest/globals";
import { sessionEndFrom, sessionEndText, shouldGoToWelcome } from "../session-end";

describe("why the session ended, from the refresh's refusal (T-26)", () => {
  it("is 'signed out' when the server says the device was signed out", () => {
    expect(sessionEndFrom({ detail: "This device has been signed out.", code: "token_not_valid" })).toBe("signed_out");
    expect(sessionEndFrom({ detail: "THIS DEVICE HAS BEEN SIGNED OUT." })).toBe("signed_out");
  });

  it("is 'expired' for anything else: a token with no session, one that ran out, an answer with no reason", () => {
    expect(sessionEndFrom({ detail: "This token has no session.", code: "token_not_valid" })).toBe("expired");
    expect(sessionEndFrom({ detail: "Token is invalid or expired", code: "token_not_valid" })).toBe("expired");
    expect(sessionEndFrom({})).toBe("expired");
    expect(sessionEndFrom(null)).toBe("expired");
    expect(sessionEndFrom(undefined)).toBe("expired");
    expect(sessionEndFrom("<html>")).toBe("expired");
  });

  it("says each in one plain message", () => {
    expect(sessionEndText("signed_out")).toEqual({
      title: "You were signed out",
      message: "This phone was signed out from another device. Sign in again to carry on.",
    });
    expect(sessionEndText("expired")).toEqual({ title: "Your session expired", message: "Please sign in again." });
  });
});

describe("taking the person to Welcome after a sign-out they did not choose", () => {
  it("does it from any screen of the signed-in app, a ring and a booking in the middle of a flow included", () => {
    for (const route of ["ShopRing", "Booking", "BookingDeposit", "Capture", "ShopBooking", "MainTabs", "Claim", "BankAccount"]) {
      expect(shouldGoToWelcome(true, false, route)).toBe(true);
    }
    // No route known yet: still clear the stack.
    expect(shouldGoToWelcome(true, false, undefined)).toBe(true);
  });

  it("does nothing when nobody was signed in, or still is, or the app is only finding out", () => {
    expect(shouldGoToWelcome(false, false, "MainTabs")).toBe(false);
    expect(shouldGoToWelcome(undefined, false, "MainTabs")).toBe(false);
    expect(shouldGoToWelcome(true, true, "MainTabs")).toBe(false);
    expect(shouldGoToWelcome(true, undefined, "MainTabs")).toBe(false);
    expect(shouldGoToWelcome(false, true, "MainTabs")).toBe(false);
  });

  it("leaves a person already on a signed-out screen where they are", () => {
    expect(shouldGoToWelcome(true, false, "Welcome")).toBe(false);
    expect(shouldGoToWelcome(true, false, "Verify")).toBe(false);
  });
});
