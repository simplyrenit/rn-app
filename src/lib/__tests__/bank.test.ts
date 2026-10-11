import { describe, expect, it } from "@jest/globals";
import {
  accountTitle,
  answerSettlesKey,
  attemptLimitMessage,
  bankFieldErrors,
  canCheckAgain,
  cleanAccountNumber,
  cleanIfsc,
  PAYMENTS_REFUSED,
  failureMessage,
  istDayLabel,
  landed,
  submitKeyFor,
  validateBankForm,
  verifiedChip,
  waitText,
} from "../bank";

const good = {
  holderName: "SoundBox Rentals",
  accountNumber: "50100123456789",
  confirmNumber: "50100123456789",
  ifsc: "HDFC0001234",
};

describe("validateBankForm", () => {
  it("passes a complete form", () => {
    expect(validateBankForm(good)).toEqual({});
  });

  it("asks for every field when empty", () => {
    expect(Object.keys(validateBankForm({ holderName: "", accountNumber: "", confirmNumber: "", ifsc: "" })).sort()).toEqual([
      "accountNumber",
      "holderName",
      "ifsc",
    ]);
  });

  it("holds the account number to 9 to 18 digits", () => {
    expect(validateBankForm({ ...good, accountNumber: "12345678", confirmNumber: "12345678" }).accountNumber).toBeDefined();
    expect(validateBankForm({ ...good, accountNumber: "123456789", confirmNumber: "123456789" }).accountNumber).toBeUndefined();
    const eighteen = "1".repeat(18);
    expect(validateBankForm({ ...good, accountNumber: eighteen, confirmNumber: eighteen }).accountNumber).toBeUndefined();
    const nineteen = "1".repeat(19);
    expect(validateBankForm({ ...good, accountNumber: nineteen, confirmNumber: nineteen }).accountNumber).toBeDefined();
  });

  it("says when the two account numbers differ", () => {
    expect(validateBankForm({ ...good, confirmNumber: "50100123456780" }).confirmNumber).toBe(
      "The two account numbers don't match"
    );
  });

  it("holds the IFSC to four letters, a zero, then six letters or digits", () => {
    expect(validateBankForm({ ...good, ifsc: "HDFC1001234" }).ifsc).toBeDefined(); // fifth char not 0
    expect(validateBankForm({ ...good, ifsc: "HDF00001234" }).ifsc).toBeDefined(); // only three letters
    expect(validateBankForm({ ...good, ifsc: "HDFC000123" }).ifsc).toBeDefined(); // ten characters
    expect(validateBankForm({ ...good, ifsc: "SBIN0ABC123" }).ifsc).toBeUndefined();
  });

  it("holds the name to 2 to 100 characters after trimming", () => {
    expect(validateBankForm({ ...good, holderName: " A " }).holderName).toBeDefined();
    expect(validateBankForm({ ...good, holderName: "Ab" }).holderName).toBeUndefined();
    expect(validateBankForm({ ...good, holderName: "x".repeat(101) }).holderName).toBeDefined();
  });
});

describe("bankFieldErrors", () => {
  it("maps the server's field names onto the form's", () => {
    expect(
      bankFieldErrors({ holder_name: "Too short", account_number: "Wrong length", ifsc: "Bad code", submit_id: "ignored" })
    ).toEqual({ holderName: "Too short", accountNumber: "Wrong length", ifsc: "Bad code" });
  });
});

describe("cleaning", () => {
  it("keeps digits only, at most 18", () => {
    expect(cleanAccountNumber("5010 0123-4567 89")).toBe("50100123456789");
    expect(cleanAccountNumber("1".repeat(25))).toHaveLength(18);
  });

  it("writes an IFSC upper case, letters and digits, at most 11", () => {
    expect(cleanIfsc("hdfc 0001234 extra")).toBe("HDFC0001234");
  });
});

describe("words", () => {
  it("names the day in India, not UTC", () => {
    expect(istDayLabel("2026-10-03T07:00:21Z")).toBe("3 Oct");
    // 19:00 UTC on the 3rd is 00:30 on the 4th in India.
    expect(istDayLabel("2026-10-03T19:00:00Z")).toBe("4 Oct");
    expect(istDayLabel("not a date")).toBeNull();
    expect(istDayLabel(null)).toBeNull();
  });

  it("writes the verified chip and the card title as the frame does", () => {
    expect(verifiedChip({ verified_at: "2026-10-03T07:00:21Z" })).toBe("Verified 3 Oct");
    expect(verifiedChip({ verified_at: null })).toBe("Verified");
    expect(accountTitle({ bank_name: "HDFC Bank", account_last4: "4471" })).toBe("HDFC Bank ··· 4471");
    expect(accountTitle({ bank_name: null, account_last4: "4471" })).toBe("Bank account ··· 4471");
  });

  it("explains each failure code", () => {
    const codes = ["invalid_account", "invalid_ifsc", "name_mismatch", "account_blocked", "provider_error"];
    const messages = codes.map((failure_code) => failureMessage({ failure_code, name_at_bank: null, holder_name: null }));
    expect(new Set(messages).size).toBe(codes.length);
  });

  it("shows both names on a name mismatch", () => {
    expect(
      failureMessage({ failure_code: "name_mismatch", name_at_bank: "SOUNDBOX RENTALS", holder_name: "Sound Box" })
    ).toContain("SOUNDBOX RENTALS");
  });

  it("has a line for a code it does not know", () => {
    expect(failureMessage({ failure_code: "something_new", name_at_bank: null, holder_name: null })).toContain("did not pass");
    expect(failureMessage({ failure_code: null, name_at_bank: null, holder_name: null })).toContain("did not pass");
  });

  it("says how long to wait", () => {
    expect(waitText(3600)).toBe("1 hour");
    expect(waitText(7200)).toBe("2 hours");
    expect(waitText(300)).toBe("5 minutes");
    expect(waitText(90)).toBe("2 minutes");
    expect(waitText(30)).toBe("a minute");
    expect(attemptLimitMessage(3600)).toBe("Too many tries. Try again in 1 hour.");
    expect(attemptLimitMessage(undefined)).toBe("Too many tries. Try again later.");
  });
});

describe("canCheckAgain", () => {
  it("follows the server's can_verify_again and nothing else", () => {
    expect(canCheckAgain({ can_verify_again: true })).toBe(true);
    expect(canCheckAgain({ can_verify_again: false })).toBe(false);
  });

  it("is false for an answer that does not carry the flag", () => {
    expect(canCheckAgain({} as { can_verify_again: boolean })).toBe(false);
  });
});

describe("submitKeyFor", () => {
  const details = { holderName: "SoundBox Rentals", accountNumber: "50100123456789", ifsc: "HDFC0001234" };
  let n = 0;
  const makeId = () => `id-${++n}`;

  it("makes one key for one set of details and keeps it for the next press", () => {
    n = 0;
    const first = submitKeyFor(null, details, makeId);
    const again = submitKeyFor(first, { ...details }, makeId);
    expect(again).toBe(first);
    expect(n).toBe(1);
  });

  it("ignores spaces around the name", () => {
    n = 0;
    const first = submitKeyFor(null, details, makeId);
    expect(submitKeyFor(first, { ...details, holderName: "  SoundBox Rentals " }, makeId)).toBe(first);
  });

  it("makes a new key when any of the details changes", () => {
    n = 0;
    const first = submitKeyFor(null, details, makeId);
    expect(submitKeyFor(first, { ...details, accountNumber: "50100123456780" }, makeId).id).toBe("id-2");
    expect(submitKeyFor(first, { ...details, ifsc: "HDFC0001235" }, makeId).id).not.toBe(first.id);
    expect(submitKeyFor(first, { ...details, holderName: "Sound Box" }, makeId).id).not.toBe(first.id);
  });
});

describe("answerSettlesKey", () => {
  it("is settled by any answer that says what happened", () => {
    for (const status of [200, 201, 400, 403, 409, 429]) {
      expect(answerSettlesKey({ status, code: null })).toBe(true);
    }
    expect(answerSettlesKey({ status: 503, code: "payments_unavailable" })).toBe(true);
  });

  it("is not settled by no answer, or by a server fault the call may have got past", () => {
    expect(answerSettlesKey(null)).toBe(false);
    expect(answerSettlesKey({ status: 0, code: null })).toBe(false);
    expect(answerSettlesKey({ status: 500, code: null })).toBe(false);
    expect(answerSettlesKey({ status: 502, code: null })).toBe(false);
    expect(answerSettlesKey({ status: 504, code: null })).toBe(false);
  });
});

describe("landed", () => {
  const form = { holderName: "SoundBox Rentals", accountNumber: "50100123456789", ifsc: "HDFC0001234" };
  const held = { status: "pending" as const, account_last4: "6789", ifsc: "HDFC0001234", holder_name: "SoundBox Rentals" };

  it("is true when the server holds an account ending the same with the same IFSC and name", () => {
    expect(landed(held, form)).toBe(true);
    expect(landed({ ...held, status: "verified", ifsc: "hdfc0001234" }, form)).toBe(true);
  });

  it("reads the name as the bank does: no case, no doubled or edge spaces", () => {
    expect(landed({ ...held, holder_name: " soundbox  RENTALS " }, form)).toBe(true);
  });

  it("is false when only the name changed (a check that failed with name_mismatch is still there)", () => {
    expect(landed({ ...held, status: "failed", holder_name: "Sound Box" }, { ...form, holderName: "SOUNDBOX RENTALS" })).toBe(false);
  });

  it("is false when the answer has no name to compare", () => {
    expect(landed({ ...held, holder_name: null }, form)).toBe(false);
  });

  it("is false for another account, or none", () => {
    expect(landed({ ...held, account_last4: "4471" }, form)).toBe(false);
    expect(landed({ ...held, ifsc: "SBIN0000001" }, form)).toBe(false);
    expect(landed({ status: "none", account_last4: null, ifsc: null, holder_name: null }, form)).toBe(false);
    expect(landed(null, form)).toBe(false);
  });
});

describe("a refusal from payments with no word of its own (409 payments_error)", () => {
  it("says plainly that nothing was changed, not the server's \"Payments refused this.\"", () => {
    expect(PAYMENTS_REFUSED).toBe("Payments did not accept this just now. Nothing was changed. Try again in a moment.");
  });
});
