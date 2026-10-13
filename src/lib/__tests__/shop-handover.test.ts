import { describe, expect, it } from "@jest/globals";
import type { BookingShop } from "../shop-booking";
import {
  dayButton,
  dayScreen,
  handoverCopy,
  handoverSteps,
  payoutPending,
  payoutWaits,
  reportFirstNote,
  returnCopy,
  shopReturnSteps,
  startedCopy,
} from "../shop-handover";

/** Saturday 24 October 2026, 9:50 am in India: SH-08's moment. */
const NOW = new Date("2026-10-24T04:20:00Z");

/** The contract's example booking (RN-24831) on the day of its handover. */
function booking(over: Record<string, unknown> = {}, moneyOver: Record<string, unknown> = {}): BookingShop {
  return {
    number: "RN-24831",
    stage: "ready",
    ring_state: "",
    exit: "",
    exit_reason: "",
    is_open: true,
    product: { name: "PRO_8fk2Lq", title: "Sony PS5", shop_code: "PS5-01", cover_image: null, quantity: 5 },
    customer: {
      first_name: "Aarav",
      last_initial: "M",
      id_checked: true,
      rentals_completed: 3,
      area: "Andheri East",
      distance_km: "3.2",
      address: null,
      coordinates: null,
    },
    first_day: "2026-10-24",
    last_day: "2026-10-26",
    days: 3,
    delivery_mode: "pickup",
    units: { in_use: 2, quantity: 5 },
    money: {
      rate: "610.00",
      rent: "1830.00",
      delivery_fee: "0.00",
      fee_shown: "92.00",
      fee_charged: "0.00",
      you_earn: "1830.00",
      rent_paid: true,
      deposit: "3000.00",
      deposit_state: "paid",
      deposit_ask_at: "2026-10-23T04:30:00Z",
      deposit_due_at: "2026-10-24T02:30:00Z",
      rent_pay_minutes: 30,
      rent_due_at: null,
      payout: { status: "none", status_reason: null, text: "Sent on the day of handover", amount: "1830.00", due_at: null, paid_at: null, more: 0 },
      ...moneyOver,
    },
    answered: null,
    window: { start: "2026-10-24T04:30:00Z", end: "2026-10-24T05:30:00Z" },
    window_request: null,
    return_by: "2026-10-26T14:30:00Z",
    id_match_required: false,
    day: {
      call_number: "+919812345678",
      call_from: "2026-10-24T02:30:00Z",
      my_status: "",
      their_status: "on_my_way",
      no_show_from: "2026-10-24T06:00:00Z",
      handover_code: null,
      return_code: null,
    },
    captures: { handover: { mine: false, theirs: false }, return: { mine: false, theirs: false } },
    report_problem_until: null,
    claim_open: false,
    claims: [],
    can: ["set_status", "no_show", "capture_handover", "enter_handover_code", "get_help"],
    timeline: [],
    created_at: "2026-10-12T04:11:00Z",
    server_time: "2026-10-24T04:20:00Z",
    ...over,
  } as BookingShop;
}

const flags = (hm: boolean, ht: boolean, rm = false, rt = false) => ({
  handover: { mine: hm, theirs: ht },
  return: { mine: rm, theirs: rt },
});

describe("which screen a booking's day is", () => {
  it("the handover while it is ready, the return once it is out or back, nothing else", () => {
    expect(dayScreen(booking())).toBe("ShopHandover");
    expect(dayScreen(booking({ stage: "out" }))).toBe("ShopReturn");
    expect(dayScreen(booking({ stage: "returned" }))).toBe("ShopReturn");
    for (const stage of ["ringing", "accepted", "confirmed", "closed"]) expect(dayScreen(booking({ stage }))).toBeNull();
    // An ended booking has no day left.
    expect(dayScreen(booking({ exit: "no_show", exit_reason: "customer" }))).toBeNull();
  });

  it("names the button on the booking page", () => {
    expect(dayButton(booking())).toBe("Open the handover");
    expect(dayButton(booking({ stage: "out" }))).toBe("Open the return");
    expect(dayButton(booking({ stage: "returned" }))).toBe("See the return");
    expect(dayButton(booking({ stage: "confirmed" }))).toBeNull();
  });
});

describe("SH-08, the handover", () => {
  it("who is coming, when, and where things stand", () => {
    expect(handoverCopy(booking(), NOW)).toEqual({
      title: "Hand over the Sony PS5",
      sub: "Today · RN-24831 · Self pickup",
      who: "Aarav M. · collecting 10:00 – 11:00 am",
      pills: [
        { label: "Aarav is on the way", tone: "success" },
        { label: "Deposit paid", tone: "success" },
      ],
      address: null,
      letKnow: "Let Aarav know",
      codeTitle: "Type Aarav's code",
      codeSub: "Aarav shows it to you after checking the item.",
    });
  });

  it("an owner delivery says where to take it, and the day when it is not today", () => {
    const copy = handoverCopy(
      booking({
        delivery_mode: "owner_delivery",
        customer: { ...booking().customer, address: "Flat 12B, Lodha Bellissimo, Mahalaxmi, Mumbai" },
        day: { ...booking().day, their_status: "i_am_here" },
      }),
      new Date("2026-10-23T10:00:00Z")
    );
    expect(copy.title).toBe("Deliver the Sony PS5");
    expect(copy.sub).toBe("Sat 24 Oct · RN-24831 · Delivery · 3.2 km");
    expect(copy.who).toBe("Aarav M. · expecting you 10:00 – 11:00 am");
    expect(copy.address).toBe("Flat 12B, Lodha Bellissimo, Mahalaxmi, Mumbai");
    // The customer waits on a delivery: their "I am here" is "ready for you".
    expect(copy.pills[0].label).toBe("Aarav is ready for you");
  });

  it("never shows a pickup customer's address", () => {
    expect(handoverCopy(booking({ customer: { ...booking().customer, address: "Somewhere" } }), NOW).address).toBeNull();
  });

  it("walks the three steps: record, check, type the code", () => {
    expect(handoverSteps(booking(), false).map((s) => s.state)).toEqual(["next", "todo", "todo"]);
    // Recorded on this phone, still uploading.
    expect(handoverSteps(booking(), true).map((s) => s.state)).toEqual(["done", "next", "todo"]);
    const both = handoverSteps(booking({ captures: flags(true, true) }), false);
    expect(both.map((s) => s.state)).toEqual(["done", "done", "next"]);
    expect(both[2].label).toBe("Type Aarav's code");
    expect(handoverSteps(booking({ stage: "out", captures: flags(true, true) }), false).every((s) => s.state === "done")).toBe(true);
  });

  it("says to look at the ID when the item needs it", () => {
    // The shop's booking shows the customer's full name from Ready on such a booking (T-44): the owner is told the name.
    const named = booking({ id_match_required: true, customer: { ...booking().customer, full_name: "Aarav Mehta" } });
    expect(handoverSteps(named, false)[0].sub).toBe("Look at Aarav's ID too: the name on it must be Aarav Mehta.");
    // Without it (null, or an answer from before the field): what can be matched is said.
    for (const full_name of [null, undefined, "  "]) {
      expect(handoverSteps(booking({ id_match_required: true, customer: { ...booking().customer, full_name } }), false)[0].sub).toBe(
        "Look at Aarav's ID too: only the first name and last initial are shown, so that is what can be matched."
      );
    }
    expect(handoverSteps(booking(), false)[0].sub).toBeUndefined();
  });
});

describe("SH-09, after the code", () => {
  const out = (over: Record<string, unknown> = {}) =>
    booking({
      stage: "out",
      timeline: [{ event: "handover", label: "Rental started", at: "2026-10-24T05:12:00Z", by: "owner" }],
      captures: flags(true, true),
      ...over,
    });

  it("says when the rental started, the payout in the server's words, the fee and when it is due back", () => {
    expect(startedCopy(out(), new Date("2026-10-24T05:13:00Z"))).toEqual({
      title: "Rental started · 10:42 am",
      payout: "₹1,830 · Sent on the day of handover",
      fee: { struck: "₹92", charged: "₹0" },
      dueBack: "Due back Mon 26 Oct by 8:00 pm",
    });
  });

  it("takes the time from the booking's own handover_at, the timeline only as the fallback", () => {
    expect(startedCopy(out({ handover_at: "2026-10-24T05:20:00Z" }), new Date("2026-10-24T05:25:00Z")).title).toBe("Rental started · 10:50 am");
  });

  it("the payout waits for the owner's own record", () => {
    expect(payoutWaits(out())).toBeNull();
    expect(payoutWaits(out({ captures: flags(false, true) }))).toBe(
      "You are paid once your photos and video of the handover have uploaded."
    );
    // Before the code there is no payout to wait for.
    expect(payoutWaits(booking())).toBeNull();
  });

  it("the payout is pending, and so the record is still asked for, until the record is in or a payout exists (review r1 #1)", () => {
    const noRecord = { captures: flags(false, true) };
    // The code was typed before anything was recorded: pending while out, returned and closed.
    for (const stage of ["out", "returned", "closed"]) expect(payoutPending(out({ stage, ...noRecord }))).toBe(true);
    expect(payoutPending(out())).toBe(false);
    // Renit's desk released the payout by hand (A-46): nothing waits on the record any more.
    const released = out({ ...noRecord, money: { ...booking().money, payout: { ...booking().money.payout, status: "scheduled" } } });
    expect(payoutPending(released)).toBe(false);
    // Before the code, and on a booking that ended early, there is no payout.
    expect(payoutPending(booking())).toBe(false);
    expect(payoutPending(out({ ...noRecord, exit: "no_show", exit_reason: "customer" }))).toBe(false);
  });
});

describe("SH-10, the return", () => {
  const out = (over: Record<string, unknown> = {}) =>
    booking({
      stage: "out",
      timeline: [{ event: "handover", label: "Rental started", at: "2026-10-24T05:12:00Z", by: "owner" }],
      day: { ...booking().day, return_code: "731046" },
      captures: flags(true, true),
      ...over,
    });
  /** Monday 26 October, 6:30 pm in India. */
  const BACK = new Date("2026-10-26T13:00:00Z");

  it("the handover beside today, and the code to show", () => {
    expect(returnCopy(out(), BACK)).toEqual({
      title: "Take the Sony PS5 back",
      sub: "RN-24831 · Aarav M. · Mon 26 Oct",
      late: null,
      handoverDay: "Sat 24",
      returnDay: "Mon 26",
      codeTitle: "Show Aarav this code",
      codeSub:
        "Aarav types it to finish the return. The deposit goes back to Aarav within 48 hours unless you report a problem in the next 24 hours.",
      returned: null,
    });
  });

  it("says so when the item is overdue", () => {
    expect(returnCopy(out(), new Date("2026-10-27T05:00:00Z")).late).toBe(
      "It was due back 8:00 pm on Mon 26 Oct. Each late day's rent comes to you from the deposit."
    );
  });

  it("once the code is in: when, and until when a problem can be reported", () => {
    const returned = out({
      stage: "returned",
      // The server's own rule (P4-10): `can` holds `report_problem` while the report is open.
      can: ["report_problem", "get_help"],
      report_problem_until: "2026-10-27T13:10:00Z",
      timeline: [
        { event: "handover", label: "Rental started", at: "2026-10-24T05:12:00Z", by: "owner" },
        { event: "return", label: "Returned", at: "2026-10-26T13:10:00Z", by: "customer" },
      ],
    });
    const copy = returnCopy(returned, new Date("2026-10-26T13:11:00Z"));
    expect(copy.title).toBe("Sony PS5 is back");
    expect(copy.returned).toEqual({
      title: "Returned · 6:40 pm",
      body: "You can report a problem until 6:40 pm on Tue 27 Oct. If nothing is reported by then, the deposit goes back to Aarav by itself.",
    });
  });

  it("a return staff recorded later says the day it came back, in the heading, the column and the card (T-22)", () => {
    const returned = out({
      stage: "returned",
      can: ["report_problem", "get_help"],
      report_problem_until: "2026-10-27T13:10:00Z",
      came_back_on: "2026-10-25",
      timeline: [
        { event: "handover", label: "Rental started", at: "2026-10-24T05:12:00Z", by: "owner" },
        { event: "return", label: "Returned", at: "2026-10-26T13:10:00Z", by: "staff" },
      ],
    });
    const copy = returnCopy(returned, new Date("2026-10-26T13:11:00Z"));
    expect(copy.returned?.title).toBe("Came back on Sun 25 Oct");
    expect(copy.returnDay).toBe("Sun 25");
    expect(copy.sub).toContain("Sun 25 Oct");
    // Without a named day: the day it was recorded, as before.
    expect(returnCopy({ ...returned, came_back_on: null }, new Date("2026-10-26T13:11:00Z")).returned?.title).toBe("Returned · 6:40 pm");
  });

  it("after late days neither line says the whole deposit goes back: the late days' rent is the shop's (review r1 #3)", () => {
    const lateMoney = { ...booking().money, late_days: 2, late_fee: "1220.00" };
    const late = out({ money: lateMoney });
    expect(returnCopy(late, new Date("2026-10-28T13:00:00Z")).codeSub).toBe(
      "Aarav types it to finish the return. ₹1,220 of the deposit comes to you for 2 late days; the rest goes back to Aarav within 48 hours unless you report a problem in the next 24 hours."
    );
    const returned = out({
      stage: "returned",
      can: ["report_problem", "get_help"],
      money: lateMoney,
      report_problem_until: "2026-10-29T13:10:00Z",
      timeline: [
        { event: "handover", label: "Rental started", at: "2026-10-24T05:12:00Z", by: "owner" },
        { event: "return", label: "Returned", at: "2026-10-28T13:10:00Z", by: "customer" },
      ],
    });
    expect(returnCopy(returned, new Date("2026-10-28T13:11:00Z")).returned?.body).toBe(
      "You can report a problem until 6:40 pm on Thu 29 Oct. ₹1,220 of the deposit comes to you for 2 late days. The rest (₹1,780) goes back to Aarav by itself after that."
    );
    // The late days took all of it.
    const all = out({ stage: "returned", can: ["get_help"], money: { ...booking().money, late_days: 6, late_fee: "3000.00" }, report_problem_until: null });
    expect(returnCopy(all, new Date("2026-11-02T13:11:00Z")).returned?.body).toBe(
      "Nothing is left of the deposit to claim against, so a problem can't be reported here. Use Get help to tell Renit's desk what is wrong. The whole ₹3,000 deposit comes to you for 6 late days. Nothing goes back to Aarav."
    );
    expect(returnCopy(out({ money: { ...booking().money, late_days: 6, late_fee: "3000.00" } }), BACK).codeSub).toBe(
      "Aarav types it to finish the return. The whole ₹3,000 deposit comes to you for 6 late days. Nothing is left of the deposit to claim against: if something is wrong, use Get help."
    );
  });

  it("with no deposit, the code line says nothing is left to claim against and points to Get help, before the code and after it (A-50)", () => {
    const money = { ...booking().money, deposit: "0.00", deposit_state: "none" };
    expect(returnCopy(out({ money }), BACK).codeSub).toBe(
      "Aarav types it to finish the return. Nothing is left of the deposit to claim against: if something is wrong, use Get help."
    );
    // After the code: the same, in the returned card, not "You can report a problem until…".
    const returned = out({ stage: "returned", money, can: ["get_help"], report_problem_until: "2026-10-27T13:10:00Z" });
    expect(returnCopy(returned, new Date("2026-10-26T13:11:00Z")).returned?.body).toBe("Nothing is left of the deposit to claim against, so a problem can't be reported here. Use Get help to tell Renit's desk what is wrong. This rental is finished.");
  });

  it("after a forfeited deposit (`report_problem_until` null, no report_problem in `can`) the return says so and does not fail", () => {
    const money = { ...booking().money, deposit_state: "forfeited" };
    // The item is still out and the 72 hours have passed: the code line says the deposit already came to the shop.
    expect(returnCopy(out({ money, can: ["get_help"] }), BACK).codeSub).toBe(
      "Aarav types it to finish the return. The deposit has already come to you, so there is nothing to claim against: if something is wrong, use Get help."
    );
    expect(reportFirstNote(out({ money, can: ["get_help"] }))).toContain("The deposit has already come to you");
    // Closed once the item came back: no time, no report, and the card still draws.
    const closed = out({ stage: "closed", money, can: ["get_help"], report_problem_until: null });
    expect(() => returnCopy(closed, new Date("2026-10-29T10:00:00Z"))).not.toThrow();
    expect(returnCopy(closed, new Date("2026-10-29T10:00:00Z")).returned?.body).toContain("The deposit has already come to you");
  });

  it("after the code, the card says which reason it is when the server does not offer the report, and never promises the 24 hours", () => {
    const base = { stage: "returned", can: ["get_help"] as string[], report_problem_until: "2026-10-27T13:10:00Z" };
    const body = (over: Record<string, unknown>, now = new Date("2026-10-26T13:11:00Z")) => returnCopy(out({ ...base, ...over }), now).returned?.body;
    // A damage claim is already made: its part of the deposit waits, the rest goes back.
    expect(body({ claim_open: true, claims: [12] })).toBe(
      "A problem has already been reported on this booking. Its claim is listed on the booking. The part of the deposit that is not claimed goes back to Aarav."
    );
    // The customer's fault report is a claim too, but not the shop's: with the kinds known, the time that has passed reads as passed.
    const faultOnly = returnCopy(out({ ...base, claim_open: true, claims: [12] }), new Date("2026-10-28T00:00:00Z"), ["fault"]).returned?.body;
    expect(faultOnly).toBe(
      "The time to report a problem has passed. Use Get help to talk to Renit's desk. The deposit is settled with Aarav once both return records are in."
    );
    // The time is over.
    expect(body({}, new Date("2026-10-28T00:00:00Z"))).toBe(
      "The time to report a problem has passed. Use Get help to talk to Renit's desk. The deposit is settled with Aarav once both return records are in."
    );
    // Offered: the time, from the server's `report_problem_until`.
    expect(body({ can: ["report_problem", "get_help"] })).toBe(
      "You can report a problem until 6:40 pm on Tue 27 Oct. If nothing is reported by then, the deposit goes back to Aarav by itself."
    );
  });

  it("the steps, and the code before the report (A-35)", () => {
    expect(shopReturnSteps(out({ captures: flags(true, true, false, false) }), false).map((s) => s.state)).toEqual(["next", "todo", "todo"]);
    expect(shopReturnSteps(out({ captures: flags(true, true, true, true) }), false).map((s) => s.state)).toEqual(["done", "next", "todo"]);
    expect(shopReturnSteps(out({ stage: "returned", captures: flags(true, true, true, true) }), false).every((s) => s.state === "done")).toBe(true);
    expect(reportFirstNote(out())).toBe(
      "Finish the return first: show Aarav the code. You then have 24 hours to report the problem, with these photos as the record."
    );
    // Nothing left of the deposit: said before the code, with the way on.
    expect(reportFirstNote(out({ money: { ...booking().money, deposit: "0.00", deposit_state: "none" } }))).toBe(
      "Finish the return first: show Aarav the code. Nothing is left of the deposit to claim against, so a problem can't be reported here. Use Get help to tell Renit's desk what is wrong."
    );
  });
});
