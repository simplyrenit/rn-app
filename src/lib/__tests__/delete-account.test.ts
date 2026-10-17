import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import { deleteProblem, itemLabel, openItems } from "../delete-account";

const err = (over: Partial<ApiError> = {}): ApiError => ({ status: 409, code: null, message: null, details: null, ...over });

const open = [
  { kind: "booking", booking: "RN-24831", role: "customer", text: "Sony PS5, Sat 7 to Mon 9 Nov: not finished" },
  { kind: "deposit", booking: "RN-24790", role: "owner", text: "RN-24790: the deposit is still held" },
  { kind: "payout", booking: null, role: "owner", text: "An amount is still to be recovered from your payouts" },
  { kind: "claim", booking: "RN-24800", role: "customer", text: "RN-24800: a report is open", claim: 12 },
];

describe("what is open, from the 409", () => {
  it("is read from the server's own list, sentence and all", () => {
    expect(openItems(open)).toEqual(open);
  });

  it("leaves out a row with no sentence, and anything that is not a list", () => {
    expect(openItems([{ kind: "booking", text: "" }, 3, null, { kind: "refund", booking: "RN-1", role: "customer", text: "RN-1: a refund is on its way" }])).toEqual([
      { kind: "refund", booking: "RN-1", role: "customer", text: "RN-1: a refund is on its way" },
    ]);
    expect(openItems(undefined)).toEqual([]);
    expect(openItems({})).toEqual([]);
  });

  it("labels what kind of thing it is and which side it is on", () => {
    expect(itemLabel({ kind: "deposit", role: "owner" })).toBe("Deposit · as the shop");
    expect(itemLabel({ kind: "claim", role: "customer" })).toBe("Report · as the customer");
    expect(itemLabel({ kind: "something_new", role: "customer" })).toBe("Open · as the customer");
  });
});

describe("why the account was not deleted", () => {
  it("lists what is open and keeps Delete from being offered again, on 409 open_bookings", () => {
    const problem = deleteProblem(
      err({ code: "open_bookings", message: "Your account can be closed once everything you have open with Renit is finished.", details: { open } })
    );
    expect(problem.blocked).toBe(true);
    expect(problem.text).toBe("Your account can be closed once everything you have open with Renit is finished.");
    expect(problem.items.map((i) => i.text)).toEqual(open.map((o) => o.text));
  });

  it("says so plainly when a 409 comes with no list", () => {
    expect(deleteProblem(err({ code: "open_bookings" }))).toMatchObject({ blocked: true, items: [], text: expect.stringContaining("everything you have open with Renit") });
  });

  it("keeps the person signed in and lets them try again after a failure that closed nothing", () => {
    expect(deleteProblem(err({ status: 0 }))).toEqual({
      text: "We couldn't reach Renit, so your account was not deleted. Check your connection and try again.",
      items: [],
      blocked: false,
    });
    expect(deleteProblem(null).blocked).toBe(false);
    expect(deleteProblem(err({ status: 500 }))).toMatchObject({ blocked: false, text: "We couldn't delete your account. You are still signed in. Try again." });
    expect(deleteProblem(err({ status: 403, message: "Not allowed." }))).toMatchObject({ blocked: false, text: "Not allowed." });
  });
});
