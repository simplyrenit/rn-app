import { describe, expect, it } from "@jest/globals";
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
  faultReturnLine,
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
    expect(statusBanner(claim(), NOW)).toEqual({ tone: "brand", title: "Waiting for Renit's decision", sub: "Renit decides by the end of tomorrow." });
    expect(statusBanner(claim({ kind: "not_returned" }), NOW)).toEqual({ tone: "brand", title: "Renit's desk is dealing with this", sub: null });
  });

  it("says what was decided, in the server's three words", () => {
    expect(statusBanner(claim({ status: "decided", decision: "upheld", effects: [{ kind: "mark", amount: null, text: "x" }] }), NOW).title).toBe("Renit upheld this claim");
    expect(statusBanner(claim({ status: "decided", decision: "not_upheld" }), NOW).title).toBe("Renit did not uphold this claim");
    expect(statusBanner(damage({ status: "decided", decision: "resolved" }), NOW).title).toBe("Resolved by Renit");
    expect(statusBanner(damage({ status: "decided", decision: "" }), NOW).title).toBe("Decided by Renit");
  });

  it("says a decided fault claim waits for the item to come back until its money has run", () => {
    const fault = claim({ kind: "fault", status: "decided", decision: "upheld", effects: [] });
    expect(waitsForReturn(fault)).toBe(true);
    expect(statusBanner(fault, NOW).sub).toBe("The money moves once the item is back.");
    expect(waitsForReturn({ ...fault, effects: [{ kind: "refund", amount: "1830.00", text: "Refunded to the customer" }] })).toBe(false);
    expect(waitsForReturn(damage({ status: "decided", effects: [] }))).toBe(false);
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

  it("is a line for the shop to reply on the dashboard when the claim is against it (the phone does not reply for a shop)", () => {
    expect(replyView(claim(), "owner", NOW)).toEqual({ kind: "dashboard", due: "2026-10-10T12:30:00Z" });
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

  it("works out when the item must be back: the report plus the return hours", () => {
    expect(FAULT_RETURN_HOURS).toBe(24);
    expect(faultReturnBy({ kind: "fault", created_at: "2026-10-09T05:10:00Z" })).toBe("2026-10-10T05:10:00.000Z");
    expect(faultReturnBy({ kind: "damage", created_at: "2026-10-09T05:10:00Z" })).toBeNull();
    expect(faultReturnBy({ kind: "fault", created_at: "" })).toBeNull();
  });

  it("tells the customer the item goes back first, until the money has run", () => {
    const fault = claim({ kind: "fault", created_at: "2026-10-09T05:10:00Z" });
    expect(faultReturnLine(fault, NOW)).toBe("The item goes back first: bring it back by 10:40 am tomorrow. Any refund is paid once it is back.");
    expect(faultReturnLine(fault, new Date("2026-10-10T06:00:00Z"))).toBe(
      "The item was due back by 10:40 am today. Bring it back as soon as you can: any refund is paid once it is back."
    );
    // Decided, money waiting: still to bring back. Decided, money run: nothing more to say.
    expect(faultReturnLine({ ...fault, status: "decided", effects: [] }, NOW)).not.toBeNull();
    expect(faultReturnLine({ ...fault, status: "decided", effects: [{ kind: "refund", amount: "1.00", text: "x" }] }, NOW)).toBeNull();
    expect(faultReturnLine(claim(), NOW)).toBeNull();
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
    claim_open: false,
    report_problem_until: "2026-10-10T05:12:00Z",
    money: { deposit: "3000.00", late_fee: "0.00" } as never,
    ...over,
  });

  it("is offered when the server says so", () => {
    expect(damageBlocked(shop(), NOW)).toBeNull();
  });

  it("says which of the reasons it is not offered, and points to Get help where nothing can be claimed (A-50)", () => {
    expect(damageBlocked(shop({ can: [], claim_open: true }), NOW)).toContain("already with Renit");
    expect(damageBlocked(shop({ can: [], stage: "out" }), NOW)).toContain("once the item is back");
    expect(damageBlocked(shop({ can: [], money: { deposit: "3000.00", late_fee: "3000.00" } as never }), NOW)).toBe(
      "Nothing is left of the deposit, so a damage claim can't be made. Use Get help to talk to Renit's desk."
    );
    expect(damageBlocked(shop({ can: [] }), new Date("2026-10-10T06:00:00Z"))).toBe("The 24 hours to report a problem have passed. Use Get help to talk to Renit's desk.");
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

describe("evidence", () => {
  it("tells a video from a photo by its address", () => {
    expect(isVideoUrl("https://cdn.example/uploads/clip.mp4")).toBe(true);
    expect(isVideoUrl("https://cdn.example/uploads/clip.MOV?x=1")).toBe(true);
    expect(isVideoUrl("https://cdn.example/uploads/photo.jpg")).toBe(false);
  });
});
