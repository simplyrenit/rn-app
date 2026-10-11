import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import { needsCurrentNumberCode, phoneChangeBody, phoneChangeOutcome } from "../phone-change";

const err = (over: Partial<ApiError> = {}): ApiError => ({ status: 400, code: null, message: null, details: null, ...over });

describe("when the current number's code comes first", () => {
  it("is asked for whenever the account already has a number, in any way it was kept", () => {
    expect(needsCurrentNumberCode("+91-9876543210")).toBe(true);
    expect(needsCurrentNumberCode("+919876543210")).toBe(true);
    expect(needsCurrentNumberCode("9876543210")).toBe(true);
  });

  it("is not asked for when there is no number (a first number is the save alone)", () => {
    expect(needsCurrentNumberCode("")).toBe(false);
    expect(needsCurrentNumberCode(null)).toBe(false);
    expect(needsCurrentNumberCode(undefined)).toBe(false);
    expect(needsCurrentNumberCode("12345")).toBe(false);
  });
});

describe("the request", () => {
  it("is the new number and the ID token of the new number, as the backend note gives it", () => {
    expect(phoneChangeBody("+919999900000", "eyJ.token")).toEqual({ phone: "+919999900000", phone_id_token: "eyJ.token" });
  });
});

describe("what a refused change says and what to do next", () => {
  it("says the number is taken and asks for another", () => {
    expect(phoneChangeOutcome(err({ status: 409, code: "phone_taken" }))).toEqual({
      text: "Another Renit account already uses that number. Use a different number.",
      next: "new_number",
    });
  });

  it("asks for the current number's code again when the unlock ran out", () => {
    expect(phoneChangeOutcome(err({ status: 403, code: "fresh_code_required" }))).toEqual({ text: "Confirm your current number first.", next: "unlock" });
  });

  it("says a code has expired in the contract's words, and asks for a new one", () => {
    expect(phoneChangeOutcome(err({ code: "verification_expired", status: 400 }))).toEqual({ text: "That code has expired. Send a new one.", next: "new_code" });
    expect(phoneChangeOutcome(err({ code: "code_invalid" })).next).toBe("new_code");
    expect(phoneChangeOutcome(err({ status: 403, code: "phone_verification_required" })).next).toBe("new_code");
  });

  it("says when the code was for another number", () => {
    expect(phoneChangeOutcome(err({ status: 403, code: "wrong_phone" })).next).toBe("new_number");
  });

  it("repeats only the save when the proof is fine but the answer was not", () => {
    expect(phoneChangeOutcome(err({ status: 503, code: "verification_unavailable" })).next).toBe("same");
    expect(phoneChangeOutcome(err({ status: 0 })).next).toBe("same");
    expect(phoneChangeOutcome(null).next).toBe("same");
    expect(phoneChangeOutcome(err({ status: 500, message: "Something broke" }))).toEqual({ text: "Something broke", next: "same" });
  });

  it("stops where the phone can do nothing", () => {
    expect(phoneChangeOutcome(err({ status: 403, code: "phone_change_in_app" })).next).toBe("stop");
  });
});
