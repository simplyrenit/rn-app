import { describe, expect, it, jest } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  Claim,
  FAULT_RETURN_HOURS,
  againstMe,
  amountLines,
  claimBookingLine,
  claimRowSub,
  damageBlocked,
  damageErrorText,
  damageHold,
  damageMax,
  damageMaxLine,
  damageNotice,
  deadlineLabel,
  decideLine,
  effectRows,
  faultBlocked,
  faultErrorText,
  faultHold,
  faultNotice,
  faultReturnBy,
  chainEnd,
  faultReturnLine,
  faultReturnTarget,
  forfeitLine,
  isMyReport,
  newClaimIds,
  problemLine,
  problemState,
  faultRowSub,
  isVideoUrl,
  kindLabel,
  otherName,
  parseRupees,
  raisedByLine,
  readClaim,
  replyAlreadyIn,
  replyErrorText,
  replyHold,
  replyView,
  sideOf,
  reportUntilLine,
  rupeesBody,
  statusBanner,
  takesDecision,
  waitsForReturn,
} from "../claims";

// 13:30 in India on Fri 9 Oct 2026.
const NOW = new Date("2026-10-09T08:00:00Z");
const err = (over: Partial<ApiError> = {}): ApiError => ({ status: 409, code: null, message: null, details: null, ...over });

/** The contract's own example: a customer's "not as described", against the shop, still open. */
const claim = (over: Partial<Claim> = {}): Claim => ({
  id: 12,
  booking: {
    number: "RN-24790",
    product_title: "Epson projector",
    first_day: "2026-10-09",
    last_day: "2026-10-10",
    customer: { first_name: "Meera", last_initial: "J" },
    deposit: "3000.00",
  },
  kind: "not_as_described",
  against: "shop",
  raised_by_role: "customer",
  statement: "The lens is scratched and the remote is missing.",
  evidence: ["https://cdn.example/uploads/claim-1.jpg"],
  amount_claimed: null,
  reply: null,
  can_reply: true,
  reply_due_at: "2026-10-10T12:30:00Z",
  decide_by: "2026-10-10T18:29:59Z",
  status: "open",
  decision: "",
  decided_amount: null,
  decision_note: "",
  effects: [],
  money_pending: false,
  forfeit_at: null,
  return_by: null,
  extensions: [],
  my_side: "against",
  server_time: null,
  created_at: "2026-10-09T05:10:00Z",
  decided_at: null,
  ...over,
});
/** The shop's damage claim against the customer. */
const damage = (over: Partial<Claim> = {}) =>
  claim({ kind: "damage", against: "customer", raised_by_role: "owner", amount_claimed: "650.00", decide_by: "2026-10-12T18:29:59Z", reply_due_at: "2026-10-12T12:30:00Z", ...over });

describe("readClaim", () => {
  it("reads the contract's claim", () => {
    const sent = { ...claim(), reply: null, effects: [{ kind: "refund", amount: "1830.00", text: "Refunded to the customer" }] };
    expect(readClaim(sent)).toEqual(claim({ effects: [{ kind: "refund", amount: "1830.00", text: "Refunded to the customer" }] }));
  });

  it("is null for something that is not a claim", () => {
    expect(readClaim(null)).toBeNull();
    expect(readClaim({ id: "12", kind: "fault" })).toBeNull();
    expect(readClaim({ id: 12 })).toBeNull();
  });

  it("makes a missing field its empty value instead of drawing what was not sent", () => {
    const read = readClaim({ id: 3, kind: "fault", reply: { evidence: [] }, effects: [{ nonsense: true }, { kind: "mark", text: "A mark" }], evidence: [1, "a.jpg"] });
    expect(read?.reply).toBeNull();
    expect(read?.effects).toEqual([{ kind: "mark", amount: null, text: "A mark" }]);
    expect(read?.evidence).toEqual(["a.jpg"]);
    expect(read?.status).toBe("open");
    expect(read?.can_reply).toBe(false);
    expect(read?.reply_due_at).toBeNull();
  });

  it("keeps a reply as sent", () => {
    const read = readClaim({ ...claim(), reply: { text: "In the side pocket.", evidence: ["r1.jpg"], at: "2026-10-09T09:00:00Z" } });
    expect(read?.reply).toEqual({ text: "In the side pocket.", evidence: ["r1.jpg"], at: "2026-10-09T09:00:00Z" });
  });
});

describe("who and what", () => {
  it("names the kinds and knows which three Renit decides", () => {
    expect(kindLabel("fault")).toBe("Fault report");
    expect(kindLabel("something_new")).toBe("A problem with a booking");
    expect(["not_as_described", "fault", "damage"].every(takesDecision)).toBe(true);
    expect(["not_returned", "owner_absent_at_return"].some(takesDecision)).toBe(false);
  });

  it("says who raised it, from the caller's side, exactly as `raised_by_role` says", () => {
    expect(raisedByLine(claim(), "customer")).toBe("You raised this.");
    expect(raisedByLine(claim(), "owner")).toBe("Meera J. raised this.");
    expect(raisedByLine(damage(), "owner")).toBe("You raised this.");
    expect(raisedByLine(damage(), "customer")).toBe("The shop raised this.");
    expect(raisedByLine(claim({ raised_by_role: "system", kind: "not_returned" }), "owner")).toBe("Renit raised this.");
    expect(raisedByLine(claim({ raised_by_role: "system", kind: "not_returned" }), "customer")).toBe("Renit raised this.");
  });

  it("knows which side a claim is against", () => {
    expect(againstMe(claim(), "owner")).toBe(true);
    expect(againstMe(claim(), "customer")).toBe(false);
    expect(againstMe(damage(), "customer")).toBe(true);
    expect(otherName(damage(), "owner")).toBe("Meera J.");
    expect(otherName(damage(), "customer")).toBe("the shop");
  });

  it("writes the booking as a line", () => {
    expect(claimBookingLine(claim())).toBe("RN-24790 · Epson projector · Fri 9 – Sat 10 Oct");
  });
});

describe("deadlines are counted against the server's clock", () => {
  it("says a deadline by the server's day", () => {
    expect(deadlineLabel("2026-10-09T12:30:00Z", NOW)).toBe("6:00 pm today");
    expect(deadlineLabel("2026-10-10T12:30:00Z", NOW)).toBe("6:00 pm tomorrow");
    expect(deadlineLabel("2026-10-12T12:30:00Z", NOW)).toBe("6:00 pm on Mon 12 Oct");
    expect(deadlineLabel(null, NOW)).toBe("");
  });

  it("is the same instant on a different day when the server's day has turned", () => {
    // Fri 9 Oct, 11:50 pm in India: "tomorrow" is already Sunday 11 Oct from Saturday's side.
    const late = new Date("2026-10-09T18:20:00Z");
    expect(deadlineLabel("2026-10-10T12:30:00Z", late)).toBe("6:00 pm tomorrow");
    const nextDay = new Date("2026-10-09T18:40:00Z");
    expect(deadlineLabel("2026-10-10T12:30:00Z", nextDay)).toBe("6:00 pm today");
  });

  it("says when Renit decides, and says so plainly when that has passed", () => {
    expect(decideLine(claim(), NOW)).toBe("Renit decides by the end of tomorrow.");
    expect(decideLine(damage(), NOW)).toBe("Renit decides by the end of Mon 12 Oct.");
    expect(decideLine(claim(), new Date("2026-10-10T19:00:00Z"))).toBe("Renit's decision is due. The desk is on it.");
    expect(decideLine(claim({ kind: "not_returned" }), NOW)).toBeNull();
  });
});

describe("where the claim stands", () => {
  it("is waiting for the decision while open", () => {
    expect(statusBanner(claim(), "customer", NOW)).toEqual({ tone: "brand", title: "Waiting for Renit's decision", sub: "Renit decides by the end of tomorrow." });
    expect(statusBanner(claim({ kind: "not_returned" }), "customer", NOW)).toEqual({ tone: "brand", title: "Renit's desk is dealing with this", sub: null });
  });

  it("says what was decided, in the server's three words", () => {
    expect(statusBanner(claim({ status: "decided", decision: "upheld", effects: [{ kind: "mark", amount: null, text: "x" }] }), "customer", NOW).title).toBe("Renit upheld this claim");
    expect(statusBanner(claim({ status: "decided", decision: "not_upheld" }), "customer", NOW).title).toBe("Renit did not uphold this claim");
    expect(statusBanner(damage({ status: "decided", decision: "resolved" }), "customer", NOW).title).toBe("Resolved by Renit");
    expect(statusBanner(damage({ status: "decided", decision: "" }), "customer", NOW).title).toBe("Decided by Renit");
  });

  it("says the money waits for the item to come back exactly when the claim says `money_pending` (P4-10)", () => {
    const fault = claim({ kind: "fault", status: "decided", decision: "upheld", money_pending: true });
    expect(waitsForReturn(fault)).toBe(true);
    expect(statusBanner(fault, "customer", NOW).sub).toBe("The money moves when the item is back.");
    // An effect already written (the mark) does not end the wait: the flag does.
    const withMark = { ...fault, effects: [{ kind: "mark", amount: null, text: "A mark on the shop's record" }] };
    expect(waitsForReturn(withMark)).toBe(true);
    expect(statusBanner(withMark, "owner", NOW).sub).toBe("The money moves when the item is back.");
    // Not upheld and back late: no money moves and none waits, so nothing is promised.
    const notUpheld = claim({ kind: "fault", status: "decided", decision: "not_upheld", money_pending: false, effects: [] });
    expect(waitsForReturn(notUpheld)).toBe(false);
    expect(statusBanner(notUpheld, "customer", NOW).sub).toBeNull();
    // An open claim has nothing decided to wait on.
    expect(waitsForReturn(claim({ kind: "fault", money_pending: true }))).toBe(false);
  });

  it("reads `money_pending` and `forfeit_at` from the claim", () => {
    const read = readClaim({ ...claim(), kind: "not_returned", money_pending: true, forfeit_at: "2026-10-14T05:00:00Z" });
    expect(read?.money_pending).toBe(true);
    expect(read?.forfeit_at).toBe("2026-10-14T05:00:00Z");
    // An older answer without them: not pending, no time.
    const { money_pending: _m, forfeit_at: _f, ...old } = claim();
    expect(readClaim(old)).toMatchObject({ money_pending: false, forfeit_at: null });
  });

  it("tells both sides when the deposit goes to the owner on an item not returned, by the server's clock", () => {
    const gone = claim({ kind: "not_returned", against: "customer", raised_by_role: "system", reply_due_at: null, forfeit_at: "2026-10-12T04:30:00Z" });
    expect(forfeitLine(gone, "customer", NOW)).toBe("If the item is still out at 10:00 am on Mon 12 Oct, your deposit goes to the shop.");
    expect(forfeitLine(gone, "owner", NOW)).toBe("If the item is still out at 10:00 am on Mon 12 Oct, the deposit goes to you.");
    expect(statusBanner(gone, "customer", NOW).sub).toBe("If the item is still out at 10:00 am on Mon 12 Oct, your deposit goes to the shop.");
    // Past it: said plainly, not as a promise.
    const after = new Date("2026-10-12T06:00:00Z");
    expect(forfeitLine(gone, "customer", after)).toBe("The deposit was due to go to the shop at 10:00 am today, if the item was still out.");
    expect(forfeitLine(gone, "owner", after)).toBe("The deposit was due to go to you at 10:00 am today, if the item was still out.");
    // No time, another kind, or decided: nothing.
    expect(forfeitLine({ ...gone, forfeit_at: null }, "customer", NOW)).toBeNull();
    expect(forfeitLine(claim(), "customer", NOW)).toBeNull();
    expect(forfeitLine({ ...gone, status: "decided" }, "customer", NOW)).toBeNull();
  });

  it("says what a damage claim asked for and what was decided", () => {
    expect(amountLines(damage())).toEqual(["₹650 asked for, of the ₹3,000 deposit"]);
    expect(amountLines(damage({ status: "decided", decision: "upheld", decided_amount: "400.00" }))).toEqual([
      "₹650 asked for, of the ₹3,000 deposit",
      "₹400 decided",
    ]);
    expect(amountLines(damage({ status: "decided", decision: "not_upheld", decided_amount: "0.00" }))[1]).toBe("Nothing is taken from the deposit");
    expect(amountLines(claim())).toEqual([]);
  });

  it("shows what the decision did to the money in the server's own words", () => {
    const rows = effectRows({
      effects: [
        { kind: "refund", amount: "1830.00", text: "Refunded to the customer" },
        { kind: "payout_deduction", amount: "650.00", text: "Comes off a later payout" },
        { kind: "mark", amount: null, text: "A mark on the shop's record" },
        { kind: "new_thing", amount: "0.00", text: "Something else" },
      ],
    });
    expect(rows.map((r) => [r.title, r.label, r.amount])).toEqual([
      ["Refunded to the customer", "Refund", "₹1,830"],
      ["Comes off a later payout", "From a payout", "₹650"],
      ["A mark on the shop's record", "On the record", null],
      ["Something else", "Money", null],
    ]);
  });
});

describe("the reply, once", () => {
  it("is a form for the customer a shop's damage claim is against", () => {
    expect(replyView(damage(), "customer", NOW)).toEqual({ kind: "form", due: "2026-10-12T12:30:00Z" });
  });

  it("is the same form for the shop when the claim is against it: an owner who is not a merchant has no dashboard", () => {
    expect(replyView(claim(), "owner", NOW)).toEqual({ kind: "form", due: "2026-10-10T12:30:00Z" });
    // Still once, still before the deadline, still only when the server says the caller may.
    expect(replyView(claim({ can_reply: false }), "owner", NOW).kind).toBe("none");
    expect(replyView(claim(), "owner", new Date("2026-10-10T12:30:00Z")).kind).toBe("late");
  });

  it("tells the side that raised it that the other can still reply", () => {
    expect(replyView(claim(), "customer", NOW)).toEqual({ kind: "waiting", due: "2026-10-10T12:30:00Z" });
    expect(replyView(damage(), "owner", NOW)).toEqual({ kind: "waiting", due: "2026-10-12T12:30:00Z" });
  });

  it("closes the form by the server's clock even though the server still said the caller could reply", () => {
    const after = new Date("2026-10-12T12:30:00Z");
    expect(replyView(damage({ can_reply: true }), "customer", after)).toEqual({ kind: "late", due: "2026-10-12T12:30:00Z" });
    expect(replyView(damage({ can_reply: true }), "customer", new Date(after.getTime() - 1000)).kind).toBe("form");
    // The side that raised it just stops hearing about a deadline that is gone.
    expect(replyView(damage(), "owner", after).kind).toBe("none");
  });

  it("lets `can_reply` decide when the answer had no readable server time, instead of this phone's own clock", () => {
    const after = new Date("2026-10-12T12:30:00Z");
    // A phone whose clock runs ahead would hide the form; with no server time the server's `can_reply` stands.
    expect(replyView(damage({ can_reply: true }), "customer", after, false).kind).toBe("form");
    expect(replyView(damage({ can_reply: false }), "customer", after, false).kind).toBe("none");
    expect(claimRowSub(damage({ can_reply: true }), "customer", after, false)).toContain("Reply by");
    // With the server's time the deadline is still counted.
    expect(replyView(damage({ can_reply: true }), "customer", after, true).kind).toBe("late");
  });

  it("shows the reply that was sent, and never a form after it", () => {
    const reply = { text: "In the side pocket.", evidence: [], at: "2026-10-09T09:00:00Z" };
    expect(replyView(damage({ reply, can_reply: false }), "customer", NOW)).toEqual({ kind: "sent", reply });
    expect(replyView(damage({ reply }), "owner", NOW)).toEqual({ kind: "sent", reply });
  });

  it("offers no form when the server says the caller cannot reply, or the kind takes no reply", () => {
    expect(replyView(damage({ can_reply: false }), "customer", NOW).kind).toBe("none");
    expect(replyView(claim({ kind: "not_returned", reply_due_at: null, against: "customer", raised_by_role: "system" }), "customer", NOW).kind).toBe("none");
  });

  it("says that no reply was sent once it is decided", () => {
    expect(replyView(damage({ status: "decided", decision: "upheld" }), "customer", NOW).kind).toBe("none_sent");
    expect(replyView(damage({ status: "decided", decision: "upheld" }), "owner", NOW).kind).toBe("none");
  });

  it("holds an empty reply", () => {
    expect(replyHold("  ")).toBe("Write your reply.");
    expect(replyHold("It was fine.")).toBeNull();
  });

  it("says why a reply was refused", () => {
    expect(replyErrorText(err({ code: "already_replied" }))).toBe("You have already replied. A claim takes one reply.");
    expect(replyErrorText(err({ code: "claim_decided" }))).toBe("Renit has already decided this claim.");
    expect(replyErrorText(err({ code: "reply_late" }))).toBe("The time to reply has passed.");
    expect(replyErrorText(err({ status: 403, code: "forbidden" }))).toBe("You can't reply to this claim.");
    // A refused file is said as the server says it; the words come first.
    const refused = (fields: Record<string, string[]>) => err({ status: 400, code: "validation_error", details: { fields } });
    expect(replyErrorText(refused({ evidence: ["This file is not on Renit's storage. Upload it again."] }))).toBe(
      "This file is not on Renit's storage. Upload it again."
    );
    expect(replyErrorText(refused({ text: ["This field may not be blank."], evidence: ["This file is too large."] }))).toBe("This field may not be blank.");
    expect(replyErrorText(refused({}))).toBe("Write your reply, then try again.");
    expect(replyErrorText(err({ status: 0 }))).toBe("We couldn't reach Renit. Check your connection and try again.");
    expect(replyErrorText(null)).toBe("We couldn't reach Renit. Check your connection and try again.");
    expect(replyAlreadyIn(err({ code: "already_replied" }))).toBe(true);
    expect(replyAlreadyIn(err({ code: "claim_decided" }))).toBe(true);
    expect(replyAlreadyIn(err({ code: "reply_late" }))).toBe(false);
  });

  it("says where a claim stands on a booking's list", () => {
    expect(claimRowSub(damage(), "customer", NOW)).toBe("Waiting for Renit's decision. Reply by 6:00 pm on Mon 12 Oct.");
    expect(claimRowSub(claim(), "customer", NOW)).toBe("Waiting for Renit's decision");
    expect(claimRowSub(claim({ status: "decided", decision: "not_upheld" }), "customer", NOW)).toBe("Renit did not uphold this claim");
  });
});

describe("the customer's fault report", () => {
  const booking = (over = {}) => ({ can: ["report_fault"], claim_open: false, stage: "out" as const, report_fault_until: "2026-10-10T05:12:00Z", ...over });

  it("is offered when the server says so", () => {
    expect(faultBlocked(booking(), NOW)).toBeNull();
  });

  it("says which of the reasons it is not offered", () => {
    expect(faultBlocked(booking({ can: [], claim_open: true }), NOW)).toBe("A report is already with Renit. Open the booking to see where it stands.");
    expect(faultBlocked(booking({ can: [], stage: "returned" }), NOW)).toBe("A fault can be reported while you have the item, within 24 hours of the handover.");
    expect(faultBlocked(booking({ can: [] }), new Date("2026-10-10T06:00:00Z"))).toBe("The 24 hours to report a fault have passed. Use Get help to talk to Renit's desk.");
    expect(faultBlocked(booking({ can: [] }), NOW)).toBe("A fault can't be reported on this booking now.");
  });

  it("writes BK-20's row with the deadline in words", () => {
    expect(faultRowSub({ report_fault_until: "2026-10-10T05:12:00Z" }, NOW)).toBe("Report it by 10:42 am tomorrow, within 24 hours of handover");
    expect(faultRowSub({ report_fault_until: "2026-10-09T09:00:00Z" }, NOW)).toBe("Report it by 2:30 pm today, within 24 hours of handover");
    expect(faultRowSub({ report_fault_until: null }, NOW)).toBe("Report it within 24 hours of handover");
  });

  it("tells the customer what a fault report does, with the booking's own amounts", () => {
    const text = faultNotice({ money: { booking_amount: "99.00", rate: "610.00" } as never });
    expect(text).toContain("Renit decides by the end of tomorrow.");
    expect(text).toContain("within 24 hours of your report");
    expect(text).toContain("your rent and the ₹99 back once it is back");
    expect(text).toContain("one day's rent (₹610) goes to the shop");
  });

  it("needs the words and at least one photo", () => {
    expect(faultHold("", 1)).toBe("Say what does not work.");
    expect(faultHold("It will not switch on", 0)).toBe("Add at least one photo of the problem.");
    expect(faultHold("It will not switch on", 1)).toBeNull();
  });

  it("reads when the item must be back from the claim's own return_by; only a claim without it is counted here (report plus the return hours)", () => {
    expect(FAULT_RETURN_HOURS).toBe(24);
    // The server's time wins, even when it is not 24 hours (a setting that moved).
    expect(faultReturnBy({ kind: "fault", created_at: "2026-10-09T05:10:00Z", return_by: "2026-10-09T17:10:00Z" })).toBe("2026-10-09T17:10:00Z");
    // An answer without the field: the report plus the return hours.
    expect(faultReturnBy({ kind: "fault", created_at: "2026-10-09T05:10:00Z", return_by: null })).toBe("2026-10-10T05:10:00.000Z");
    expect(faultReturnBy({ kind: "damage", created_at: "2026-10-09T05:10:00Z", return_by: null })).toBeNull();
    expect(faultReturnBy({ kind: "fault", created_at: "", return_by: null })).toBeNull();
  });

  it("reads the caller's side from the claim's my_side, and the clock from its server_time", () => {
    const read = readClaim({ ...claim(), my_side: "against", return_by: "2026-10-10T05:10:00Z", server_time: "2026-10-09T05:12:00Z" });
    expect(read).toMatchObject({ my_side: "against", return_by: "2026-10-10T05:10:00Z", server_time: "2026-10-09T05:12:00Z" });
    // A shop claim (the shop is the side it is against) read by the shop, and by the customer who raised it.
    expect(sideOf(claim({ my_side: "against", against: "shop" }))).toBe("owner");
    expect(sideOf(claim({ my_side: "raised", raised_by_role: "customer" }))).toBe("customer");
    // A damage claim: the shop raised it, the customer answers.
    expect(sideOf(damage({ my_side: "raised" }))).toBe("owner");
    expect(sideOf(damage({ my_side: "against" }))).toBe("customer");
    // A claim Renit raised: the one it is not against is the other party.
    const gone = claim({ kind: "not_returned", against: "customer", raised_by_role: "system", my_side: "other" });
    expect(sideOf(gone)).toBe("owner");
    expect(sideOf({ ...gone, my_side: "against" })).toBe("customer");
    // An answer without my_side is not guessed at: the one the server lets reply is the side it is against; else unknown.
    expect(sideOf(claim({ my_side: null, can_reply: true }))).toBe("owner");
    expect(sideOf(claim({ my_side: null, can_reply: false }))).toBeNull();
    // Told in the third person, with nothing said of "you".
    expect(raisedByLine(claim({ raised_by_role: "customer" }), null)).toBe("Meera J. raised this.");
    expect(raisedByLine(damage(), null)).toBe("The shop raised this.");
    expect(forfeitLine(claim({ kind: "not_returned", status: "open", forfeit_at: "2026-10-12T04:30:00Z" }), null, NOW)).toBe(
      "If the item is still out at 10:00 am on Mon 12 Oct, the deposit goes to the shop."
    );
    expect(readClaim({ ...claim(), my_side: "someone" })?.my_side).toBeNull();
    // The bookings that took the item on: a list, `[]` for none, and null for an answer from before the field.
    expect(readClaim({ ...claim(), extensions: ["RN-24900", 5, "RN-24901"] })?.extensions).toEqual(["RN-24900", "RN-24901"]);
    expect(readClaim({ ...claim(), extensions: [] })?.extensions).toEqual([]);
    expect(readClaim({ ...claim(), extensions: undefined })?.extensions).toBeNull();
  });

  it("tells the customer the item goes back first, only while the booking says it is still out", () => {
    const fault = claim({ kind: "fault", created_at: "2026-10-09T05:10:00Z" });
    const out = { stillOut: true, by: faultReturnBy(fault), early: null, extended: false };
    const back = { ...out, stillOut: false };
    expect(faultReturnLine(fault, out, NOW)).toBe("The item goes back first: bring it back by 10:40 am tomorrow. Any refund is paid once it is back.");
    expect(faultReturnLine(fault, out, new Date("2026-10-10T06:00:00Z"))).toBe(
      "The item was due back by 10:40 am today. Bring it back as soon as you can: any refund is paid once it is back."
    );
    // The item is back (reported 10 am Saturday, returned that evening, decided Sunday night): nothing to bring.
    expect(faultReturnLine(fault, back, NOW)).toBeNull();
    expect(faultReturnLine({ ...fault, status: "decided", money_pending: true }, back, NOW)).toBeNull();
    // Decided and the money waits, the item still out: still to bring back. Decided and nothing waits: nothing to say.
    expect(faultReturnLine({ ...fault, status: "decided", money_pending: true }, out, NOW)).not.toBeNull();
    expect(faultReturnLine({ ...fault, status: "decided", money_pending: false }, out, NOW)).toBeNull();
    expect(faultReturnLine(claim(), out, NOW)).toBeNull();
    // Nothing is said while the chain is still being read.
    expect(faultReturnLine(fault, null, NOW)).toBeNull();
  });

  describe("a fault report on a rental that was extended (T-33): the item comes back at the end of the last extension", () => {
    // An answer without `extensions` (null): the chain is read from the bookings, as before the field.
    const fault = claim({ kind: "fault", created_at: "2026-10-09T05:10:00Z", return_by: "2026-10-10T05:10:00Z", extensions: null });
    const b = (over: Partial<Parameters<typeof faultReturnTarget>[1] & object> & { number?: string } = {}) => ({
      number: "RN-24831",
      stage: "out" as const,
      exit: "" as const,
      extensions: [] as string[],
      return_by: "2026-10-09T14:30:00Z",
      ...over,
    });
    const extension = b({ number: "RN-24900", return_by: "2026-10-14T14:30:00Z" });

    it("the claim's own booking is closed once its extension has started, and the line points at the extension's return", () => {
      const first = b({ stage: "closed", extensions: ["RN-24900"] });
      const target = faultReturnTarget(fault, first, extension);
      expect(target).toEqual({ stillOut: true, by: "2026-10-14T14:30:00Z", early: "2026-10-10T05:10:00.000Z", extended: true });
      // After the 24 hours after the report: the extension's return alone.
      expect(faultReturnLine(fault, target, new Date("2026-10-10T06:00:00Z"))).toBe(
        "The item goes back at the end of your extension: bring it back by 8:00 pm on Wed 14 Oct. Any refund is paid once it is back."
      );
    });

    it("while the 24 hours after the report are still ahead, they are said too: they decide the refund if Renit does not agree", () => {
      const target = faultReturnTarget(fault, b({ stage: "closed", extensions: ["RN-24900"] }), extension);
      expect(faultReturnLine(fault, target, NOW)).toBe(
        "Bring the item back by 10:40 am tomorrow to keep a refund if Renit does not agree. The latest it can come back is 8:00 pm on Wed 14 Oct, the end of your extension. Any refund is paid once it is back."
      );
    });

    describe("when the claim names its extensions (its return_by already follows the chain), one read of the last is enough", () => {
      const chained = claim({ kind: "fault", created_at: "2026-10-09T05:10:00Z", return_by: "2026-10-14T14:30:00Z", extensions: ["RN-24900"] });

      it("is read from the claim, not worked out from the bookings", () => {
        const first = b({ stage: "closed" }); // the booking object here does not even name its extension
        const target = faultReturnTarget(chained, first, extension);
        expect(target).toEqual({ stillOut: true, by: "2026-10-14T14:30:00Z", early: "2026-10-10T05:10:00.000Z", extended: true });
        expect(faultReturnLine(chained, target, new Date("2026-10-10T06:00:00Z"))).toContain("bring it back by 8:00 pm on Wed 14 Oct");
      });

      it("an empty list is a rental that was never extended, or whose extensions all fell through: nothing more to read", () => {
        const none = claim({ kind: "fault", created_at: "2026-10-09T05:10:00Z", return_by: "2026-10-10T05:10:00Z", extensions: [] });
        // Even if the booking still lists an extension, the claim says none took the item on.
        expect(faultReturnTarget(none, b({ extensions: ["RN-24900"] }), null)).toEqual({
          stillOut: true,
          by: "2026-10-10T05:10:00Z",
          early: null,
          extended: false,
        });
      });

      it("waits for the last extension to be read, and says nothing once it is back", () => {
        expect(faultReturnTarget(chained, b({ stage: "closed" }), null)).toBeNull();
        expect(faultReturnTarget(chained, b({ stage: "closed" }), { ...extension, stage: "returned" })?.stillOut).toBe(false);
      });
    });

    it("one time, not two, when the extension is due inside the report's 24 hours: it is not the end of the extension by itself", () => {
      // Reported at 6 pm (UTC 12:30), the extension is due back at noon the next day (UTC 06:30): inside the 24 hours.
      const evening = claim({ kind: "fault", created_at: "2026-10-09T12:30:00Z", return_by: "2026-10-10T12:30:00Z", extensions: ["RN-24900"] });
      const target = faultReturnTarget(evening, b({ stage: "closed" }), b({ number: "RN-24900", return_by: "2026-10-10T06:30:00Z" }));
      // The claim's return_by is the later of the two (the server's rule), so `by` equals the report's time.
      expect(target).toMatchObject({ by: "2026-10-10T12:30:00Z", extended: true });
      expect(faultReturnLine(evening, target, NOW)).toBe("Bring the item back by 6:00 pm tomorrow. Any refund is paid once it is back.");
    });

    it("once Renit has decided, 'if Renit does not agree' is gone: the extension's return alone", () => {
      const decided = { ...fault, status: "decided" as const, money_pending: true };
      const target = faultReturnTarget(decided, b({ stage: "closed", extensions: ["RN-24900"] }), extension);
      const line = faultReturnLine(decided, target, NOW);
      expect(line).toBe("The item goes back at the end of your extension: bring it back by 8:00 pm on Wed 14 Oct. Any refund is paid once it is back.");
      expect(line).not.toMatch(/does not agree/);
    });

    it("an answer without the field is read from the bookings: the claim's return_by is not taken for the chain's", () => {
      const old = { ...fault, extensions: null };
      expect(faultReturnTarget(old, b({ stage: "closed", extensions: ["RN-24900"] }), extension)).toEqual({
        stillOut: true,
        by: "2026-10-14T14:30:00Z",
        early: "2026-10-10T05:10:00.000Z",
        extended: true,
      });
    });

    it("an extension accepted but not started: the item is still out on the first booking, and the line points at the extension's return", () => {
      const first = b({ extensions: ["RN-24900"] });
      expect(faultReturnTarget(fault, first, b({ number: "RN-24900", stage: "ready", return_by: "2026-10-14T14:30:00Z" }))).toEqual({
        stillOut: true,
        by: "2026-10-14T14:30:00Z",
        early: "2026-10-10T05:10:00.000Z",
        extended: true,
      });
    });

    it("says nothing once the extension is back, and nothing while the chain is still being read", () => {
      const first = b({ stage: "closed", extensions: ["RN-24900"] });
      const returned = faultReturnTarget(fault, first, { ...extension, stage: "returned" });
      expect(returned?.stillOut).toBe(false);
      expect(faultReturnLine(fault, returned, NOW)).toBeNull();
      expect(faultReturnTarget(fault, first, null)).toBeNull();
      expect(faultReturnTarget(fault, undefined, null)).toBeNull();
    });

    it("an extension that was cancelled or refused changes nothing: the item goes back on the first booking's terms", () => {
      const first = b({ extensions: ["RN-24900"] });
      expect(faultReturnTarget(fault, first, first)).toEqual({ stillOut: true, by: "2026-10-10T05:10:00Z", early: null, extended: false });
    });

    it("a rental that was never extended reads the claim's own return_by", () => {
      expect(faultReturnTarget(fault, b(), null)).toEqual({ stillOut: true, by: "2026-10-10T05:10:00Z", early: null, extended: false });
    });

    it("finds the last live booking of the chain, a cancelled extension passed over, and walks on from an extension that was itself extended", async () => {
      const all: Record<string, ReturnType<typeof b>> = {
        "RN-24900": b({ number: "RN-24900", exit: "cancelled" as never }),
        "RN-24901": b({ number: "RN-24901", stage: "closed", extensions: ["RN-24902"] }),
        "RN-24902": b({ number: "RN-24902", return_by: "2026-10-20T14:30:00Z" }),
      };
      const read = jest.fn(async (number: string) => all[number]);
      const first = b({ stage: "closed", extensions: ["RN-24900", "RN-24901"] });
      expect((await chainEnd(first, read)).number).toBe("RN-24902");
      // Nothing extends it, or every extension is cancelled: the booking itself.
      expect(await chainEnd(b(), read)).toMatchObject({ number: "RN-24831" });
      expect((await chainEnd(b({ extensions: ["RN-24900"] }), read)).number).toBe("RN-24831");
    });
  });

  it("says why a report was refused", () => {
    expect(faultErrorText(err({ code: "too_late" }))).toContain("more than 24 hours since the handover");
    expect(faultErrorText(err({ code: "claim_exists" }))).toBe("You have already reported a fault on this booking. It is with Renit.");
    expect(faultErrorText(err({ code: "validation_error", details: { fields: { photos: ["Add at least one photo or video."] } } }))).toBe("Add at least one photo or video.");
    expect(faultErrorText(err({ status: 0 }))).toBe("We couldn't reach Renit. Check your connection and try again.");
  });
});

describe("the shop's damage report", () => {
  it("reads whole rupees from what was typed", () => {
    expect(parseRupees("650")).toBe(650);
    expect(parseRupees("₹1,200")).toBe(1200);
    expect(parseRupees("12.50")).toBe(1250);
    expect(parseRupees("")).toBeNull();
    expect(parseRupees("abc")).toBeNull();
    expect(rupeesBody(650)).toBe("650.00");
  });

  it("allows at most the deposit less the late fee", () => {
    expect(damageMax({ deposit: "3000.00", late_fee: "0.00" })).toBe(3000);
    expect(damageMax({ deposit: "3000.00", late_fee: "1220.00" })).toBe(1780);
    expect(damageMax({ deposit: "3000.00", late_fee: "3000.00" })).toBe(0);
    expect(damageMax({ deposit: "0.00" })).toBe(0);
    expect(damageMax({ deposit: "abc" })).toBe(0);
    expect(damageMaxLine({ deposit: "3000.00", late_fee: "0.00" })).toBe("Up to the deposit of ₹3,000");
    expect(damageMaxLine({ deposit: "3000.00", late_fee: "1220.00" })).toBe("Up to ₹1,780: the deposit of ₹3,000 less ₹1,220 for late days");
  });

  it("holds Send for each thing that is missing, in the order the form asks", () => {
    expect(damageHold("", "650", 1, 3000)).toBe("Say what happened.");
    expect(damageHold("A broken stick", "", 1, 3000)).toBe("Say how much you are asking for.");
    expect(damageHold("A broken stick", "0", 1, 3000)).toBe("Say how much you are asking for.");
    expect(damageHold("A broken stick", "3001", 1, 3000)).toBe("The most you can ask for is ₹3,000: the deposit less any late fee.");
    expect(damageHold("A broken stick", "650", 0, 3000)).toBe("Add at least one photo of the damage.");
    expect(damageHold("A broken stick", "650", 1, 3000)).toBeNull();
    expect(damageHold("A broken stick", "3000", 1, 3000)).toBeNull();
    expect(damageHold("A broken stick", "1", 1, 0)).toBe("The most you can ask for is ₹0: the deposit less any late fee.");
  });

  const shop = (over = {}) => ({
    can: ["report_problem"],
    stage: "returned" as const,
    exit: "" as const,
    claim_open: false,
    claims: [] as number[],
    report_problem_until: "2026-10-10T05:12:00Z",
    money: { deposit: "3000.00", late_fee: "0.00" } as never,
    ...over,
  });
  const NONE_LEFT = "Nothing is left of the deposit to claim against, so a problem can't be reported here. Use Get help to tell Renit's desk what is wrong.";

  it("is offered when the server says so, and only then (P4-10: the phone does not work the rule out)", () => {
    expect(damageBlocked(shop(), NOW)).toBeNull();
    expect(problemState(shop(), NOW)).toBe("open");
    // `can` is the rule: even a booking that looks reportable is not offered without it.
    expect(problemState(shop({ can: [] }), NOW)).not.toBe("open");
  });

  it("says plainly that nothing is left of the deposit, before the return code and after it, and points to Get help (A-50)", () => {
    // No deposit was taken.
    const none = { deposit: "0.00", late_fee: "0.00" } as never;
    expect(problemState(shop({ can: [], money: none }), NOW)).toBe("none_left");
    expect(problemState(shop({ can: [], money: none, stage: "out" }), NOW)).toBe("none_left");
    // Late fees used it all.
    const used = { deposit: "3000.00", late_fee: "3000.00" } as never;
    expect(problemState(shop({ can: [], money: used }), NOW)).toBe("none_left");
    expect(damageBlocked(shop({ can: [], money: used }), NOW)).toBe(NONE_LEFT);
    expect(problemLine("none_left")).toBe(NONE_LEFT);
  });

  it("says which of the other reasons it is not offered", () => {
    expect(problemState(shop({ can: [], stage: "out" }), NOW)).toBe("after_code");
    expect(damageBlocked(shop({ can: [], stage: "out" }), NOW)).toContain("once the item is back");
    expect(problemState(shop({ can: [], claim_open: true }), NOW)).toBe("reported");
    expect(damageBlocked(shop({ can: [], claim_open: true }), NOW)).toContain("already been reported");
    // A claim made and decided still stops a second one.
    expect(problemState(shop({ can: [], claims: [12] }), NOW)).toBe("reported");
    expect(problemState(shop({ can: [] }), new Date("2026-10-10T06:00:00Z"))).toBe("passed");
    expect(damageBlocked(shop({ can: [] }), new Date("2026-10-10T06:00:00Z"))).toBe("The time to report a problem has passed. Use Get help to talk to Renit's desk.");
    expect(problemState(shop({ can: [], stage: "closed", report_problem_until: null }), NOW)).toBe("passed");
    expect(problemState(shop({ can: [], exit: "cancelled_by_owner" }), NOW)).toBe("unavailable");
    expect(problemState(shop({ can: [] }), NOW)).toBe("unavailable");
    expect(problemLine("open")).toBeNull();
    expect(problemLine("after_code")).toBeNull();
  });

  it("a forfeited deposit: `can` has no report_problem and the time is null, and nothing crashes on either", () => {
    const forfeited = shop({
      can: [],
      stage: "closed" as never,
      report_problem_until: null,
      money: { deposit: "3000.00", late_fee: "0.00", deposit_state: "forfeited" } as never,
    });
    expect(problemState(forfeited, NOW)).toBe("forfeited");
    expect(damageBlocked(forfeited, NOW)).toBe(
      "The deposit has already come to you, because the item was not back in time, so there is nothing to claim against. Use Get help if something is wrong."
    );
    // Also while the item is still out (the 72 hours passed, the item not back yet).
    expect(problemState({ ...forfeited, stage: "out" as never }, NOW)).toBe("forfeited");
    // A null time, whatever the state: the lines that read it say nothing instead of failing.
    expect(reportUntilLine(null, NOW)).toBeNull();
    expect(reportUntilLine(undefined, NOW)).toBeNull();
    for (const stage of ["out", "returned", "closed"] as const) {
      expect(() => problemState(shop({ can: [], stage: stage as never, report_problem_until: null }), NOW)).not.toThrow();
      expect(() => damageBlocked(shop({ can: [], stage: stage as never, report_problem_until: null }), NOW)).not.toThrow();
    }
  });

  it("says `reported` only for a damage claim: a customer's fault report does not (review app-5 r2 #8)", () => {
    const later = new Date("2026-10-10T06:00:00Z");
    // The customer's fault report is a claim on the booking, open or decided; the shop reported nothing; the time is over.
    expect(problemState(shop({ can: [], claim_open: true, claims: [12] }), later, ["fault"])).toBe("passed");
    expect(problemState(shop({ can: [], claims: [12] }), later, ["fault", "not_as_described"])).toBe("passed");
    expect(damageBlocked(shop({ can: [], claims: [12] }), later, ["fault"])).toBe("The time to report a problem has passed. Use Get help to talk to Renit's desk.");
    // A damage claim among them is still "already reported".
    expect(problemState(shop({ can: [], claims: [12, 13] }), later, ["fault", "damage"])).toBe("reported");
    // Before the kinds are read, the booking's own flags stand in.
    expect(problemState(shop({ can: [], claims: [12] }), later, undefined)).toBe("reported");
    expect(problemState(shop({ can: [], claims: [12] }), later, null)).toBe("reported");
    // No claims at all.
    expect(problemState(shop({ can: [], claims: [] }), later, [])).toBe("passed");
  });

  it("says what Renit does with the report", () => {
    expect(damageNotice("Aarav")).toBe("Renit decides from the two sets of photos within three working days. Aarav can reply once.");
    expect(reportUntilLine("2026-10-10T05:12:00Z", NOW)).toBe("You have until 10:42 am tomorrow.");
    expect(reportUntilLine(null, NOW)).toBeNull();
  });

  it("says why a report was refused, with the server's own ceiling", () => {
    expect(damageErrorText(err({ code: "too_late" }))).toContain("24 hours to report a problem have passed");
    expect(damageErrorText(err({ code: "amount_too_large", details: { max: "1780.00" } }))).toBe("The most you can ask for is ₹1,780: the deposit less any late fee.");
    expect(damageErrorText(err({ code: "amount_too_large", details: { max: "0.00" } }))).toContain("Nothing is left of the deposit");
    expect(damageErrorText(err({ code: "claim_exists" }))).toBe("You have already reported a problem on this booking. It is with Renit.");
    expect(damageErrorText(err({ code: "validation_error", details: { fields: { amount: ["A valid number is required."] } } }))).toBe("A valid number is required.");
  });
});

describe("after a report whose answer never came (review r1 #3)", () => {
  it("takes only a claim the booking did not hold before the press", () => {
    expect(newClaimIds([4, 7], [4, 7, 9])).toEqual([9]);
    expect(newClaimIds([4, 7], [4, 7])).toEqual([]);
    expect(newClaimIds(undefined, [3])).toEqual([3]);
    expect(newClaimIds([1], undefined)).toEqual([]);
  });

  it("matches a fault report on its kind, who raised it and its words", () => {
    const mine = claim({ kind: "fault", raised_by_role: "customer", statement: "It will not switch on." });
    expect(isMyReport(mine, { kind: "fault", statement: "It will not switch on." })).toBe(true);
    expect(isMyReport(mine, { kind: "fault", statement: "  It will not switch on.  " })).toBe(true);
    expect(isMyReport(mine, { kind: "fault", statement: "Another thing" })).toBe(false);
    // A "not as described" claim the customer made earlier is not a fault report.
    expect(isMyReport(claim(), { kind: "fault", statement: "The lens is scratched and the remote is missing." })).toBe(false);
    expect(isMyReport({ ...mine, raised_by_role: "owner" }, { kind: "fault", statement: "It will not switch on." })).toBe(false);
  });

  it("matches a damage report on its kind, its amount and its words, and never the customer's own open claim", () => {
    const mine = damage({ statement: "The stick is broken." });
    expect(isMyReport(mine, { kind: "damage", statement: "The stick is broken.", amount: 650 })).toBe(true);
    expect(isMyReport(mine, { kind: "damage", statement: "The stick is broken.", amount: 600 })).toBe(false);
    expect(isMyReport(mine, { kind: "damage", statement: "Something else", amount: 650 })).toBe(false);
    // The scene of the review: the customer's fault claim is still open, and it is not the shop's damage report.
    const theirs = claim({ kind: "fault", raised_by_role: "customer", statement: "The stick is broken." });
    expect(isMyReport(theirs, { kind: "damage", statement: "The stick is broken.", amount: 650 })).toBe(false);
    expect(isMyReport(damage({ amount_claimed: null }), { kind: "damage", statement: damage().statement, amount: 650 })).toBe(false);
  });
});

describe("evidence", () => {
  it("tells a video from a photo by its address", () => {
    expect(isVideoUrl("https://cdn.example/uploads/clip.mp4")).toBe(true);
    expect(isVideoUrl("https://cdn.example/uploads/clip.MOV?x=1")).toBe(true);
    expect(isVideoUrl("https://cdn.example/uploads/photo.jpg")).toBe(false);
  });
});
