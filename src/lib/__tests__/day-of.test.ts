import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import type { BookingCustomer } from "../booking";
import {
  MAX_EXTRA_DAYS,
  activeCopy,
  callCopy,
  captured,
  codeErrorText,
  codeIsClosed,
  dayBlock,
  dayErrorText,
  dayOfCopy,
  depositCharge,
  depositCopy,
  depositOverdue,
  extensionDays,
  extensionLines,
  mapsUrl,
  noShowCopy,
  ownerAbsentAt,
  ownerAbsentKey,
  ownerAbsentNote,
  reached,
  refuseCopy,
  refuseHold,
  reportCopy,
  returnSteps,
  returnedCopy,
  statusButtons,
  statusNote,
  telUrl,
  theirStatusLine,
  travels,
  whenShort,
} from "../day-of";

/** The contract's example booking (RN-24831): a PS5, Sat 24 to Mon 26 October, self pickup, window 10 to 11 am. */
const booking = (over: Partial<BookingCustomer> = {}, moneyOver: Partial<BookingCustomer["money"]> = {}): BookingCustomer => ({
  number: "RN-24831",
  stage: "ready",
  ring_state: "",
  exit: "",
  exit_reason: "",
  is_open: true,
  product: { name: "PRO_8fk2Lq", title: "Sony PS5", cover_image: null },
  shop: {
    name: "SoundBox Rentals",
    locality: "Andheri West, Mumbai",
    hours_first_day: { open: "10:00", close: "20:00" },
    hours_last_day: { open: "10:00", close: "20:00" },
    opens_at: null,
    address: "Shop 4, Lokhandwala Complex, Andheri West, Mumbai 400053",
    coordinates: { lat: 19.1364, long: 72.8296 },
  },
  first_day: "2026-10-24",
  last_day: "2026-10-26",
  days: 3,
  delivery_mode: "pickup",
  distance_km: "3.2",
  delivery_address: null,
  money: {
    rate: "610.00",
    rent: "1830.00",
    delivery_fee: "0.00",
    fee_shown: "92.00",
    fee_charged: "0.00",
    total: "1830.00",
    booking_amount: "99.00",
    booking_amount_state: "paid",
    pay_after_accept: "1731.00",
    rent_pay_minutes: 30,
    rent_due_at: null,
    rent_paid: true,
    deposit: "3000.00",
    deposit_with_rent: false,
    deposit_state: "paid",
    deposit_ask_at: "2026-10-23T04:30:00Z",
    deposit_due_at: "2026-10-24T02:30:00Z",
    deposit_refund_due_at: null,
    late_days: 0,
    late_fee: "0.00",
    damage_deduction: "0.00",
    ...moneyOver,
  },
  pay_now: null,
  payments: [],
  pick_deadline_at: null,
  cancels_left_today: 3,
  window: { start: "2026-10-24T04:30:00Z", end: "2026-10-24T05:30:00Z" },
  window_request: null,
  return_by: "2026-10-26T14:30:00Z",
  report_fault_until: null,
  id_match_required: false,
  day: {
    call_number: "+919876543210",
    call_from: "2026-10-24T02:30:00Z",
    my_status: "",
    their_status: "",
    no_show_from: "2026-10-24T06:00:00Z",
    handover_code: "482193",
  },
  captures: { handover: { mine: false, theirs: false }, return: { mine: false, theirs: false } },
  claim_open: false,
  claims: [],
  extends: null,
  extensions: [],
  can: ["set_status", "no_show", "refuse_at_door", "capture_handover", "get_help"],
  timeline: [],
  created_at: "2026-10-12T04:11:00Z",
  server_time: "2026-10-24T03:50:00Z",
  ...over,
});

/** Saturday 24 October 2026, 9:20 am in India: the day of the handover, calls open. */
const NOW = new Date("2026-10-24T03:50:00Z");
/** The evening before. */
const EVE = new Date("2026-10-23T13:30:00Z");

const err = (code: string | null, status = 409, details: Record<string, unknown> | null = null): ApiError => ({
  status,
  code,
  message: null,
  details,
});

describe("the three preset buttons (A-36)", () => {
  it("the side that travels sees all three", () => {
    expect(travels("customer", "pickup")).toBe(true);
    expect(travels("owner", "owner_delivery")).toBe(true);
    expect(statusButtons("customer", "pickup")).toEqual([
      { status: "on_my_way", label: "On my way" },
      { status: "running_late", label: "Running late" },
      { status: "i_am_here", label: "I am here" },
    ]);
    expect(statusButtons("owner", "owner_delivery").map((b) => b.status)).toEqual(["on_my_way", "running_late", "i_am_here"]);
  });

  it("the side that waits sees two, and its `i_am_here` reads Ready for you", () => {
    expect(statusButtons("owner", "pickup")).toEqual([
      { status: "i_am_here", label: "Ready for you" },
      { status: "running_late", label: "Running late" },
    ]);
    expect(statusButtons("customer", "owner_delivery").map((b) => b.label)).toEqual(["Ready for you", "Running late"]);
  });

  it("only ever sends the contract's three values", () => {
    const all = [
      ...statusButtons("customer", "pickup"),
      ...statusButtons("owner", "pickup"),
      ...statusButtons("customer", "owner_delivery"),
      ...statusButtons("owner", "owner_delivery"),
    ].map((b) => b.status);
    expect(new Set(all)).toEqual(new Set(["on_my_way", "running_late", "i_am_here"]));
  });

  it("says the other side's last tap in the words that fit who travels", () => {
    // Self pickup: the customer travels, the shop waits.
    expect(theirStatusLine("customer", "pickup", "i_am_here", "The shop")).toBe("The shop is ready for you");
    expect(theirStatusLine("owner", "pickup", "on_my_way", "Aarav")).toBe("Aarav is on the way");
    expect(theirStatusLine("owner", "pickup", "i_am_here", "Aarav")).toBe("Aarav is here");
    // Owner delivery: the shop travels, the customer waits.
    expect(theirStatusLine("customer", "owner_delivery", "i_am_here", "The shop")).toBe("The shop is here");
    expect(theirStatusLine("owner", "owner_delivery", "i_am_here", "Aarav")).toBe("Aarav is ready for you");
    expect(theirStatusLine("customer", "pickup", "running_late", "The shop")).toBe("The shop is running late");
    expect(theirStatusLine("customer", "pickup", "", "The shop")).toBeNull();
  });

  it("open from two hours before the window, by the server's time", () => {
    const day = booking().day;
    expect(statusNote(day, NOW)).toBeNull();
    expect(statusNote(day, EVE)).toBe("These open at 8:00 am on Sat 24 Oct.");
    expect(statusNote(day, new Date("2026-10-24T02:00:00Z"))).toBe("These open at 8:00 am.");
    expect(statusNote({ call_from: null }, NOW)).toBe("These open once an arrival window is picked.");
  });
});

describe("times", () => {
  it("an instant has come or it has not; a missing one has not", () => {
    expect(reached("2026-10-24T03:50:00Z", NOW)).toBe(true);
    expect(reached("2026-10-24T03:50:01Z", NOW)).toBe(false);
    expect(reached(null, NOW)).toBe(false);
    expect(reached("nonsense", NOW)).toBe(false);
  });

  it("says the day only when it is not today", () => {
    expect(whenShort("2026-10-24T06:00:00Z", NOW)).toBe("11:30 am");
    expect(whenShort("2026-10-24T06:00:00Z", EVE)).toBe("11:30 am on Sat 24 Oct");
    expect(whenShort(null, NOW)).toBe("");
  });
});

describe("Call", () => {
  it("dials the number the server gives, and says until when", () => {
    expect(callCopy("customer", booking().day, "the shop", NOW)).toEqual({
      label: "Call the shop",
      number: "+919876543210",
      note: "Calls are open until you have the item",
    });
    expect(callCopy("owner", booking().day, "Aarav", NOW)).toMatchObject({
      label: "Call Aarav",
      note: "Calls are open until the handover",
    });
  });

  it("has no number before its time, and says from when", () => {
    const day = { call_number: null, call_from: "2026-10-24T02:30:00Z" };
    expect(callCopy("customer", day, "the shop", EVE)).toEqual({
      label: "Call the shop",
      number: null,
      note: "Calls open from 8:00 am on Sat 24 Oct until you have the item",
    });
    expect(callCopy("owner", { call_number: null, call_from: null }, "Aarav", NOW).note).toBe(
      "Calls open shortly before the arrival window"
    );
  });

  it("makes a link the phone can dial", () => {
    expect(telUrl("+91 98765-43210")).toBe("tel:+919876543210");
    expect(telUrl("09876 543210")).toBe("tel:09876543210");
  });
});

describe("They did not come", () => {
  it("opens thirty minutes after the window, by the server's time", () => {
    const day = booking().day;
    expect(noShowCopy("customer", day, "The shop", NOW)).toEqual({
      open: false,
      title: "The shop isn't here?",
      sub: "You can report it from 11:30 am, once the window has ended. You get everything back.",
    });
    expect(noShowCopy("customer", day, "The shop", new Date("2026-10-24T06:00:00Z"))).toMatchObject({
      open: true,
      sub: "Report it with a photo taken on the spot. You get everything back.",
    });
  });

  it("the shop's row names the customer and what comes to the shop", () => {
    expect(noShowCopy("owner", booking().day, "Aarav", NOW)).toMatchObject({
      title: "Aarav hasn't come?",
      sub: "You can report it from 11:30 am, once the window has ended. One day's rent comes to you.",
    });
    expect(noShowCopy("owner", { no_show_from: null }, "Aarav", NOW).open).toBe(false);
  });

  it("the report screen says what happens to the money", () => {
    expect(reportCopy("no_show", "customer", "The shop", "pickup").body).toMatch(/everything you paid comes back/);
    const shop = reportCopy("no_show", "owner", "Aarav", "owner_delivery");
    expect(shop.title).toBe("Aarav did not come");
    expect(shop.body).toMatch(/one day's rent comes to you, with the delivery fee if you travelled, and the rest goes back to Aarav/);
    expect(reportCopy("no_show", "owner", "Aarav", "pickup").body).not.toMatch(/delivery fee/);
    const absent = reportCopy("owner_absent", "customer", "The shop", "pickup");
    expect(absent.header).toBe("Return");
    expect(absent.body).toMatch(/Late charges stop/);
  });
});

describe("codes (A-16)", () => {
  it("a wrong code says how many tries are left", () => {
    expect(codeErrorText(err("wrong_code", 409, { tries_left: 2 }), NOW)).toBe("That code is not right. 2 tries left.");
    expect(codeErrorText(err("wrong_code", 409, { tries_left: 1 }), NOW)).toBe("That code is not right. 1 try left.");
    expect(codeErrorText(err("wrong_code"), NOW)).toBe("That code is not right.");
  });

  it("a lock says until when, in India time", () => {
    expect(codeErrorText(err("code_locked", 409, { until: "2026-10-24T04:50:00Z" }), NOW)).toBe(
      "Too many wrong tries. Try again at 10:20 am."
    );
    expect(codeErrorText(err("code_locked"), NOW)).toMatch(/in a few minutes/);
  });

  it("a closed code stops the asking and points to the desk", () => {
    const closed = err("code_closed");
    expect(codeIsClosed(closed)).toBe(true);
    expect(codeIsClosed(err("code_locked"))).toBe(false);
    expect(codeErrorText(closed, NOW)).toMatch(/desk/);
  });

  it("too early, an open claim, a booking that moved on, and no answer", () => {
    expect(codeErrorText(err("too_early", 409, { from: "2026-10-24T02:30:00Z" }), EVE)).toBe(
      "The rental can be started from 8:00 am on Sat 24 Oct."
    );
    expect(codeErrorText(err("claim_open"), NOW)).toMatch(/paused until Renit decides/);
    expect(codeErrorText(err("stage_not_allowed"), NOW)).toMatch(/moved on/);
    expect(codeErrorText(null, NOW)).toMatch(/connection/);
    expect(codeErrorText(err(null, 0), NOW)).toMatch(/connection/);
  });

  it("what any other refused tap says", () => {
    expect(dayErrorText(err("too_early", 409, { from: "2026-10-24T06:00:00Z" }), NOW)).toBe("This opens at 11:30 am.");
    expect(dayErrorText(err("claim_open"), NOW)).toMatch(/Renit's decision comes first/);
    expect(dayErrorText(err("window_required"), NOW)).toBe("Pick your arrival window first.");
    // "Not as described" sends ten photos at most; a refusal of its files is said as the server says it.
    const refused = (fields: Record<string, string[]>) => err("validation_error", 400, { fields });
    expect(dayErrorText(refused({ photos: ["Ensure this field has no more than 10 elements."] }), NOW)).toBe("Ensure this field has no more than 10 elements.");
    expect(dayErrorText(refused({}), NOW)).toBe("Something is missing. Check the photo and the words, then try again.");
    expect(dayErrorText(err("nothing_to_pay"), NOW)).toMatch(/no deposit left/);
    expect(dayErrorText(err("payments_unavailable", 503), NOW)).toMatch(/Nothing was charged/);
    expect(dayErrorText(err("already_extending"), NOW)).toMatch(/already open/);
    expect(dayErrorText(err("shop_closed"), NOW)).toMatch(/closed now/);
    expect(dayErrorText(err("too_late_to_extend"), NOW)).toMatch(/too close/);
    expect(dayErrorText(null, NOW)).toMatch(/connection/);
  });
});

describe("BK-13, the deposit", () => {
  const due = () => booking({ stage: "confirmed" }, { deposit_state: "due" });

  it("says how much, by when, and what paying unlocks", () => {
    expect(depositCopy(due())).toEqual({
      state: "to_pay",
      sub: "Sony PS5 · RN-24831",
      amount: "₹3,000",
      refund: "Refundable. Back within 48 hours of closing.",
      payBy: "Pay by Sat 24 Oct, 8:00 am",
      when: "Collecting Sat 24 Oct, 10:00 – 11:00 am",
      unlocks: "Paying the deposit shows you the shop's address and unlocks your handover code.",
      warning: "If it isn't paid by then, the booking is cancelled and one day's rent (₹610) goes to the shop.",
      button: "Pay ₹3,000",
    });
  });

  it("an owner delivery arrives, and has no shop address to show", () => {
    const copy = depositCopy(booking({ stage: "confirmed", delivery_mode: "owner_delivery" }, { deposit_state: "not_due" }));
    expect(copy.when).toBe("Arriving Sat 24 Oct, 10:00 – 11:00 am");
    expect(copy.unlocks).toBe("Paying the deposit unlocks your handover code.");
    // It may be paid before Renit asks for it.
    expect(copy.state).toBe("to_pay");
  });

  it("asks for the arrival window first", () => {
    expect(depositCopy(booking({ stage: "confirmed", window: null }, { deposit_state: "due" })).state).toBe("window_first");
  });

  it("is paid, carried, or nothing to pay", () => {
    expect(depositCopy(booking()).state).toBe("paid");
    expect(depositCopy(booking({}, { deposit_state: "carried" })).state).toBe("paid");
    expect(depositCopy(booking({}, { deposit_state: "none", deposit: "0.00" })).state).toBe("none");
    expect(depositCopy(booking({ exit: "cancelled_by_customer" }, { deposit_state: "due" })).state).toBe("none");
  });

  it("the sum on the button is the open payment's when there is one", () => {
    expect(depositCharge(due())).toEqual({ amount: "3000.00" });
    const open = due();
    open.pay_now = {
      purpose: "deposit",
      amount: "3000.00",
      deposit_part: "3000.00",
      due_at: "2026-10-24T02:30:00Z",
      payment: {
        payment_id: "pay_01",
        purpose: "deposit",
        amount: "3200.00",
        deposit_part: "3200.00",
        checkout_url: "https://pay.test/c/1",
        expires_at: "2026-10-24T02:30:00Z",
        return_url: "renit://pay/return",
      },
    };
    expect(depositCharge(open)).toEqual({ amount: "3200.00" });
    // A rent payment that is open is not the deposit's.
    open.pay_now = { ...open.pay_now, purpose: "rent" };
    expect(depositCharge(open)).toEqual({ amount: "3000.00" });
  });
});

describe("BK-14, the day of the handover", () => {
  it("collect today, with the shop's address and the window", () => {
    expect(dayOfCopy(booking(), NOW)).toEqual({
      title: "Collect your Sony PS5 today",
      place: { name: "SoundBox Rentals", address: "Shop 4, Lokhandwala Complex, Andheri West, Mumbai 400053" },
      window: "10:00 – 11:00 am",
      codeNote: "Show this to the shop only after you have checked the item and both of you have recorded its condition.",
    });
  });

  it("says the day when it is not today", () => {
    expect(dayOfCopy(booking(), EVE).title).toBe("Collect your Sony PS5 tomorrow");
    expect(dayOfCopy(booking(), new Date("2026-10-20T04:00:00Z")).title).toBe("Collect your Sony PS5 on Sat 24 Oct");
  });

  it("an owner delivery names where it is brought", () => {
    const copy = dayOfCopy(
      booking({
        delivery_mode: "owner_delivery",
        delivery_address: {
          id: 17,
          address: "Lodha Bellissimo, Mahalaxmi, Mumbai",
          address_line_1: "Flat 12B",
          address_line_2: "Opposite the race course",
          locality: "Mahalaxmi, Mumbai",
          address_type: "home",
          label: "",
          coordinates: { lat: 18.9827, long: 72.8205 },
        } as BookingCustomer["delivery_address"],
      }),
      NOW
    );
    expect(copy.title).toBe("Your Sony PS5 arrives today");
    expect(copy.place.name).toBe("SoundBox Rentals brings it to Home");
    expect(copy.place.address).toBeTruthy();
  });

  it("never draws an address that is not text, and pauses the code while a report is open", () => {
    const odd = booking();
    (odd.shop as { address: unknown }).address = { line: "x" };
    expect(dayOfCopy(odd, NOW).place.address).toBe("Andheri West, Mumbai");
    expect(dayOfCopy(booking({ claim_open: true }), NOW).codeNote).toMatch(/paused until then/);
  });

  it("reads through a booking that came without its day block or its flags", () => {
    const old = booking();
    delete (old as Partial<BookingCustomer>).day;
    delete (old as Partial<BookingCustomer>).captures;
    expect(dayBlock(old)).toEqual({
      call_number: null,
      call_from: null,
      my_status: "",
      their_status: "",
      no_show_from: null,
      handover_code: null,
    });
    expect(captured(old, "handover")).toEqual({ mine: false, theirs: false });
    expect(captured(booking({ captures: { handover: { mine: true, theirs: false }, return: { mine: false, theirs: false } } }), "handover").mine).toBe(true);
  });

  it("opens the shop's pin in the phone's maps", () => {
    expect(mapsUrl({ lat: 19.1364, long: 72.8296 }, "SoundBox Rentals", true)).toBe(
      "http://maps.apple.com/?ll=19.1364,72.8296&q=SoundBox%20Rentals"
    );
    expect(mapsUrl({ lat: 19.1364, long: 72.8296 }, "SoundBox Rentals", false)).toBe(
      "geo:19.1364,72.8296?q=19.1364,72.8296(SoundBox%20Rentals)"
    );
    expect(mapsUrl(null, "SoundBox Rentals", true)).toBeNull();
  });
});

describe("BK-19, not as described", () => {
  it("says what Renit's decision does to the money, with the booking's own sums", () => {
    expect(refuseCopy(booking(), 6)).toEqual({
      notice:
        "Renit decides within one day. If we agree, you get everything back, including the ₹99. If we don't, it counts as cancelling inside 24 hours and one day's rent (₹610) goes to the shop.",
      attachedNote: "The 6 you just took",
    });
    expect(refuseCopy(booking(), 0).attachedNote).toBeNull();
  });

  it("needs the words and at least one photo", () => {
    expect(refuseHold("  ", 6)).toBe("Say what is different from the listing.");
    expect(refuseHold("The lens is scratched.", 0)).toBe("Add at least one photo.");
    expect(refuseHold("The lens is scratched.", 1)).toBeNull();
  });
});

describe("BK-20, the rental", () => {
  const out = (over: Partial<BookingCustomer> = {}, m: Partial<BookingCustomer["money"]> = {}) => booking({ stage: "out", ...over }, m);

  it("when it is due back and what a late day costs", () => {
    expect(activeCopy(out())).toEqual({
      title: "You have the Sony PS5",
      sub: "RN-24831 · SoundBox Rentals",
      returnBy: "Return by Mon 26 Oct, 8:00 pm",
      late: { text: "Each late day costs ₹610, taken from your deposit.", tone: "info" },
      deposit: { amount: "₹3,000", sub: "Held by Renit · back within 48 hours of closing" },
      button: "Return the Sony PS5",
    });
  });

  it("the late-days notice: how late, and what it has cost so far (N11)", () => {
    expect(activeCopy(out({}, { late_days: 2, late_fee: "1220.00" })).late).toEqual({
      text: "2 days late so far: ₹1,220 comes off your deposit. Each more day costs ₹610.",
      tone: "warning",
    });
    expect(activeCopy(out({}, { late_days: 1, late_fee: "610.00" })).late.text).toMatch(/^1 day late so far/);
  });

  it("with no deposit there is no deposit card, and late days are not said to come off one", () => {
    const copy = activeCopy(out({}, { deposit: "0.00", deposit_state: "none" }));
    expect(copy.deposit).toBeNull();
    expect(copy.late.text).toBe("Each late day costs ₹610.");
  });

  it("an extension's deposit is the first booking's", () => {
    expect(activeCopy(out({ extends: "RN-24700" }, { deposit_state: "carried" })).deposit?.sub).toMatch(/^Carried over/);
  });
});

describe("BK-21, the return", () => {
  const out = (mine: boolean, theirs: boolean) =>
    booking({ stage: "out", captures: { handover: { mine: true, theirs: true }, return: { mine, theirs } } });

  it("walks the three steps in order", () => {
    expect(returnSteps(out(false, false), false).map((s) => s.state)).toEqual(["next", "todo", "todo"]);
    // Recorded on this phone, still uploading: the first step is done.
    expect(returnSteps(out(false, false), true).map((s) => s.state)).toEqual(["done", "next", "todo"]);
    const both = returnSteps(out(true, true), false);
    expect(both.map((s) => s.state)).toEqual(["done", "done", "next"]);
    expect(both[2]).toMatchObject({ label: "Type the shop's code", sub: "The shop shows you a 6-digit code" });
  });

  it("is all done once the code is in", () => {
    const steps = returnSteps(booking({ stage: "returned" }), false);
    expect(steps.map((s) => s.state)).toEqual(["next", "done", "done"]);
    expect(returnSteps(booking({ stage: "returned" }), true).every((s) => s.state === "done")).toBe(true);
  });

  it("says what happens next, with the time of the return from the timeline", () => {
    const returned = booking({
      stage: "returned",
      timeline: [{ event: "return", label: "Returned", at: "2026-10-26T13:10:00Z", by: "customer" }],
    });
    expect(returnedCopy(returned)).toEqual({
      title: "Returned Mon 26 Oct, 6:40 pm.",
      body: "Your deposit of ₹3,000 comes back within 48 hours, unless the shop reports a problem in the next 24 hours.",
    });
    expect(returnedCopy(booking({ stage: "returned" }, { deposit: "0.00", deposit_state: "none" }))).toEqual({
      title: "Returned.",
      body: "The shop has 24 hours to report a problem. After that the rental is closed.",
    });
  });
});

describe("after a late return (review r1 #3)", () => {
  const returned = (m: Partial<BookingCustomer["money"]>) =>
    booking(
      { stage: "returned", timeline: [{ event: "return", label: "Returned", at: "2026-10-28T13:10:00Z", by: "customer" }] },
      { deposit_state: "paid", ...m }
    );

  it("says what is kept for the late days and what comes back, not the whole deposit", () => {
    expect(returnedCopy(returned({ late_days: 2, late_fee: "1220.00" })).body).toBe(
      "Your deposit is ₹3,000. ₹1,220 is kept for 2 late days, and ₹1,780 comes back within 48 hours, unless the shop reports a problem in the next 24 hours."
    );
    expect(returnedCopy(returned({ late_days: 1, late_fee: "610.00" })).body).toMatch(/₹610 is kept for 1 late day, and ₹2,390 comes back/);
  });

  it("says so when nothing comes back", () => {
    expect(returnedCopy(returned({ late_days: 5, late_fee: "3000.00" })).body).toBe(
      "Your ₹3,000 deposit is kept for 5 late days. Nothing comes back."
    );
  });

  it("keeps the plain line when the return was on time", () => {
    expect(returnedCopy(returned({})).body).toBe(
      "Your deposit of ₹3,000 comes back within 48 hours, unless the shop reports a problem in the next 24 hours."
    );
  });
});

describe("Owner did not come, once reported (review r1 #11)", () => {
  const reported = booking({
    stage: "out",
    timeline: [{ event: "report_owner_absent", label: "Reported: the shop was not there", at: "2026-10-26T12:35:00Z", by: "customer" }],
  });
  /** That evening. */
  const LATER = new Date("2026-10-26T15:00:00Z");

  it("is read from the booking's timeline, or from this phone's note of a report just sent", () => {
    expect(ownerAbsentAt(reported)).toBe("2026-10-26T12:35:00Z");
    expect(ownerAbsentAt(booking({ stage: "out" }))).toBeNull();
    expect(ownerAbsentAt(booking({ stage: "out" }), "2026-10-26T12:36:00Z")).toBe("2026-10-26T12:36:00Z");
    expect(ownerAbsentKey("RN-24831")).toEqual(["owner-absent-reported", "RN-24831"]);
  });

  it("the rental screen says it was reported, in place of the late-day line", () => {
    const copy = activeCopy(reported, ownerAbsentAt(reported), LATER);
    expect(copy.late).toEqual({
      text: "You told Renit the shop was not there (6:05 pm). Late charges stopped then, and Renit's staff will arrange the return. Keep the item safe until they call.",
      tone: "info",
    });
    expect(ownerAbsentNote("2026-10-26T12:35:00Z", new Date("2026-10-27T05:00:00Z"))).toMatch(/\(6:05 pm on Mon 26 Oct\)/);
    // Not reported: the late-day line as before.
    expect(activeCopy(booking({ stage: "out" })).late.text).toBe("Each late day costs ₹610, taken from your deposit.");
  });
});

describe("the deposit's last moment (review r1 #9)", () => {
  it("has passed by the server's clock, or has not", () => {
    const due = booking({ stage: "confirmed" }, { deposit_state: "due" });
    expect(depositOverdue(due, new Date("2026-10-24T02:29:59Z"))).toBe(false);
    expect(depositOverdue(due, new Date("2026-10-24T02:30:00Z"))).toBe(true);
    expect(depositOverdue(booking({ stage: "confirmed" }, { deposit_due_at: null }), NOW)).toBe(false);
  });
});

describe("extending", () => {
  it("starts the day after the last day", () => {
    expect(extensionDays("2026-10-26", 3)).toEqual({ first_day: "2026-10-27", last_day: "2026-10-29" });
    expect(extensionDays("2026-10-31", 1)).toEqual({ first_day: "2026-11-01", last_day: "2026-11-01" });
  });

  it("keeps the count between one day and the most the stepper offers", () => {
    expect(extensionDays("2026-10-26", 0).last_day).toBe("2026-10-27");
    expect(extensionDays("2026-10-26", 999).last_day).toBe(extensionDays("2026-10-26", MAX_EXTRA_DAYS).last_day);
  });

  it("says the deposit carries on and what a refusal means", () => {
    const lines = extensionLines("99.00");
    expect(lines[0]).toMatch(/deposit carries on/);
    expect(lines[1]).toMatch(/₹99 comes back and the item is due back on the original day/);
  });
});
