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
    expect(handoverSteps(booking({ id_match_required: true }), false)[0].sub).toBe(
      "Look at Aarav's ID too: the name must match the booking."
    );
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
      body: "You can report a problem until 6:40 pm on Tue 27 Oct. After that the deposit goes back to Aarav.",
    });
  });

  it("after late days neither line says the whole deposit goes back: the late days' rent is the shop's (review r1 #3)", () => {
    const lateMoney = { ...booking().money, late_days: 2, late_fee: "1220.00" };
    const late = out({ money: lateMoney });
    expect(returnCopy(late, new Date("2026-10-28T13:00:00Z")).codeSub).toBe(
      "Aarav types it to finish the return. ₹1,220 of the deposit comes to you for 2 late days; the rest goes back to Aarav within 48 hours unless you report a problem in the next 24 hours."
    );
    const returned = out({
      stage: "returned",
      money: lateMoney,
      report_problem_until: "2026-10-29T13:10:00Z",
      timeline: [
        { event: "handover", label: "Rental started", at: "2026-10-24T05:12:00Z", by: "owner" },
        { event: "return", label: "Returned", at: "2026-10-28T13:10:00Z", by: "customer" },
      ],
    });
    expect(returnCopy(returned, new Date("2026-10-28T13:11:00Z")).returned?.body).toBe(
      "You can report a problem until 6:40 pm on Thu 29 Oct. ₹1,220 of the deposit comes to you for 2 late days. The rest (₹1,780) goes back to Aarav after that."
    );
    // The late days took all of it.
    const all = out({ stage: "returned", money: { ...booking().money, late_days: 6, late_fee: "3000.00" }, report_problem_until: null });
    expect(returnCopy(all, new Date("2026-11-02T13:11:00Z")).returned?.body).toBe(
      "The whole ₹3,000 deposit comes to you for 6 late days. Nothing goes back to Aarav."
    );
    expect(returnCopy(out({ money: { ...booking().money, late_days: 6, late_fee: "3000.00" } }), BACK).codeSub).toBe(
      "Aarav types it to finish the return. The whole ₹3,000 deposit comes to you for 6 late days. You then have 24 hours to report a problem."
    );
  });

  it("with no deposit, the code line does not promise one back", () => {
    const free = out({ money: { ...booking().money, deposit: "0.00", deposit_state: "none" } });
    expect(returnCopy(free, BACK).codeSub).toBe(
      "Aarav types it to finish the return. You then have 24 hours to report a problem."
    );
  });

  it("the steps, and the code before the report (A-35)", () => {
    expect(shopReturnSteps(out({ captures: flags(true, true, false, false) }), false).map((s) => s.state)).toEqual(["next", "todo", "todo"]);
    expect(shopReturnSteps(out({ captures: flags(true, true, true, true) }), false).map((s) => s.state)).toEqual(["done", "next", "todo"]);
    expect(shopReturnSteps(out({ stage: "returned", captures: flags(true, true, true, true) }), false).every((s) => s.state === "done")).toBe(true);
    expect(reportFirstNote(out())).toBe(
      "Finish the return first: show Aarav the code. You then have 24 hours to report the problem, with these photos as the record."
    );
  });
});
