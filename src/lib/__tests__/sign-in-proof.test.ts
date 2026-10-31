import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  retryAfterSeconds,
  tooManyTries,
  emailChangeBody,
  emailChangeOutcome,
  emailCodeText,
  emailProof,
  phoneProof,
  requestErrorFrom,
  sameEmail,
  signUpBody,
} from "../sign-in-proof";
import type { AuthUser } from "../types";

const err = (over: Partial<ApiError> = {}): ApiError => ({ status: 400, code: null, message: null, details: null, ...over });

describe("the proof of an address, from the emailed-code check", () => {
  it("is the token, for an account that is not finished", () => {
    expect(emailProof({ access: null, refresh: null, is_verified: true, proof_token: "signed.token" })).toEqual({ kind: "proof", token: "signed.token" });
  });

  it("says the address already has an account when the answer holds its tokens, and never keeps them", () => {
    expect(emailProof({ access: "a.b.c", refresh: "d.e.f", is_verified: true })).toEqual({ kind: "has_account" });
    expect(emailProof({ access: "a.b.c", refresh: null, is_verified: true, proof_token: "t" })).toEqual({ kind: "has_account" });
  });

  it("is nothing when no token came or the code was not confirmed", () => {
    expect(emailProof({ access: null, refresh: null, is_verified: true })).toEqual({ kind: "none" });
    expect(emailProof({ access: null, refresh: null, is_verified: false, proof_token: "t" })).toEqual({ kind: "none" });
    expect(emailProof(null)).toEqual({ kind: "none" });
  });
});

describe("the proof of a number, from the phone check", () => {
  it("is the token only for an account with no name yet", () => {
    expect(phoneProof({ onboarding_required: true, proof_token: "signed.token" })).toBe("signed.token");
    expect(phoneProof({ onboarding_required: true })).toBeNull();
    // A finished account signs in with tokens and has nothing to prove.
    expect(phoneProof({ proof_token: "signed.token" })).toBeNull();
    expect(phoneProof(undefined)).toBeNull();
  });
});

describe("which call carries which token: sign-up", () => {
  const user = (over: Partial<AuthUser> = {}): Partial<AuthUser> => ({
    email: "asha@example.com",
    first_name: "Asha",
    last_name: "Rao",
    password: "s3cret-pass",
    email_verified: true,
    proof_token: "signed.token",
    coordinates: { type: "Point", coordinates: [72.8, 19.1] },
    ...over,
  });

  it("sends the proof token with the account's fields", () => {
    expect(signUpBody(user())).toMatchObject({ email: "asha@example.com", first_name: "Asha", email_verified: true, proof_token: "signed.token", account_type: "user" });
  });

  it("sends it in the phone route too, beside the number", () => {
    expect(signUpBody(user({ email: "", phone: "+919876543210", phone_verified: true, email_verified: false }))).toMatchObject({
      phone: "+919876543210",
      proof_token: "signed.token",
    });
  });

  it("leaves the blanks out, a missing token included (the server then answers 403 `otp_verification_required`)", () => {
    const body = signUpBody(user({ email: "", proof_token: "", phone: undefined }));
    expect(body).not.toHaveProperty("proof_token");
    expect(body).not.toHaveProperty("email");
    expect(body).not.toHaveProperty("phone");
  });

  it("sends renting for a business only for a customer who ticked it (ENG-352)", () => {
    expect(signUpBody(user({ bills_to_business: true }))).toMatchObject({ bills_to_business: true });
    expect(signUpBody(user({ bills_to_business: false }))).not.toHaveProperty("bills_to_business");
    expect(signUpBody(user({ account_type: "merchant", business_name: "SoundBox", bills_to_business: true }))).not.toHaveProperty(
      "bills_to_business"
    );
  });

  it("sends the business name only for a merchant", () => {
    expect(signUpBody(user({ business_name: "SoundBox" }))).not.toHaveProperty("business_name");
    expect(signUpBody(user({ account_type: "merchant", business_name: "SoundBox" }))).toMatchObject({ business_name: "SoundBox", account_type: "merchant" });
  });
});

describe("which call carries which token: changing the email", () => {
  it("sends the new address and the token of the emailed-code check for that address", () => {
    expect(emailChangeBody("  new@example.com ", "signed.token")).toEqual({ email: "new@example.com", proof_token: "signed.token" });
  });

  it("knows an address by any spelling of it", () => {
    expect(sameEmail("Asha@Example.com ", "asha@example.com")).toBe(true);
    expect(sameEmail("asha@example.com", "other@example.com")).toBe(false);
    expect(sameEmail(null, "")).toBe(true);
  });
});

describe("what a refused email change says and what to do next", () => {
  it("says the address is taken and asks for another", () => {
    expect(emailChangeOutcome(err({ status: 409, code: "email_taken" }))).toEqual({
      text: "Another Renit account already uses that email address. Use a different one.",
      next: "new_email",
    });
  });

  it("asks for the number's code again when the unlock ran out", () => {
    expect(emailChangeOutcome(err({ status: 403, code: "fresh_code_required" }))).toEqual({ text: "Confirm your current number first.", next: "unlock" });
  });

  it("asks for a new emailed code when the proof is missing, for another address, or too old", () => {
    expect(emailChangeOutcome(err({ status: 403, code: "email_verification_required" }))).toEqual({
      text: "The new address has to be confirmed first. Send a code to it.",
      next: "new_code",
    });
  });

  it("stops where the phone can do nothing", () => {
    expect(emailChangeOutcome(err({ status: 403, code: "email_change_in_app" })).next).toBe("stop");
  });

  it("says too many tries with the wait the server gives, and never repeats by itself", () => {
    expect(emailChangeOutcome(err({ status: 429, details: { retry_after_s: 1800 } }))).toEqual({ text: "Too many tries. Try again in 30 minutes.", next: "stop" });
    expect(emailChangeOutcome(err({ status: 429 }))).toEqual({ text: "Too many tries. Try again later.", next: "stop" });
  });

  it("repeats only the save when the proof is fine but the answer was not", () => {
    expect(emailChangeOutcome(null).next).toBe("same");
    expect(emailChangeOutcome(err({ status: 0 })).next).toBe("same");
    expect(emailChangeOutcome(err({ status: 500, message: "Something broke" }))).toEqual({ text: "Something broke", next: "same" });
  });
});

describe("the emailed code can be refused for asking or trying too often", () => {
  it("says it with the wait, for a send and for a check (the limits are by the hour, not a few minutes)", () => {
    expect(tooManyTries(3000)).toBe("Too many tries. Try again in 50 minutes.");
    expect(tooManyTries(3600)).toBe("Too many tries. Try again in 1 hour.");
    expect(tooManyTries(null)).toBe("Too many tries. Try again later.");
    // The failure has been through `requestErrorFrom`, so its message already carries the wait.
    expect(emailCodeText({ status: 429, message: "Too many tries. Try again in 50 minutes." }, "send")).toBe("Too many tries. Try again in 50 minutes.");
    expect(emailCodeText({ status: 429, message: "Too many tries. Try again in 50 minutes." }, "check")).toBe("Too many tries. Try again in 50 minutes.");
    expect(emailCodeText({ status: 429 }, "check")).toBe("Too many tries. Try again later.");
  });

  it("reads the wait from Retry-After, else from the detail, else says nothing", () => {
    // axios's header object, a plain one, and a header that is not a number.
    expect(retryAfterSeconds({ get: (n: string) => (n === "retry-after" ? "3000" : undefined) }, {})).toBe(3000);
    expect(retryAfterSeconds({ "retry-after": "120" }, {})).toBe(120);
    expect(retryAfterSeconds({ "Retry-After": 90 }, null)).toBe(90);
    expect(retryAfterSeconds({}, { detail: "Request was throttled. Expected available in 2417 seconds." })).toBe(2417);
    expect(retryAfterSeconds({ "retry-after": "soon" }, { detail: "Request was throttled. Expected available in 60 seconds." })).toBe(60);
    expect(retryAfterSeconds({}, { detail: "Request was throttled." })).toBeNull();
    expect(retryAfterSeconds(undefined, undefined)).toBeNull();
  });

  it("keeps the server's words otherwise, and a wrong code offers a new one", () => {
    // The retired phone code (`phone_code_retired`) arrives with its own plain sentence, which is shown as it is.
    expect(emailCodeText({ status: 400, code: "phone_code_retired", message: "Phone numbers are verified in the app now. Update Renit and try again." }, "send")).toBe(
      "Phone numbers are verified in the app now. Update Renit and try again."
    );
    expect(emailCodeText({ status: 401 }, "check")).toBe("That code didn't work. Send a new one and try again.");
    expect(emailCodeText({ status: 503 }, "send")).toBe("We couldn't send the code. Try again in a moment.");
    expect(emailCodeText(null, "check")).toBe("We couldn't check that code. Try again.");
  });
});

describe("a failed sign-in call, as the screens read it", () => {
  const failure = (status: number, data: Record<string, unknown>) => ({ response: { status, data } });

  it("says too many tries with the wait for a 429, whatever else the body holds, and keeps the status so nothing retries it", () => {
    expect(requestErrorFrom(failure(429, { detail: "Request was throttled. Expected available in 3000 seconds." }), "fallback")).toEqual({
      status: 429,
      code: undefined,
      message: "Too many tries. Try again in 50 minutes.",
    });
    // The header wins over the sentence.
    expect(requestErrorFrom({ response: { status: 429, headers: { "retry-after": "7200" }, data: { detail: "…in 5 seconds." } } }, "x").message).toBe(
      "Too many tries. Try again in 2 hours."
    );
    expect(requestErrorFrom(failure(429, {}), "x").message).toBe("Too many tries. Try again later.");
  });

  it("keeps the endpoint's own sentence and code, including the retired phone code's", () => {
    expect(
      requestErrorFrom(failure(400, { error: "Phone numbers are verified in the app now. Update Renit and try again.", code: "phone_code_retired" }), "fallback")
    ).toEqual({ status: 400, code: "phone_code_retired", message: "Phone numbers are verified in the app now. Update Renit and try again." });
    expect(requestErrorFrom(failure(403, { error: "Please verify OTP before completing signup.", code: "otp_verification_required" }), "x")).toMatchObject({
      status: 403,
      code: "otp_verification_required",
    });
  });

  it("falls back when the body says nothing, and for a call that got no answer", () => {
    expect(requestErrorFrom(failure(500, {}), "Try again.")).toEqual({ status: 500, code: undefined, message: "Try again." });
    expect(requestErrorFrom({ message: "Network Error" }, "Try again.")).toEqual({ message: "Network Error" });
    expect(requestErrorFrom(null, "Try again.")).toEqual({ message: "Try again." });
  });
});
