import { describe, expect, it } from "@jest/globals";
import {
  BookingCustomer,
  Quote,
  bookErrorText,
  bookRefusalIsFinal,
  bookingAmountCopy,
  bookingBanner,
  bookingHow,
  bookingView,
  cancelCopy,
  cancelErrorText,
  cancelHint,
  moneyRowView,
  payRentCopy,
  payRentErrorText,
  paymentRows,
  pollEveryMs,
  rentCharge,
  sameCharge,
  timeLeft,
  triedText,
  timelineRows,
  windowErrorText,
  windowHeading,
  windowLabel,
  windowRequestCopy,
  windowSummary,
  isRinging,
  outcomeCopy,
  ringCopy,
  bookLabel,
  bookedDays,
  BOOKING_DAYS_AHEAD,
  blockerText,
  daysRefusal,
  lastBookableDay,
  clock,
  datesBlocker,
  datesLine,
  dayCount,
  dayLong,
  dayShort,
  deliveryOption,
  depositAfterLate,
  lateDaysLabel,
  deliveryPlace,
  getItLine,
  handoverLine,
  howLabel,
  idCheckCopy,
  liveCopy,
  morningNotice,
  payButtonLabel,
  payPhaseText,
  paySteps,
  plainLines,
  priceLines,
  rangeIsFree,
  rangeLabel,
  rentalNextLine,
  rentalSubLine,
  rentalsEmpty,
  stagePill,
  reviewBlocker,
  searchedDays,
  shopNameOf,
  tapDay,
  termsTicked,
  timeAndDay,
  todayIst,
  totalLabel,
} from "../booking";

/** The contract's example quote: a PS5 for Sat 24 to Mon 26 October, self pickup. */
const quote = (over: Partial<Quote> = {}): Quote => ({
  product: "PRO_8fk2Lq",
  first_day: "2026-10-24",
  last_day: "2026-10-26",
  days: 3,
  delivery_mode: "pickup",
  rate: "610.00",
  rent: "1830.00",
  delivery: { status: "not_asked", fee: "0.00", distance_km: "3.2", offer_pickup: false },
  fee_shown: "92.00",
  fee_charged: "0.00",
  total: "1830.00",
  pay_now: "99.00",
  pay_after_accept: "1731.00",
  rent_pay_minutes: 30,
  deposit: { amount: "3000.00", with_rent: false, due_on: "2026-10-23", refundable: true },
  units_free: 3,
  shop: { is_open: true, opens_at: null, book_for_morning: false, hours_first_day: { open: "10:00", close: "20:00" } },
  id_check: { needed: "id", passed: true },
  terms: { version: "2026-10", url: "https://simplyrenit.com/terms/rental", accepted: false },
  can_book: false,
  blockers: ["terms_not_accepted"],
  ...over,
});

/** The contract's example booking (RN-24831), moved to wherever a test needs it. */
const booking = (over: Partial<BookingCustomer> = {}, moneyOver: Partial<BookingCustomer["money"]> = {}): BookingCustomer => ({
  number: "RN-24831",
  stage: "confirmed",
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
    address: null,
    coordinates: null,
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
    deposit_state: "not_due",
    deposit_ask_at: "2026-10-23T04:30:00Z",
    deposit_due_at: "2026-10-24T02:30:00Z",
    deposit_refund_due_at: null,
    late_days: 0,
    late_fee: "0.00",
    damage_deduction: "0.00",
    ...moneyOver,
  },
  pay_now: null,
  payments: [
    {
      id: "pay_01",
      kind: "payment",
      what: "booking_amount",
      amount: "99.00",
      status: "paid",
      text: "UPI asha@okhdfcbank",
      expected_days_min: null,
      expected_days_max: null,
      expected_by: null,
      at: "2026-10-13T04:11:00Z",
    },
  ],
  pick_deadline_at: null,
  tried: { ring: true, second_ring: false, staff_call: false },
  cancels_left_today: 3,
  window: { start: "2026-10-24T04:30:00Z", end: "2026-10-24T05:30:00Z" },
  window_request: null,
  return_by: "2026-10-26T14:30:00Z",
  report_fault_until: null,
  id_match_required: false,
  day: {
    call_number: null,
    call_from: "2026-10-24T02:30:00Z",
    my_status: "",
    their_status: "",
    no_show_from: "2026-10-24T06:00:00Z",
    handover_code: null,
  },
  captures: { handover: { mine: false, theirs: false }, return: { mine: false, theirs: false } },
  claim_open: false,
  claims: [],
  extends: null,
  extensions: [],
  can: ["cancel", "request_window_change", "get_help"],
  timeline: [],
  created_at: "2026-10-13T04:11:00Z",
  server_time: "2026-10-13T04:11:00Z",
  ...over,
});

const ringing = (ring_state: BookingCustomer["ring_state"], over: Partial<BookingCustomer> = {}) =>
  booking({ stage: "ringing", ring_state, window: null, ...over });

/** Tuesday 13 October 2026, 9:41 am in India. */
const NOW = new Date("2026-10-13T04:11:00Z");
/** 10:00 am the next morning in India. */
const OPENS = "2026-10-14T04:30:00Z";
const closed = { is_open: false, opens_at: OPENS, book_for_morning: true, hours_first_day: null };

describe("days and times", () => {
  it("counts rental days with both ends in", () => {
    expect(dayCount("2026-10-24", "2026-10-26")).toBe(3);
    expect(dayCount("2026-10-24", "2026-10-24")).toBe(1);
    expect(dayCount("2026-10-31", "2026-11-02")).toBe(3);
  });

  it("writes a day and a range the way the frames do", () => {
    expect(dayShort("2026-10-24")).toBe("Sat 24 Oct");
    expect(dayLong("2026-10-24")).toBe("Sat 24 October");
    expect(rangeLabel("2026-10-24", "2026-10-26")).toBe("Sat 24 – Mon 26 Oct");
    expect(rangeLabel("2026-10-24", "2026-10-26", true)).toBe("Sat 24 – Mon 26 Oct 2026");
    expect(rangeLabel("2026-10-31", "2026-11-02")).toBe("Sat 31 Oct – Mon 2 Nov");
    expect(rangeLabel("2026-10-24", "2026-10-24")).toBe("Sat 24 Oct");
    expect(datesLine({ first_day: "2026-10-24", last_day: "2026-10-26", days: 3 })).toBe(
      "Sat 24 – Mon 26 Oct 2026 · 3 days"
    );
  });

  it("shows an instant as India time, with minutes", () => {
    expect(clock("2026-10-12T04:43:00Z")).toBe("10:13 am");
    expect(clock("2026-10-12T14:30:00Z")).toBe("8:00 pm");
    expect(clock("2026-10-12T18:45:00Z")).toBe("12:15 am");
    expect(clock(null)).toBe("");
  });

  it("knows the day in India, not in UTC", () => {
    // 8 pm UTC is already 1:30 am the next day in India.
    expect(todayIst(new Date("2026-10-13T20:00:00Z"))).toBe("2026-10-14");
  });

  it("says today, tomorrow, or the day", () => {
    expect(timeAndDay("2026-10-13T08:30:00Z", NOW)).toEqual({ time: "2:00 pm", day: "today" });
    expect(timeAndDay(OPENS, NOW)).toEqual({ time: "10:00 am", day: "tomorrow" });
    expect(timeAndDay("2026-10-16T04:30:00Z", NOW)).toEqual({ time: "10:00 am", day: "on Fri 16 Oct" });
    expect(timeAndDay("nonsense", NOW)).toBeNull();
  });
});

describe("picking dates", () => {
  const taken = bookedDays([
    { start_date: "2026-10-16", end_date: "2026-10-17" },
    { start_date: "2026-10-30", end_date: "2026-10-30" },
  ]);

  it("spreads the runs of taken days into days", () => {
    expect([...taken].sort()).toEqual(["2026-10-16", "2026-10-17", "2026-10-30"]);
    expect(bookedDays(null).size).toBe(0);
    expect(bookedDays([{ start_date: "bad", end_date: "2026-10-30" }]).size).toBe(0);
  });

  it("checks a stretch against the taken days", () => {
    expect(rangeIsFree("2026-10-24", "2026-10-26", taken)).toBe(true);
    expect(rangeIsFree("2026-10-15", "2026-10-18", taken)).toBe(false);
    expect(rangeIsFree("2026-10-30", "2026-10-30", taken)).toBe(false);
  });

  it("makes the first tap a one-day rental and a later day its end", () => {
    const one = tapDay(null, "2026-10-24", taken);
    expect(one).toEqual({ picked: { first: "2026-10-24", last: null }, blocked: false });
    expect(tapDay(one.picked, "2026-10-26", taken)).toEqual({
      picked: { first: "2026-10-24", last: "2026-10-26" },
      blocked: false,
    });
    // The same day again is still a one-day rental, now with both ends set.
    expect(tapDay(one.picked, "2026-10-24", taken).picked).toEqual({ first: "2026-10-24", last: "2026-10-24" });
  });

  it("starts again on an earlier day or a third tap", () => {
    expect(tapDay({ first: "2026-10-24", last: null }, "2026-10-20", taken).picked).toEqual({
      first: "2026-10-20",
      last: null,
    });
    expect(tapDay({ first: "2026-10-24", last: "2026-10-26" }, "2026-10-28", taken).picked).toEqual({
      first: "2026-10-28",
      last: null,
    });
  });

  it("will not stretch across a taken day", () => {
    expect(tapDay({ first: "2026-10-15", last: null }, "2026-10-19", taken)).toEqual({
      picked: { first: "2026-10-19", last: null },
      blocked: true,
    });
  });

  it("reads the searched range as the days that were tapped", () => {
    expect(
      searchedDays({ startDate: "2026-10-24T00:00:00.000Z", endDate: "2026-10-26T00:00:00.000Z" }, NOW)
    ).toEqual({ first_day: "2026-10-24", last_day: "2026-10-26" });
  });

  it("drops a search with no dates, a backwards one, or one that has begun", () => {
    expect(searchedDays({ startDate: undefined, endDate: undefined }, NOW)).toBeUndefined();
    expect(searchedDays({ startDate: "2026-10-26T00:00:00.000Z", endDate: "2026-10-24T00:00:00.000Z" }, NOW)).toBeUndefined();
    expect(searchedDays({ startDate: "2026-10-12T00:00:00.000Z", endDate: "2026-10-14T00:00:00.000Z" }, NOW)).toBeUndefined();
    expect(searchedDays(null, NOW)).toBeUndefined();
  });

  it("writes the delivery choice from the quote", () => {
    const ok = quote({ delivery: { status: "ok", fee: "170.00", distance_km: "8.0", offer_pickup: false } });
    expect(deliveryOption(ok, "Home")).toEqual({ title: "Delivery to Home · ₹170 · 8 km", sub: null, ok: true });
    const far = quote({ delivery: { status: "too_far", fee: "0.00", distance_km: "22.4", offer_pickup: true } });
    expect(deliveryOption(far, "Home")).toMatchObject({ title: "Delivery to Home · too far", ok: false });
    const none = quote({ delivery: { status: "not_offered", fee: "0.00", distance_km: null, offer_pickup: true } });
    expect(deliveryOption(none, "Home").ok).toBe(false);
    // No quote yet (no dates picked): the choice is offered, without a fee.
    expect(deliveryOption(undefined, "Work")).toEqual({ title: "Delivery to Work", sub: null, ok: true });
  });
});

describe("the product page", () => {
  const week = { open: "10:00", close: "20:00" };
  const shop = {
    name: "SoundBox Rentals",
    locality: "Andheri West, Mumbai",
    hours: { mon: week, tue: week, wed: week, thu: week, fri: week, sat: week, sun: week },
    is_open: true,
    opens_at: null,
    min_notice_hours: 3,
    delivers: true,
    delivery_base_fee: "50.00",
    delivery_per_km: "15.00",
    delivery_max_km: "15.0",
  };

  it("states the handover hours in one line", () => {
    expect(handoverLine(shop.hours)).toBe("Handover 10 am – 8 pm");
    expect(handoverLine({ ...shop.hours, sun: null })).toBe("Handover 10 am – 8 pm · Mon – Sat");
    expect(handoverLine({ ...shop.hours, sat: { open: "10:00", close: "21:00" }, sun: null })).toBe(
      "Handover Mon – Fri 10 am – 8 pm, Sat 10 am – 9 pm"
    );
    expect(handoverLine({})).toBeNull();
  });

  it("says how the item changes hands", () => {
    expect(getItLine(shop)).toBe("Self pickup or delivery from ₹50");
    expect(getItLine(shop, true)).toBe("Self pickup");
    expect(getItLine({ ...shop, delivers: false })).toBe("Self pickup");
    expect(getItLine(null)).toBe("Self pickup");
  });

  it("says Live booking while the shop is open, with no number of minutes", () => {
    const copy = liveCopy({ live_booking: true, book_for_morning: false, shop }, NOW);
    expect(copy).toMatchObject({ kind: "live", title: "Live booking", button: "Book now" });
    expect(`${copy?.title} ${copy?.body}`).not.toMatch(/\d/);
  });

  it("offers Book for the morning while it is closed, with the opening time", () => {
    const copy = liveCopy(
      { live_booking: false, book_for_morning: true, shop: { ...shop, is_open: false, opens_at: OPENS } },
      NOW
    );
    expect(copy?.button).toBe("Book for the morning");
    expect(copy?.body).toBe("The owner is closed and will be asked when they open, at 10:00 am tomorrow.");
  });

  it("offers nothing when the listing cannot be booked", () => {
    expect(liveCopy({ live_booking: false, book_for_morning: false, shop }, NOW)).toBeNull();
    expect(liveCopy({}, NOW)).toBeNull();
  });

  it("names the shop, or the owner on a listing without one", () => {
    expect(shopNameOf({ shop })).toBe("SoundBox Rentals");
    expect(shopNameOf({ owner: { business_name: "", first_name: "Asha", last_name: "K" } })).toBe("Asha K");
    expect(shopNameOf({})).toBe("the owner");
  });
});

describe("the price before Book now", () => {
  it("shows the fee crossed out with what is charged beside it", () => {
    expect(priceLines(quote())).toEqual([
      { label: "Rent · 3 days × ₹610", amount: "₹1,830" },
      { label: "Delivery", amount: "₹0" },
      { label: "Renit's fee", amount: "₹0", struck: "₹92" },
    ]);
  });

  it("matches the contract's seven-day example", () => {
    const lines = priceLines(quote({ days: 7, rent: "4270.00", fee_shown: "214.00", total: "4270.00" }));
    expect(lines[0]).toEqual({ label: "Rent · 7 days × ₹610", amount: "₹4,270" });
    expect(lines[2]).toEqual({ label: "Renit's fee", amount: "₹0", struck: "₹214" });
  });

  it("does not cross the fee out once it is charged in full", () => {
    expect(priceLines(quote({ fee_charged: "92.00" }))[2]).toEqual({ label: "Renit's fee", amount: "₹92" });
  });

  it("calls the sum Total once a delivery fee is in it", () => {
    expect(totalLabel(quote())).toBe("Total rent");
    expect(
      totalLabel(quote({ delivery: { status: "ok", fee: "170.00", distance_km: "8.0", offer_pickup: false } }))
    ).toBe("Total");
  });

  it("lists what is paid when", () => {
    expect(paySteps(quote(), false, NOW)).toEqual([
      { title: "Now", sub: "Counts toward the rent", amount: "₹99" },
      { title: "After the owner accepts", sub: "Within 30 minutes", amount: "₹1,731" },
      { title: "Deposit", sub: "Refundable · due Fri 23 Oct", amount: "₹3,000" },
    ]);
  });

  it("takes the rent window from the quote: no 30 is written in the app (P2-2)", () => {
    expect(paySteps(quote({ rent_pay_minutes: 45 }), false, NOW)[1].sub).toBe("Within 45 minutes");
    expect(paySteps(quote({ rent_pay_minutes: 1 }), false, NOW)[1].sub).toBe("Within 1 minute");
    // A server that does not send it yet: no number is made up.
    expect(paySteps(quote({ rent_pay_minutes: undefined as unknown as number }), false, NOW)[1].sub).toBe(
      "Soon after they accept"
    );
  });

  it("says when a closed shop is asked, in place of the rent window", () => {
    expect(paySteps(quote({ shop: closed }), false, NOW)[1].sub).toBe("They are asked tomorrow at 10:00 am");
  });

  it("says the deposit comes with the rent at short notice, and leaves out a deposit of zero", () => {
    const soon = quote({ deposit: { amount: "3000.00", with_rent: true, due_on: null, refundable: true } });
    expect(paySteps(soon, false, NOW)[2].sub).toBe("Refundable · paid with the rent");
    const none = quote({ deposit: { amount: "0.00", with_rent: false, due_on: null, refundable: true } });
    expect(paySteps(none, false, NOW).map((s) => s.title)).toEqual(["Now", "After the owner accepts"]);
  });

  it("leaves out the second payment when the booking amount covers it all (A-24)", () => {
    const small = quote({ rent: "60.00", total: "60.00", pay_now: "60.00", pay_after_accept: "0.00" });
    expect(paySteps(small, false, NOW).map((s) => s.title)).toEqual(["Now", "Deposit"]);
  });

  it("says the earlier payment moves, and asks for nothing now", () => {
    expect(paySteps(quote(), true, NOW)[0]).toEqual({
      title: "Now",
      sub: "Already paid · it moves to this booking",
      amount: "₹99",
    });
    expect(bookLabel(quote(), true)).toBe("Book now");
  });

  it("writes the three plain lines", () => {
    expect(plainLines(quote())).toEqual([
      "Cancel free until 24 hours before pickup. The ₹99 is not returned.",
      "Each late day costs one day's rent.",
      "Returning early gives no refund.",
    ]);
    expect(plainLines(quote({ delivery_mode: "owner_delivery" }))[0]).toBe(
      "Cancel free until 24 hours before delivery. The ₹99 is not returned."
    );
  });

  it("adds the change-of-mind line for a closed shop", () => {
    expect(plainLines(quote({ shop: closed })).slice(0, 2)).toEqual([
      "Changed your mind? Cancel any time before they open and the ₹99 comes back.",
      "Cancel free until 24 hours before pickup. After they open, the ₹99 is not returned.",
    ]);
  });

  it("writes the closed notice with the opening time", () => {
    expect(morningNotice(quote(), "SoundBox Rentals", NOW)).toBeNull();
    expect(morningNotice(quote({ shop: closed }), "SoundBox Rentals", NOW)).toEqual({
      lead: "SoundBox Rentals is closed now.",
      rest: "They will be asked at 10:00 am tomorrow, and we'll tell you the moment they answer.",
    });
  });

  it("labels the button with what is paid now", () => {
    expect(bookLabel(quote())).toBe("Book now · Pay ₹99");
    expect(bookLabel(quote({ shop: closed }))).toBe("Book for the morning · Pay ₹99");
    expect(bookLabel(quote({ pay_now: "60.00" }))).toBe("Book now · Pay ₹60");
  });

  it("promises no number of minutes for the owner's answer", () => {
    const words = [...plainLines(quote()), bookLabel(quote()), ...paySteps(quote(), false, NOW).map((s) => s.sub)];
    // The one stated time is the customer's own 30 minutes to pay the rent (N3).
    expect(words.filter((w) => /minute/.test(w))).toEqual(["Within 30 minutes"]);
    expect(words.join(" ")).not.toMatch(/\b(5|five|10|ten) minutes/);
  });

  it("says how the item changes hands", () => {
    expect(howLabel("pickup")).toBe("Self pickup");
    expect(howLabel("owner_delivery", "Home")).toBe("Delivery to Home");
    expect(howLabel("owner_delivery")).toBe("Delivery");
  });
});

describe("what is in the way", () => {
  it("has a sentence for each blocker", () => {
    for (const code of [
      "own_product",
      "no_unit_free",
      "closed_that_day",
      "closed_on_return_day",
      "notice_too_short",
      "owner_cannot_accept",
      "too_far",
      "delivery_not_offered",
      "phone_required",
      "linked_account",
    ]) {
      expect(blockerText(code)).toBeTruthy();
    }
    expect(blockerText("something_new")).toBeNull();
    // An extension's own blockers (ENG-220, T-30) have words too, so the price screen never greys the button with no reason.
    for (const code of ["listing_unavailable", "claim_open", "already_extending", "shop_closed", "too_late_to_extend"]) {
      expect(blockerText(code)).toBeTruthy();
    }
    expect(blockerText("listing_unavailable")).toBe("This item is not taking bookings right now. Ask the owner.");
    expect(blockerText("claim_open")).toBe("A report on this booking is waiting for Renit's decision. It cannot be extended until then.");
    expect(reviewBlocker(quote({ blockers: ["claim_open"] }))).toEqual({
      code: "claim_open",
      text: "A report on this booking is waiting for Renit's decision. It cannot be extended until then.",
    });
    expect(reviewBlocker(quote({ blockers: ["listing_unavailable", "shop_closed"] }))?.code).toBe("listing_unavailable");
  });

  it("names the shop's notice when the server gives it", () => {
    expect(blockerText("notice_too_short", { min_notice_hours: 3 })).toBe(
      "The shop needs at least 3 hours of notice. Pick a later start date."
    );
  });

  it("shows on the dates screen only what other dates can fix", () => {
    expect(datesBlocker(quote({ blockers: ["terms_not_accepted"] }))).toBeNull();
    expect(datesBlocker(quote({ blockers: ["phone_required", "closed_that_day"] }))).toBe(
      "The shop is closed on the first day. Pick another start date."
    );
    expect(datesBlocker(undefined)).toBeNull();
  });

  it("leaves the tick and the ID check to their own places on the price screen", () => {
    expect(reviewBlocker(quote({ blockers: ["id_check_needed", "terms_not_accepted"] }))).toBeNull();
    expect(reviewBlocker(quote({ blockers: ["no_unit_free", "terms_not_accepted"] }))?.code).toBe("no_unit_free");
    expect(reviewBlocker(quote({ blockers: ["phone_required"] }))?.code).toBe("phone_required");
  });

  it("explains a refused Book now", () => {
    const error = (code: string, details: Record<string, unknown> | null = null) => ({
      status: 409,
      code,
      message: "Server words.",
      details,
    });
    expect(bookErrorText(error("price_changed"))).toMatch(/price changed/);
    expect(bookErrorText(error("no_unit_free", { days: ["2026-10-25"] }))).toMatch(/no longer free/);
    expect(bookErrorText(error("move_not_allowed"))).toBe(
      "Your first payment can't move to this booking, so it is refunded to you, and this booking needs its own. Tap Book now again to pay for it."
    );
    expect(bookErrorText({ ...error("payments_unavailable"), status: 503 })).toMatch(/Nothing was booked/);
    // A code this build does not know: the server's own words.
    expect(bookErrorText(error("something_new"))).toBe("Server words.");
    expect(bookErrorText(null)).toMatch(/Check your connection/);
  });
});

describe("the key of a Book now tap", () => {
  const error = (status: number, code: string | null = null) => ({ status, code, message: null, details: null });

  it("is spent by a refusal the server chose", () => {
    expect(bookRefusalIsFinal(error(409, "no_unit_free"))).toBe(true);
    expect(bookRefusalIsFinal(error(403, "id_check_needed"))).toBe(true);
    expect(bookRefusalIsFinal(error(400, "validation_error"))).toBe(true);
    // rn-pay was down: the contract says nothing was created.
    expect(bookRefusalIsFinal(error(503, "payments_unavailable"))).toBe(true);
  });

  it("is kept when the booking may exist with its reply lost", () => {
    expect(bookRefusalIsFinal(error(0))).toBe(false);
    expect(bookRefusalIsFinal(error(500))).toBe(false);
    expect(bookRefusalIsFinal(error(502))).toBe(false);
    expect(bookRefusalIsFinal(error(503))).toBe(false);
    expect(bookRefusalIsFinal(error(504))).toBe(false);
    expect(bookRefusalIsFinal(null)).toBe(false);
  });
});

describe("the terms tick", () => {
  const terms = { version: "2026-10", url: "https://simplyrenit.com/terms/rental", accepted: false };

  it("starts empty, even for someone who has accepted this version before", () => {
    expect(termsTicked(terms, null)).toBe(false);
    expect(termsTicked({ ...terms, accepted: true }, null)).toBe(false);
  });

  it("stands for the version it was ticked for", () => {
    expect(termsTicked(terms, "2026-10")).toBe(true);
  });

  it("empties by itself when the terms change", () => {
    expect(termsTicked({ ...terms, version: "2026-11" }, "2026-10")).toBe(false);
  });

  it("is never ticked without terms (signed out)", () => {
    expect(termsTicked(null, "2026-10")).toBe(false);
  });

  it("says the terms changed when Book now is refused for them", () => {
    expect(
      bookErrorText({ status: 409, code: "terms_not_accepted", message: null, details: { version: "2026-11" } })
    ).toBe("The rental terms have changed. Read them and tick the box again.");
  });
});

describe("the ID check", () => {
  const withCheck = (needed: "none" | "id" | "id_and_match", passed: boolean, blockers: string[] = []) =>
    quote({ id_check: { needed, passed }, blockers });

  it("says nothing for an item that needs none (the 4,000 rupee item)", () => {
    expect(idCheckCopy(withCheck("none", true))).toBeNull();
    // A check the customer happens to hold is not asked about either.
    expect(idCheckCopy(withCheck("none", false))).toBeNull();
  });

  it("asks for the check when the item needs one the customer has not passed (the 40,000 rupee item)", () => {
    expect(idCheckCopy(withCheck("id", false, ["id_check_needed"]))).toMatchObject({
      state: "needed",
      title: "This item needs an ID check",
    });
    // Either signal alone is enough.
    expect(idCheckCopy(withCheck("id", false))?.state).toBe("needed");
    expect(idCheckCopy(quote({ id_check: null, blockers: ["id_check_needed"] }))?.state).toBe("needed");
  });

  it("asks for it when Book now was refused for it, whatever the quote said", () => {
    expect(idCheckCopy(withCheck("id", true), "id")?.state).toBe("needed");
  });

  it("shows the check as passed once it is", () => {
    expect(idCheckCopy(withCheck("id", true))).toEqual({ state: "passed", title: "ID check passed", body: null });
  });

  it("adds the same-ID line when the owner matches it at handover", () => {
    expect(idCheckCopy(withCheck("id_and_match", true))?.body).toMatch(/same ID/);
    expect(idCheckCopy(withCheck("id_and_match", false))?.body).toMatch(/same ID/);
  });

  it("says nothing signed out, where the quote cannot know", () => {
    expect(idCheckCopy(quote({ id_check: null, blockers: [] }))).toBeNull();
  });

  it("writes no rupee figure: where the line falls is the server's setting", () => {
    expect(`${idCheckCopy(withCheck("id", false))?.body}`).not.toMatch(/₹|\d/);
  });

  it("explains a Book now refused for it", () => {
    expect(
      bookErrorText({ status: 403, code: "id_check_needed", message: null, details: { needed: "id" } })
    ).toBe("This item needs an ID check before you can book it.");
  });
});

describe("the payment hand-off's words", () => {
  it("uses the contract's sentences", () => {
    expect(payPhaseText("pending")).toBe(
      "We are still waiting for your bank. We will tell you as soon as it is through."
    );
    expect(payPhaseText("failed")).toBe("The payment did not go through.");
    expect(payPhaseText("idle")).toBeNull();
  });

  it("does not claim that no money was taken when a pay page has ended", () => {
    expect(payPhaseText("ended")).toBe(
      "This payment has ended. If money left your account, it comes back by itself."
    );
  });

  it("offers Try again after a failed try", () => {
    expect(payButtonLabel("idle", "Pay ₹99")).toBe("Pay ₹99");
    expect(payButtonLabel("failed", "Pay ₹99")).toBe("Try again");
    expect(payButtonLabel("pending", "Pay ₹99")).toBe("Open the pay page again");
  });
});

describe("which screen a booking is on", () => {
  it("follows the stage table, from the customer's side", () => {
    expect(bookingView(ringing("awaiting_payment"))).toBe("pay_booking_amount");
    for (const state of ["waiting_to_open", "ringing", "calling", "ringing_again"] as const) {
      expect(bookingView(ringing(state))).toBe("confirming");
    }
    expect(bookingView(booking({ stage: "accepted" }))).toBe("pay_rent");
    for (const stage of ["confirmed", "returned", "closed"] as const) {
      expect(bookingView(booking({ stage }))).toBe("details");
    }
    // The day of the handover, and the rental itself, have their own screens (ENG-222).
    expect(bookingView(booking({ stage: "ready" }))).toBe("day_of");
    expect(bookingView(booking({ stage: "out" }))).toBe("active");
  });

  it("shows the outcome, with other options, when the owner's side ended it", () => {
    expect(bookingView(ringing("ringing", { exit: "refused", exit_reason: "not_available" }))).toBe("outcome");
    expect(bookingView(ringing("ringing", { exit: "no_answer" }))).toBe("outcome");
    expect(bookingView(booking({ stage: "confirmed", exit: "cancelled_by_owner", exit_reason: "owner" }))).toBe("outcome");
    expect(bookingView(booking({ stage: "ready", exit: "no_show", exit_reason: "owner" }))).toBe("outcome");
  });

  it("shows the booking screen for an ending of the customer's own", () => {
    expect(bookingView(ringing("ringing", { exit: "cancelled_by_customer", exit_reason: "while_ringing" }))).toBe("details");
    // The 99 was never paid and the request was dropped: not a payment screen any more.
    expect(bookingView(ringing("awaiting_payment", { exit: "cancelled_by_customer", exit_reason: "booking_amount_unpaid" }))).toBe("details");
    expect(bookingView(booking({ stage: "accepted", exit: "lapsed_unpaid" }))).toBe("details");
    expect(bookingView(booking({ stage: "ready", exit: "no_show", exit_reason: "customer" }))).toBe("details");
  });

  it("knows a request that is still open from one that has ended or moved on", () => {
    expect(isRinging(ringing("ringing"))).toBe(true);
    expect(isRinging(ringing("waiting_to_open"))).toBe(true);
    expect(isRinging(ringing("awaiting_payment"))).toBe(true);
    expect(isRinging(ringing("ringing", { exit: "no_answer" }))).toBe(false);
    expect(isRinging(booking({ stage: "accepted" }))).toBe(false);
    expect(isRinging(booking({ stage: "confirmed" }))).toBe(false);
  });

  it("reads every 3 seconds while the 99 is paid or the owner is asked, and stops when the ring ends", () => {
    for (const state of ["awaiting_payment", "ringing", "calling", "ringing_again"] as const) {
      expect(pollEveryMs(ringing(state), NOW)).toBe(3000);
    }
    expect(pollEveryMs(ringing("ringing", { exit: "no_answer" }), NOW)).toBe(false);
    expect(pollEveryMs(ringing("ringing", { exit: "refused" }), NOW)).toBe(false);
    expect(pollEveryMs(booking({ stage: "accepted" }), NOW)).toBe(false);
    expect(pollEveryMs(booking({ stage: "confirmed" }), NOW)).toBe(false);
  });

  it("reads slowly on the day of the handover, from the time the buttons open", () => {
    const ready = booking({ stage: "ready" });
    // Days ahead: nothing can change by itself.
    expect(pollEveryMs(ready, NOW)).toBe(false);
    expect(pollEveryMs(ready, new Date("2026-10-24T02:30:00Z"))).toBe(15_000);
    expect(pollEveryMs(booking({ stage: "ready", exit: "no_show", exit_reason: "owner" }), new Date("2026-10-24T03:00:00Z"))).toBe(false);
    expect(pollEveryMs(booking({ stage: "out" }), new Date("2026-10-24T05:00:00Z"))).toBe(false);
  });

  it("does not read a request on a timer while its shop is closed", () => {
    const waiting = ringing("waiting_to_open");
    waiting.shop.opens_at = OPENS;
    // Booked the evening before: nothing can change until the shop opens.
    expect(pollEveryMs(waiting, NOW)).toBe(false);
    // The phone thinks the shop should have opened and the server still says waiting: slowly.
    expect(pollEveryMs(waiting, new Date("2026-10-14T04:31:00Z"))).toBe(15_000);
    // No opening time to wait for: slowly too, never the ringing rhythm.
    expect(pollEveryMs(ringing("waiting_to_open"), NOW)).toBe(15_000);
  });
});

describe("the confirming screen", () => {
  const labels = (state: BookingCustomer["ring_state"]) =>
    ringCopy(ringing(state), NOW).steps.map((step) => `${step.label}:${step.state}`);

  it("reads Ringing the owner at first", () => {
    expect(ringCopy(ringing("ringing"), NOW)).toMatchObject({ icon: "bell", title: "Asking SoundBox Rentals" });
    expect(labels("ringing")).toEqual(["Ringing the owner:active", "Calling the owner:todo"]);
  });

  it("reads Calling the owner once the staff call starts", () => {
    const copy = ringCopy(ringing("calling"), NOW);
    expect(copy.icon).toBe("phone");
    expect(labels("calling")).toEqual(["Ringing the owner:done", "Calling the owner:active"]);
    expect(copy.steps[1].sub).toBe("Renit is phoning the shop for you.");
  });

  it("reads Ringing again outside the desk's hours", () => {
    expect(labels("ringing_again")).toEqual(["Ringing the owner:done", "Ringing again:active"]);
  });

  it("says a closed shop is asked when it opens, with the opening time", () => {
    const waiting = ringing("waiting_to_open");
    waiting.shop.opens_at = OPENS;
    const copy = ringCopy(waiting, NOW);
    expect(copy.title).toBe("SoundBox Rentals is closed now");
    expect(copy.steps[0]).toMatchObject({ label: "Asked at 10:00 am tomorrow", state: "active" });
    expect(copy.body).toMatch(/cancel any time before they open and the ₹99 comes back/);
  });

  it("never shows a countdown or a number of minutes", () => {
    for (const state of ["ringing", "calling", "ringing_again"] as const) {
      const copy = ringCopy(ringing(state), NOW);
      const words = [copy.title, copy.body, ...copy.steps.flatMap((s) => [s.label, s.sub ?? ""])].join(" ");
      expect(words).not.toMatch(/\d/);
      expect(words).toMatch(/a few minutes/);
    }
  });
});

describe("cancelling", () => {
  it("says the 99 comes back for a request that is still ringing", () => {
    expect(
      cancelCopy({
        case: "ringing",
        back: [{ what: "booking_amount", amount: "99.00", text: "UPI asha@okhdfcbank", expected_days_min: 5, expected_days_max: 7 }],
        kept: [],
        to_owner: "0.00",
        free_until: null,
      })
    ).toEqual({
      title: "Cancel this request?",
      lines: ["₹99 goes back to UPI asha@okhdfcbank. Expect it in 5 to 7 working days."],
      confirm: "Cancel request",
    });
  });

  it("lists what comes back, what is kept and what the owner gets", () => {
    const free = cancelCopy({
      case: "free",
      back: [{ what: "rent", amount: "1731.00", text: "UPI asha@okhdfcbank", expected_days_min: 5, expected_days_max: 7 }],
      kept: [{ what: "booking_amount", amount: "99.00", text: "The ₹99 is not returned" }],
      to_owner: "0.00",
      free_until: "2026-10-23T04:30:00Z",
    });
    expect(free.title).toBe("Cancel this booking?");
    expect(free.lines).toEqual([
      "₹1,731 goes back to UPI asha@okhdfcbank. Expect it in 5 to 7 working days.",
      "The ₹99 is not returned",
    ]);
    const inside = cancelCopy({
      case: "inside_24h",
      back: [{ what: "rent", amount: "1220.00", text: null }],
      kept: [],
      to_owner: "610.00",
      free_until: null,
    });
    expect(inside.lines).toEqual(["₹1,220 goes back the way you paid.", "₹610 goes to the owner."]);
  });

  it("says so when there is no money to move", () => {
    expect(cancelCopy({ case: "after_accept", back: [], kept: [], to_owner: "0.00", free_until: null }).lines).toEqual([
      "Nothing has been paid, so there is nothing to refund.",
    ]);
  });

  it("explains each refusal of the cancel call", () => {
    const error = (code: string, details: Record<string, unknown> | null = null) => ({ status: 409, code, message: null, details });
    expect(cancelErrorText(error("outcome_changed"))).toMatch(/Nothing was cancelled/);
    expect(cancelErrorText(error("cancel_limit", { per_day: 3 }))).toMatch(/cancelled 3 requests today/);
    expect(cancelErrorText(error("claim_open"))).toMatch(/report/);
    expect(cancelErrorText(error("stage_not_allowed"))).toMatch(/no longer/);
    expect(cancelErrorText(null)).toMatch(/Check your connection/);
  });
});

describe("refused, no answer, cancelled by the owner", () => {
  it("gives a refusal its plain reason, about the dates", () => {
    expect(outcomeCopy(ringing("ringing", { exit: "refused", exit_reason: "not_available" }))).toEqual({
      icon: "calendar",
      title: "SoundBox Rentals can't do these dates",
      body: "The owner told us the Sony PS5 is not available on Sat 24 – Mon 26 Oct.",
    });
    expect(outcomeCopy(ringing("ringing", { exit: "refused", exit_reason: "other" })).body).toBe(
      "The owner can't do Sat 24 – Mon 26 Oct."
    );
  });

  it("words the system's refusals without blaming the shop", () => {
    expect(outcomeCopy(ringing("ringing", { exit: "refused", exit_reason: "no_unit" })).body).toMatch(/booked by someone else/);
    expect(outcomeCopy(ringing("waiting_to_open", { exit: "refused", exit_reason: "too_late" })).body).toMatch(/opened too late/);
  });

  it("gives silence the other message", () => {
    expect(outcomeCopy(ringing("ringing", { exit: "no_answer" }))).toEqual({
      icon: "clock",
      title: "SoundBox Rentals did not answer in time",
      body: "We rang the owner. Nobody answered, so this request has ended.",
    });
  });

  it("says Renit phoned the shop only when a member of staff did (P2-3)", () => {
    expect(triedText({ ring: true, second_ring: false, staff_call: false })).toBe("We rang the owner.");
    expect(triedText({ ring: true, second_ring: false, staff_call: true })).toBe(
      "We rang the owner and phoned the shop."
    );
    // Outside the desk's hours: rung a second time, nobody phoned.
    expect(triedText({ ring: true, second_ring: true, staff_call: false })).toBe("We rang the owner twice.");
    expect(triedText({ ring: true, second_ring: true, staff_call: true })).toBe(
      "We rang the owner twice and phoned the shop."
    );
    // An answer without the field claims the least.
    expect(triedText(undefined)).toBe("We rang the owner.");
    const phoned = ringing("calling", { exit: "no_answer", tried: { ring: true, second_ring: false, staff_call: true } });
    expect(outcomeCopy(phoned).body).toBe(
      "We rang the owner and phoned the shop. Nobody answered, so this request has ended."
    );
  });

  it("says everything comes back when the owner cancels or does not come", () => {
    expect(outcomeCopy(booking({ exit: "cancelled_by_owner", exit_reason: "owner" }))).toMatchObject({
      title: "SoundBox Rentals cancelled this booking",
      body: "Everything you paid is going back to you.",
    });
    expect(outcomeCopy(booking({ stage: "ready", exit: "no_show", exit_reason: "owner" })).title).toBe(
      "SoundBox Rentals did not come"
    );
  });

  const refused = (state: string, over: Partial<BookingCustomer> = {}) =>
    ringing("ringing", { exit: "refused", exit_reason: "not_available", pick_deadline_at: "2026-10-13T04:28:00Z", ...over, money: { ...booking().money, booking_amount_state: state } });

  it("says the 99 moves with the customer until the pick-by time", () => {
    expect(bookingAmountCopy(refused("paid"), true)).toEqual({
      title: "Your ₹99",
      body: "It moves with you if you pick one of these. Pick nothing by 9:58 am and it goes back to UPI asha@okhdfcbank. Refunds take 5 to 7 working days.",
    });
  });

  it("says it goes back once it can no longer move, or was asked back", () => {
    expect(bookingAmountCopy(refused("paid"), false).body).toBe(
      "It goes back to UPI asha@okhdfcbank. Refunds take 5 to 7 working days."
    );
    expect(bookingAmountCopy(refused("refund_requested"), false).body).toMatch(/^It is going back to UPI/);
    expect(bookingAmountCopy(refused("refunded"), false).body).toBe("It was refunded to UPI asha@okhdfcbank.");
    expect(bookingAmountCopy(refused("moved"), false).body).toBe("It moved to your new booking.");
  });

  it("uses the refund's own days once the refund exists", () => {
    const withRefund = refused("refund_requested");
    withRefund.payments.push({
      id: "rfd_01",
      kind: "refund",
      what: "booking_amount",
      amount: "99.00",
      status: "pending",
      text: "UPI asha@okhdfcbank",
      expected_days_min: 3,
      expected_days_max: 5,
      expected_by: "2026-10-20",
      at: "2026-10-13T04:30:00Z",
    });
    expect(bookingAmountCopy(withRefund, false).body).toBe(
      "It is going back to UPI asha@okhdfcbank. Expect it in 3 to 5 working days."
    );
  });

  it("never offers to move the 99 after an owner's cancellation", () => {
    const cancelled = booking({ exit: "cancelled_by_owner", exit_reason: "owner" });
    expect(bookingAmountCopy(cancelled, true).body).toMatch(/^It is going back/);
  });
});

describe("pay the rent", () => {
  /** Accepted at 9:43 am; the rent is due at 10:13 am. */
  const accepted = (over: Partial<BookingCustomer> = {}, moneyOver: Partial<BookingCustomer["money"]> = {}) =>
    booking(
      {
        stage: "accepted",
        window: null,
        pay_now: { purpose: "rent", amount: "1731.00", deposit_part: "0.00", due_at: "2026-10-13T04:43:00Z", payment: null },
        ...over,
      },
      { rent_paid: false, rent_due_at: "2026-10-13T04:43:00Z", ...moneyOver }
    );

  it("writes BK-06: who accepted, what is left, and by what time", () => {
    expect(payRentCopy(accepted(), NOW)).toEqual({
      title: "SoundBox Rentals accepted",
      sub: "Pay ₹1,731 by 10:13 am to confirm your booking.",
      lines: [
        { label: "Rent", amount: "₹1,830" },
        { label: "Already paid", amount: "₹99", amountTone: "success" },
      ],
      total: { label: "To pay now", amount: "₹1,731" },
      note: "Deposit ₹3,000 is due later, on Fri 23 Oct.",
      small: "If it isn't paid in time, the booking lapses and the ₹99 is kept.",
      button: "Pay ₹1,731",
    });
  });

  it("gives the deadline as a clock time, never as a number of minutes", () => {
    const copy = payRentCopy(accepted(), NOW);
    expect(`${copy.sub} ${copy.small} ${copy.note}`).not.toMatch(/minute/);
  });

  it("names the day when the deadline is not today", () => {
    const late = accepted({
      pay_now: { purpose: "rent", amount: "1731.00", deposit_part: "0.00", due_at: "2026-10-13T18:45:00Z", payment: null },
    });
    expect(payRentCopy(late, NOW).sub).toBe("Pay ₹1,731 by 12:15 am tomorrow to confirm your booking.");
  });

  it("shows the delivery fee, and the deposit when it joins the rent", () => {
    const soon = accepted(
      { pay_now: { purpose: "rent_and_deposit", amount: "4901.00", deposit_part: "3000.00", due_at: "2026-10-13T04:43:00Z", payment: null } },
      { delivery_fee: "170.00", total: "2000.00", pay_after_accept: "1901.00" }
    );
    const copy = payRentCopy(soon, NOW);
    expect(copy.lines.map((l) => l.label)).toEqual(["Rent", "Delivery", "Already paid", "Deposit · refundable"]);
    expect(copy.total.amount).toBe("₹4,901");
    expect(copy.note).toMatch(/paid with the rent/);
  });

  it("says nothing about a deposit there is none of", () => {
    expect(payRentCopy(accepted({}, { deposit: "0.00", deposit_state: "none" }), NOW).note).toBeNull();
  });

  const start = (over: Partial<{ purpose: "rent" | "rent_and_deposit"; amount: string; deposit_part: string }> = {}) => ({
    payment_id: "pay_02",
    purpose: "rent" as const,
    amount: "1731.00",
    deposit_part: "0.00",
    checkout_url: "https://pay-qa.toratora.site/c/ckt_2",
    expires_at: "2026-10-13T04:43:00Z",
    return_url: "renit://pay/return",
    ...over,
  });

  it("shows the open payment's own sum once one has been started", () => {
    const open = accepted({
      pay_now: {
        purpose: "rent",
        amount: "1731.00",
        deposit_part: "0.00",
        due_at: "2026-10-13T04:43:00Z",
        payment: start({ purpose: "rent_and_deposit", amount: "4731.00", deposit_part: "3000.00" }),
      },
    });
    expect(rentCharge(open)).toEqual({ purpose: "rent_and_deposit", amount: "4731.00", deposit_part: "3000.00" });
    expect(payRentCopy(open, NOW).button).toBe("Pay ₹4,731");
  });

  it("opens the pay page only for the sum the button named", () => {
    const shown = rentCharge(accepted());
    expect(sameCharge(shown, start())).toBe(true);
    // The same money written another way is the same money.
    expect(sameCharge(shown, start({ amount: "1731", deposit_part: "0" }))).toBe(true);
  });

  it("does not open it when the deposit joined the rent between the screen and the tap (A-13)", () => {
    // Read at 9:45 as rent only; at the tap the opening is under 24 hours away.
    const shown = rentCharge(accepted());
    const answered = start({ purpose: "rent_and_deposit", amount: "4731.00", deposit_part: "3000.00" });
    expect(sameCharge(shown, answered)).toBe(false);
    // The screen then shows what was answered, and the next tap is for that.
    const copy = payRentCopy(accepted(), NOW, answered);
    expect(copy.button).toBe("Pay ₹4,731");
    expect(copy.lines.map((l) => l.label)).toContain("Deposit · refundable");
    expect(copy.note).toMatch(/paid with the rent/);
    expect(sameCharge(answered, answered)).toBe(true);
  });

  it("treats any other difference as a different charge", () => {
    const shown = rentCharge(accepted());
    expect(sameCharge(shown, start({ amount: "1901.00" }))).toBe(false);
    expect(sameCharge(shown, start({ purpose: "rent_and_deposit" }))).toBe(false);
  });

  it("counts down to the rent's deadline", () => {
    const due = "2026-10-13T04:43:00Z";
    expect(timeLeft(due, new Date("2026-10-13T04:13:00Z"))).toBe("30:00");
    expect(timeLeft(due, new Date("2026-10-13T04:30:26Z"))).toBe("12:34");
    expect(timeLeft(due, new Date("2026-10-13T04:42:55Z"))).toBe("0:05");
    expect(timeLeft("2026-10-13T06:13:09Z", new Date("2026-10-13T04:13:00Z"))).toBe("2:00:09");
  });

  it("shows no countdown once the deadline has passed, or without one", () => {
    expect(timeLeft("2026-10-13T04:43:00Z", new Date("2026-10-13T04:43:00Z"))).toBeNull();
    expect(timeLeft("2026-10-13T04:43:00Z", new Date("2026-10-13T05:00:00Z"))).toBeNull();
    expect(timeLeft(null, NOW)).toBeNull();
  });

  it("explains why a payment could not be started", () => {
    expect(payRentErrorText({ status: 409, code: "stage_not_allowed", message: null, details: null })).toMatch(/no longer waiting/);
    expect(payRentErrorText({ status: 503, code: "payments_unavailable", message: null, details: null })).toMatch(/Nothing was charged/);
  });
});

describe("the arrival window", () => {
  const ten = { start: "2026-10-24T04:30:00Z", end: "2026-10-24T05:30:00Z" };

  it("writes a window as the frame does", () => {
    expect(windowLabel(ten)).toBe("10:00 – 11:00 am");
    expect(windowLabel({ start: "2026-10-24T05:30:00Z", end: "2026-10-24T06:30:00Z" })).toBe("11:00 am – 12:00 pm");
    expect(windowLabel({ start: "2026-10-24T13:30:00Z", end: "2026-10-24T14:30:00Z" })).toBe("7:00 – 8:00 pm");
    expect(windowSummary(ten)).toBe("Sat 24 Oct, 10:00 – 11:00 am");
  });

  it("heads the picker with the day and the shop's hours on it", () => {
    expect(windowHeading(booking(), "2026-10-24")).toEqual({
      title: "When will you collect it?",
      sub: "Sat 24 October · the shop hands over between 10 am and 8 pm",
    });
    expect(windowHeading(booking({ delivery_mode: "owner_delivery" }), null).title).toBe("When should it arrive?");
  });

  it("explains each refusal", () => {
    const error = (code: string) => ({ status: 409, code, message: null, details: null });
    expect(windowErrorText(error("window_outside_hours"))).toMatch(/Pick another/);
    expect(windowErrorText(error("window_already_set"))).toMatch(/ask to change/);
    expect(windowErrorText(error("request_open"))).toMatch(/already waiting/);
  });

  it("shows a change the shop asked for, with the answer buttons when allowed", () => {
    const asked = booking({
      window_request: { by: "owner", start: "2026-10-24T06:30:00Z", end: "2026-10-24T07:30:00Z", asked_at: "2026-10-13T05:00:00Z" },
      can: ["answer_window_change", "cancel"],
    });
    expect(windowRequestCopy(asked)).toEqual({
      title: "The shop asked to move your arrival",
      body: "New time: Sat 24 Oct, 12:00 – 1:00 pm. Your time stays as it is unless you accept.",
      canAnswer: true,
    });
  });

  it("shows the customer's own request as waiting, with nothing to answer", () => {
    const mine = booking({
      window_request: { by: "customer", start: "2026-10-24T06:30:00Z", end: "2026-10-24T07:30:00Z", asked_at: "2026-10-13T05:00:00Z" },
    });
    expect(windowRequestCopy(mine)).toMatchObject({ canAnswer: false });
    expect(windowRequestCopy(booking())).toBeNull();
  });
});

describe("the booking screen", () => {
  it("says where a confirmed booking stands", () => {
    expect(bookingBanner(booking())).toEqual({
      tone: "success",
      title: "Booking confirmed",
      sub: "Collect Sat 24 Oct, 10:00 – 11:00 am",
    });
    expect(bookingBanner(booking({ window: null })).sub).toBe("Pick your arrival window.");
    expect(bookingBanner(booking({ delivery_mode: "owner_delivery" })).sub).toBe("Arrives Sat 24 Oct, 10:00 – 11:00 am");
  });

  it("follows the later stages", () => {
    expect(bookingBanner(booking({ stage: "ready" })).title).toBe("Ready for handover");
    expect(bookingBanner(booking({ stage: "out" }))).toMatchObject({
      title: "Rental active",
      sub: "Return by Mon 26 Oct, 8:00 pm",
    });
    expect(bookingBanner(booking({ stage: "returned" })).sub).toMatch(/within 48 hours/);
    expect(bookingBanner(booking({ stage: "closed" })).title).toBe("Rental complete");
  });

  it("tells each ending plainly", () => {
    expect(bookingBanner(booking({ stage: "accepted", exit: "lapsed_unpaid" }, { booking_amount_state: "kept" }))).toEqual({
      tone: "warning",
      title: "Booking lapsed",
      sub: "The rent was not paid in time. The ₹99 was kept.",
    });
    expect(
      bookingBanner(ringing("awaiting_payment", { exit: "cancelled_by_customer", exit_reason: "booking_amount_unpaid" })).title
    ).toBe("Request dropped");
    expect(bookingBanner(ringing("ringing", { exit: "cancelled_by_customer", exit_reason: "while_ringing" })).title).toBe(
      "Request cancelled"
    );
    expect(bookingBanner(booking({ exit: "cancelled_by_customer", exit_reason: "free" })).title).toBe("Booking cancelled");
    expect(bookingBanner(booking({ stage: "ready", exit: "no_show", exit_reason: "customer" })).title).toBe("Booking ended");
  });

  const dropped = (state: string, payments: BookingCustomer["payments"] = []) =>
    ringing("awaiting_payment", {
      exit: "cancelled_by_customer",
      exit_reason: "booking_amount_unpaid",
      payments,
      money: { ...booking().money, booking_amount_state: state },
    });

  it("does not say a dropped request was unpaid when it cannot know", () => {
    expect(bookingBanner(dropped("unpaid")).sub).toBe(
      "The payment did not arrive in time, so the owner was not asked. If money left your account, it comes back by itself."
    );
  });

  it("says the money is going back when it arrived after the request was dropped", () => {
    // The bank was slow: paid after the 15 minutes, and rn-api sends it back.
    expect(bookingBanner(dropped("refund_requested", booking().payments)).sub).toBe(
      "The ₹99 arrived after this request had ended, so the owner was not asked. It is going back to you."
    );
    expect(bookingBanner(dropped("refunded", booking().payments)).sub).toMatch(/It has been refunded\.$/);
    // The payment row says paid before the state has moved: still not "was not paid".
    expect(bookingBanner(dropped("unpaid", booking().payments)).sub).toMatch(/It is going back to you\.$/);
  });

  const timeline = [
    { event: "book", label: "Booked", at: "2026-10-13T04:11:00Z", by: "customer" },
    { event: "accept", label: "The owner accepted", at: "2026-10-13T04:13:00Z", by: "owner" },
    { event: "rent_paid", label: "Rent paid", at: "2026-10-13T04:22:00Z", by: "system" },
    { event: "set_window", label: "Arrival window picked", at: "2026-10-13T04:23:00Z", by: "customer" },
  ];

  it("lists what happened, then what comes next (BK-08)", () => {
    expect(timelineRows(booking({ timeline }), NOW)).toEqual([
      { label: "Booked", when: "9:41 am", state: "done" },
      { label: "The owner accepted", when: "9:43 am", state: "done" },
      { label: "Rent paid", when: "9:52 am", state: "done" },
      { label: "Arrival window picked", when: "Sat 24 Oct, 10:00 – 11:00 am", state: "done" },
      { label: "Deposit ₹3,000", when: "due Fri 23 Oct", state: "next" },
      { label: "Collect it", when: "Sat 24 Oct", state: "todo" },
      { label: "Return by", when: "Mon 26 Oct, 8:00 pm", state: "todo" },
    ]);
  });

  it("puts the arrival window first while it is not picked", () => {
    const rows = timelineRows(booking({ timeline: timeline.slice(0, 3), window: null }), NOW);
    expect(rows[3]).toEqual({ label: "Arrival window", when: "Not picked yet", state: "next" });
    expect(rows[4].state).toBe("todo");
  });

  it("dates a moment from another day", () => {
    const later = new Date("2026-10-20T06:00:00Z");
    expect(timelineRows(booking({ timeline }), later)[0].when).toBe("Tue 13 Oct, 9:41 am");
  });

  it("shows only what happened once a booking has ended", () => {
    const ended = booking({ timeline: timeline.slice(0, 2), stage: "accepted", exit: "lapsed_unpaid" });
    expect(timelineRows(ended, NOW).map((r) => r.state)).toEqual(["done", "done"]);
  });

  it("drops the steps already behind a rental that is out", () => {
    const out = booking({ stage: "out", timeline }, { deposit_state: "paid" });
    expect(timelineRows(out, NOW).slice(4)).toEqual([{ label: "Return by", when: "Mon 26 Oct, 8:00 pm", state: "next" }]);
  });

  it("shows a payment with how it was paid", () => {
    expect(moneyRowView(booking().payments[0], NOW)).toEqual({
      key: "pay_01",
      title: "₹99",
      sub: "Book now · 9:41 am",
      status: "Paid · UPI",
      tone: "success",
    });
  });

  it("shows a refund with its amount, where it is going and the days (N16)", () => {
    expect(
      moneyRowView(
        {
          id: "rfd_01JA2M0C5R8W2Y6N4H9K3G7TQA",
          kind: "refund",
          what: "booking_amount",
          amount: "99.00",
          status: "processed",
          text: "UPI asha@okhdfcbank",
          expected_days_min: 5,
          expected_days_max: 7,
          expected_by: "2026-10-21",
          at: "2026-10-12T10:47:09Z",
        },
        NOW
      )
    ).toEqual({
      key: "rfd_01JA2M0C5R8W2Y6N4H9K3G7TQA",
      title: "₹99 refund",
      sub: "Booking amount · to UPI asha@okhdfcbank · 5 to 7 working days · by Wed 21 Oct",
      status: "Sent",
      tone: "success",
    });
  });

  it("marks a refund still on its way, and one that failed", () => {
    const refund = { ...booking().payments[0], id: "rfd_02", kind: "refund" as const };
    expect(moneyRowView({ ...refund, status: "pending" }, NOW)).toMatchObject({ status: "On its way", tone: "warning" });
    expect(moneyRowView({ ...refund, status: "failed" }, NOW)).toMatchObject({ tone: "danger" });
  });

  it("lists the deposit as due while it is still to be paid", () => {
    const rows = paymentRows(booking(), NOW);
    expect(rows[rows.length - 1]).toEqual({
      key: "deposit-to-pay",
      title: "Deposit ₹3,000",
      sub: "Refundable · due Fri 23 Oct",
      status: "Due later",
      tone: "neutral",
    });
    expect(paymentRows(booking({}, { deposit_state: "due" }), NOW).pop()?.status).toBe("Due now");
    // Paid, none, or a booking that has ended: no such row.
    expect(paymentRows(booking({}, { deposit_state: "paid" }), NOW)).toHaveLength(1);
    expect(paymentRows(booking({ exit: "cancelled_by_customer" }), NOW)).toHaveLength(1);
  });

  it("says under Cancel booking what cancelling costs now", () => {
    expect(
      cancelHint({
        case: "free",
        back: [],
        kept: [{ what: "booking_amount", amount: "99.00", text: "The ₹99 is not returned" }],
        to_owner: "0.00",
        free_until: "2026-10-23T04:30:00Z",
      })
    ).toBe("Free until Fri 23 Oct, 10:00 am. The ₹99 is not returned.");
    expect(cancelHint({ case: "inside_24h", back: [], kept: [], to_owner: "610.00", free_until: null })).toBe(
      "₹610 goes to the owner. The rest is refunded."
    );
    expect(
      cancelHint({
        case: "after_accept",
        back: [],
        kept: [{ what: "booking_amount", amount: "99.00", text: null }],
        to_owner: "0.00",
        free_until: null,
      })
    ).toBe("₹99 is not returned.");
  });
});

describe("the deposit after a late return (review r1 #3)", () => {
  const late = { deposit: "3000.00", late_days: 2, late_fee: "1220.00" };

  it("what is kept for the late days, and what comes back", () => {
    expect(depositAfterLate(late)).toEqual({ deposit: 3000, days: 2, kept: 1220, back: 1780 });
    expect(depositAfterLate({ deposit: "3000.00", late_days: 0, late_fee: "0.00" })).toEqual({ deposit: 3000, days: 0, kept: 0, back: 3000 });
    // Never more than the deposit.
    expect(depositAfterLate({ deposit: "3000.00", late_days: 9, late_fee: "5490.00" })).toMatchObject({ kept: 3000, back: 0 });
    // A late fee with no late days on the booking is not counted, and missing fields are nothing.
    expect(depositAfterLate({ deposit: "3000.00", late_fee: "610.00" })).toMatchObject({ kept: 0, back: 3000 });
    expect(lateDaysLabel(1)).toBe("1 late day");
    expect(lateDaysLabel(2)).toBe("2 late days");
  });

  it("the returned booking says what comes back, never the whole deposit", () => {
    const returned = booking({ stage: "returned" }, { deposit_state: "paid", ...late });
    expect(bookingBanner(returned).sub).toBe(
      "₹1,780 of your ₹3,000 deposit comes back within 48 hours: ₹1,220 is kept for 2 late days, and any damage Renit agrees comes off too."
    );
    expect(timelineRows(returned, NOW).pop()).toMatchObject({ label: "₹1,780 of the deposit comes back" });
    expect(rentalNextLine(returned, NOW)).toBe("₹1,780 of the deposit comes back within 48 hours");
    // On time: the plain line.
    const onTime = booking({ stage: "returned" }, { deposit_state: "paid" });
    expect(bookingBanner(onTime).sub).toBe("Your deposit comes back within 48 hours, less any agreed damage.");
    expect(timelineRows(onTime, NOW).pop()).toMatchObject({ label: "Deposit comes back" });
    expect(rentalNextLine(onTime, NOW)).toBe("Deposit comes back within 48 hours");
  });

  it("says so when the late days took the whole deposit", () => {
    const gone = booking({ stage: "returned" }, { deposit_state: "paid", late_days: 6, late_fee: "3000.00" });
    expect(bookingBanner(gone).sub).toBe("Your ₹3,000 deposit is kept for 6 late days.");
    expect(timelineRows(gone, NOW).pop()).toMatchObject({ label: "Deposit kept for 6 late days" });
  });
});

describe("an extension's booking screen (review r1 #12)", () => {
  const extension = (over: Partial<BookingCustomer> = {}) =>
    booking({ extends: "RN-24831", first_day: "2026-10-27", last_day: "2026-10-29", window: null, ...over }, { deposit_state: "carried" });

  it("does not ask for an arrival window or say to collect an item the customer is holding", () => {
    const rows = timelineRows(extension(), NOW).map((row) => row.label);
    expect(rows).not.toContain("Arrival window");
    expect(rows).not.toContain("Collect it");
    expect(rows).toContain("Starts, the item stays with you");
    expect(bookingBanner(extension())).toEqual({
      tone: "success",
      title: "Extension confirmed",
      sub: "Starts Tue 27 Oct. The item stays with you.",
    });
    expect(rentalNextLine(extension(), NOW)).toBe("Starts Tue 27 Oct · the item stays with you");
  });

  it("leaves a first booking as it was", () => {
    const first = booking({ window: null });
    expect(timelineRows(first, NOW).map((row) => row.label)).toEqual(
      expect.arrayContaining(["Arrival window", "Collect it"])
    );
    expect(bookingBanner(first).sub).toBe("Pick your arrival window.");
    expect(rentalNextLine(first, NOW)).toBe("Pick your arrival window");
  });
});

describe("the Rentals tab", () => {
  it("names each stage on its pill, as BK-12 does", () => {
    expect(stagePill(ringing("ringing"))).toEqual({ label: "Asking the owner", tone: "warning" });
    expect(stagePill(ringing("calling")).label).toBe("Asking the owner");
    expect(stagePill(ringing("awaiting_payment")).label).toBe("Payment pending");
    expect(stagePill(ringing("waiting_to_open")).label).toBe("Asked at opening");
    expect(stagePill(booking({ stage: "accepted" }))).toEqual({ label: "Accepted", tone: "brand" });
    expect(stagePill(booking())).toEqual({ label: "Confirmed", tone: "brand" });
    expect(stagePill(booking({ stage: "ready" }))).toEqual({ label: "Ready", tone: "success" });
    expect(stagePill(booking({ stage: "out" })).label).toBe("Active");
    expect(stagePill(booking({ stage: "returned" })).label).toBe("Returned");
    expect(stagePill(booking({ stage: "closed" })).label).toBe("Completed");
  });

  it("names how a booking ended, whatever stage it stopped at", () => {
    expect(stagePill(ringing("ringing", { exit: "refused" })).label).toBe("Not available");
    expect(stagePill(ringing("ringing", { exit: "no_answer" })).label).toBe("No answer");
    expect(stagePill(booking({ exit: "cancelled_by_customer" })).label).toBe("Cancelled");
    expect(stagePill(booking({ exit: "cancelled_by_owner" })).label).toBe("Cancelled by owner");
    expect(stagePill(booking({ stage: "accepted", exit: "lapsed_unpaid" })).label).toBe("Lapsed");
    expect(stagePill(booking({ stage: "ready", exit: "no_show", exit_reason: "customer" })).label).toBe("No-show");
  });

  it("does not mark the customer when it was the owner who did not come", () => {
    expect(stagePill(booking({ stage: "ready", exit: "no_show", exit_reason: "owner" }))).toEqual({
      label: "Owner did not come",
      tone: "neutral",
    });
  });

  it("writes the shop and the dates under the name", () => {
    expect(rentalSubLine(booking())).toBe("SoundBox Rentals · Sat 24 – Mon 26 Oct");
  });

  it("says the next thing to do on a confirmed booking", () => {
    // BK-12: the deposit, once the window is picked.
    expect(rentalNextLine(booking(), NOW)).toBe("Deposit ₹3,000 due Fri 23 Oct");
    expect(rentalNextLine(booking({ window: null }), NOW)).toBe("Pick your arrival window");
    expect(rentalNextLine(booking({}, { deposit_state: "paid" }), NOW)).toBe("Collect Sat 24 Oct, 10:00 – 11:00 am");
  });

  it("says the next thing at every other stage", () => {
    expect(rentalNextLine(ringing("awaiting_payment"), NOW)).toBe("Pay ₹99 to ask the owner");
    expect(rentalNextLine(ringing("ringing"), NOW)).toBeNull();
    const waiting = ringing("waiting_to_open");
    waiting.shop.opens_at = OPENS;
    expect(rentalNextLine(waiting, NOW)).toBe("Asked at 10:00 am tomorrow");
    expect(
      rentalNextLine(
        booking(
          { stage: "accepted", pay_now: { purpose: "rent", amount: "1731.00", deposit_part: "0.00", due_at: "2026-10-13T04:43:00Z", payment: null } },
          { rent_paid: false }
        ),
        NOW
      )
    ).toBe("Pay ₹1,731 by 10:13 am");
    expect(rentalNextLine(booking({ stage: "ready" }, { deposit_state: "paid" }), NOW)).toBe(
      "Collect Sat 24 Oct, 10:00 – 11:00 am"
    );
    expect(rentalNextLine(booking({ stage: "out" }), NOW)).toBe("Return by Mon 26 Oct, 8:00 pm");
    expect(rentalNextLine(booking({ stage: "closed" }), NOW)).toBeNull();
  });

  it("reminds of the pick-by time while the 99 can still move", () => {
    const refused = ringing("ringing", { exit: "refused", pick_deadline_at: "2026-10-13T04:28:00Z" });
    expect(rentalNextLine(refused, NOW)).toBe("Pick another option by 9:58 am");
    refused.money.booking_amount_state = "refund_requested";
    expect(rentalNextLine(refused, NOW)).toBeNull();
    expect(rentalNextLine(booking({ exit: "cancelled_by_customer" }), NOW)).toBeNull();
  });

  it("has words for each of the server's two lists when it is empty", () => {
    expect(rentalsEmpty("open").title).toBe("No rentals yet");
    expect(rentalsEmpty("past").title).toBe("No past rentals yet");
  });
});

describe("an owner delivery's address", () => {
  const home = {
    id: 17,
    address: "Lodha Bellissimo, Mahalaxmi, Mumbai",
    address_line_1: "Flat 12B",
    address_line_2: "Opposite the race course",
    locality: "Mahalaxmi, Mumbai",
    address_type: "home" as const,
    label: "",
    coordinates: { lat: 18.9827, long: 72.8205 },
  };

  it("names the address in the summary line", () => {
    expect(bookingHow(booking())).toBe("Self pickup");
    expect(bookingHow(booking({ delivery_mode: "owner_delivery", delivery_address: home }))).toBe("Delivery to Home");
    expect(
      bookingHow(booking({ delivery_mode: "owner_delivery", delivery_address: { ...home, address_type: "other", label: "Studio" } }))
    ).toBe("Delivery to Studio");
    // A server that does not send the address yet.
    expect(bookingHow(booking({ delivery_mode: "owner_delivery", delivery_address: null }))).toBe("Delivery");
  });

  it("writes where it is delivered, as it was chosen at Book now", () => {
    expect(deliveryPlace(home)).toEqual({
      title: "Home",
      line: "Mahalaxmi, Mumbai · Flat 12B, Opposite the race course",
    });
    expect(deliveryPlace({ ...home, locality: "", address_line_1: "", address_line_2: "" })?.line).toBe(
      "Lodha Bellissimo, Mahalaxmi, Mumbai"
    );
    expect(deliveryPlace(null)).toBeNull();
  });
});

describe("how far ahead days can reach (T-25)", () => {
  const refusal = (fields: Record<string, string[]>) => ({ status: 400, code: "validation_error", message: "A field is missing or wrong.", details: { fields } });

  it("a booking or a search reaches at most 180 days ahead: the last day the pickers offer", () => {
    expect(BOOKING_DAYS_AHEAD).toBe(180);
    expect(lastBookableDay("2026-10-12")).toBe("2027-04-10");
    // The server accepts today + 180 and refuses the day after: the picker stops on the first.
    expect(lastBookableDay("2026-10-12") < "2027-04-11").toBe(true);
  });

  it("shows the server's own sentence when it still refuses the days (the quote, Book now, a search)", () => {
    expect(daysRefusal(refusal({ last_day: ["You can book up to 180 days ahead."] }))).toBe("You can book up to 180 days ahead.");
    expect(daysRefusal(refusal({ end_date: ["Pick days within the next 180 days."] }))).toBe("Pick days within the next 180 days.");
    expect(daysRefusal(refusal({ first_day: ["The first day is in the past."] }))).toBe("The first day is in the past.");
    expect(daysRefusal(refusal({ address_id: ["Delivery needs one of your saved addresses."] }))).toBeNull();
    expect(daysRefusal({ status: 409, code: "no_unit_free", message: null, details: null })).toBeNull();
    expect(daysRefusal(null)).toBeNull();
    expect(bookErrorText(refusal({ last_day: ["You can book up to 180 days ahead."] }))).toBe("You can book up to 180 days ahead.");
  });
});
