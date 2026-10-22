import { describe, expect, it } from "@jest/globals";
import { depositCopy } from "../day-of";
import { ProductShop, addressSheetLine, bookBy, courierQuote } from "../booking";
import {
  BookingCustomer,
  Quote,
  bookErrorText,
  quoteRefusal,
  bookRefusalIsFinal,
  bookingAmountCopy,
  bookingBanner,
  bookingHow,
  bookingView,
  cancelCopy,
  cancelErrorText,
  cancelHint,
  cancelOutcomeOf,
  refundPending,
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
  depositTerms,
  deliveryOption,
  depositAfterLate,
  lateDaysLabel,
  deliveryPlace,
  getItLine,
  depositDueWhen,
  handoverLine,
  priceBlock,
  howLabel,
  HANDOVER_ID,
  handoverIdLine,
  idCheckCopy,
  liveCopy,
  morningNotice,
  payButtonLabel,
  payPhaseText,
  paySteps,
  plainLines,
  monthlyLine,
  priceLines,
  rateLine,
  daysAllowed,
  daysInsideMinimum,
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
  totalLine,
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
  ring_minutes: 10,
  cancel: { free_hours: 24, grace_minutes: 30, grace: false, day_rent: "610.00" },
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
    const shop = { name: "SoundBox Rentals", maxKm: "5.0" };
    const ok = quote({ delivery: { status: "ok", fee: "170.00", distance_km: "8.0", offer_pickup: false } });
    expect(deliveryOption(ok, "Home", shop)).toEqual({ title: "Delivery to Home · ₹170 · 8 km", reason: null, ok: true });
    const far = quote({ delivery: { status: "too_far", fee: "0.00", distance_km: "8.4", offer_pickup: true } });
    expect(deliveryOption(far, "Home", shop)).toEqual({
      title: "Delivery to Home",
      reason: "SoundBox Rentals delivers up to 5 km. This address is 8.4 km away.",
      ok: false,
    });
    const none = quote({ delivery: { status: "not_offered", fee: "0.00", distance_km: null, offer_pickup: true } });
    expect(deliveryOption(none, "Home", shop)).toMatchObject({ reason: "SoundBox Rentals only offers self pickup.", ok: false });
    // No quote yet (no dates picked): the choice is offered, without a fee.
    expect(deliveryOption(undefined, "Work")).toEqual({ title: "Delivery to Work", reason: null, ok: true });
  });

  it("says why an area turned off can't have it delivered (ENG-284 D11)", () => {
    const off = quote({
      delivery: {
        status: "too_far",
        reason: "area_off",
        area: { pin: "400061", name: "Vesava" },
        fee: "0.00",
        distance_km: "3.2",
        offer_pickup: true,
      },
    });
    expect(deliveryOption(off, "Home", { name: "SoundBox Rentals", maxKm: "5.0" })).toEqual({
      title: "Delivery to Home",
      reason: "SoundBox Rentals doesn't deliver to Vesava (400061). You can pick it up 3.2 km away, or use another address.",
      ok: false,
    });
  });

  it("reads a status this build does not know as not available", () => {
    const newer = quote({ delivery: { status: "busy" as never, fee: "0.00", distance_km: null, offer_pickup: true } });
    expect(deliveryOption(newer, "Home", { name: "SoundBox Rentals" }).ok).toBe(false);
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
    // A shop open all day (stored "00:00" to "23:59") says so (test run D-13).
    const allDay = { open: "00:00", close: "23:59" };
    const week = { mon: allDay, tue: allDay, wed: allDay, thu: allDay, fri: allDay, sat: allDay, sun: allDay };
    expect(handoverLine(week)).toBe("Handover all day");
    expect(handoverLine({ ...week, sun: null })).toBe("Handover all day · Mon – Sat");
    expect(handoverLine({ ...week, sat: { open: "10:00", close: "14:00" }, sun: null })).toBe("Handover Mon – Fri all day, Sat 10 am – 2 pm");
    expect(handoverLine(week)).not.toMatch(/11:59/);
  });

  it("says how the item changes hands", () => {
    expect(getItLine(shop)).toBe("Self pickup or delivery from ₹50");
    expect(getItLine(shop, true)).toBe("Self pickup");
    expect(getItLine({ ...shop, delivers: false })).toBe("Self pickup");
    expect(getItLine(null)).toBe("Self pickup");
    // ENG-284: with an answer for the chosen address, that answer.
    expect(getItLine(shop, false, { to_me: true, fee: "110.00", km: "1.2" }, "Home")).toBe(
      "Self pickup or delivery to Home ₹110"
    );
    expect(getItLine(shop, false, { to_me: false, fee: null, km: "3.2" }, "Home")).toBe(
      "Self pickup · doesn't deliver to Home"
    );
    expect(getItLine(shop, false, null, "Home")).toBe("Self pickup or delivery from ₹50");
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
      { label: "Self pickup", amount: "Free" },
      { label: "Renit's fee", amount: "₹0", struck: "₹92" },
    ]);
  });

  it("says self pickup as itself, delivery with its fee, and leaves an extension's line as it was", () => {
    const delivered = quote({
      delivery_mode: "owner_delivery",
      delivery: { status: "ok", fee: "110.00", distance_km: "1.2", offer_pickup: false },
    });
    expect(priceLines(delivered)[1]).toEqual({ label: "Delivery", amount: "₹110" });
    expect(priceLines(quote(), true)[1]).toEqual({ label: "Delivery", amount: "₹0" });
  });

  it("never reads a delivery the shop stopped offering as ₹0 (ENG-284)", () => {
    const gone = quote({
      delivery_mode: "owner_delivery",
      delivery: { status: "too_far", fee: "0.00", distance_km: "2.8", offer_pickup: true, reason: "area_off", area: { pin: "400069", name: "Andheri East" } },
    });
    expect(priceLines(gone)[1]).toEqual({ label: "Delivery", amount: "Not available" });
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
      { title: "After the owner accepts", sub: "Within 30 minutes of their yes", amount: "₹1,731" },
      { title: "Deposit", sub: "Refundable, due Fri 23 Oct", amount: "₹3,000" },
    ]);
  });

  it("takes the rent window from the quote: no 30 is written in the app (P2-2)", () => {
    expect(paySteps(quote({ rent_pay_minutes: 45 }), false, NOW)[1].sub).toBe("Within 45 minutes of their yes");
    expect(paySteps(quote({ rent_pay_minutes: 1 }), false, NOW)[1].sub).toBe("Within 1 minute of their yes");
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
    expect(paySteps(soon, false, NOW)[2].sub).toBe("Refundable, paid with the rent");
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

  it("says before paying what Book now does with the 99, how long the owner has, and when it comes back (D-2, E-36, E-65)", () => {
    expect(plainLines(quote())).toEqual([
      "Book now pays ₹99 now, which counts toward the rent.",
      "The owner is rung and has up to 10 minutes to answer.",
      "If they say no, do not answer, or you cancel before they answer, the ₹99 comes back in full.",
      "If you do not pay the rent within 30 minutes of their yes, the booking lapses and Renit keeps the ₹99.",
      "Once they accept, cancelling up to 24 hours before pickup gives the rent back in full. Renit keeps the ₹99.",
      "Inside that time, one day's rent (₹610) goes to the owner for holding the dates, and the rest comes back.",
      "Each late day costs one day's rent.",
      "Returning early gives no refund.",
    ]);
  });

  it("bills a month plan a month at a time (ENG-282): month 1 after the accept, and the notice for ending early", () => {
    const monthly = quote({
      days: 180,
      rent: "10800.00",
      total: "10800.00",
      pay_after_accept: "10701.00",
      plan: { unit: "month", price: "1800.00", min: 6 },
      billing: "monthly",
      first_payment: "1701.00",
      notice: "1800.00",
    });
    expect(monthlyLine(monthly)).toBe("Month 1 now, then ₹1,800 a month");
    expect(paySteps(monthly)[1]).toEqual({
      title: "After the owner accepts",
      sub: "Month 1 · Within 30 minutes of their yes",
      amount: "₹1,701",
    });
    expect(totalLine(monthly)).toBe(
      "₹99 now, ₹1,701 after the owner accepts, ₹3,000 deposit (refundable). To start, deposit included: ₹4,800. Then ₹1,800 a month."
    );
    expect(plainLines(monthly).at(-1)).toBe("Ending before 6 months costs one month's rent (₹1,800).");
    expect(plainLines({ ...monthly, notice: null }).at(-1)).toBe(
      "You can end early: the month you are in is not refunded, and the months after are not charged."
    );
    // Upfront, and an older server's quote: as before.
    expect(monthlyLine(quote())).toBeNull();
    expect(monthlyLine({ ...monthly, billing: "upfront" })).toBeNull();
    expect(paySteps(quote())[1].amount).toBe("₹1,731");
  });

  it("never calls a cancel free while the 99 is kept, and has no 'not returned' (E-78)", () => {
    expect(plainLines(quote()).join(" ")).not.toMatch(/free|not returned/i);
  });

  it("takes the owner's minutes and the cancel numbers from the quote; an older server's quote loses the number, not the sentence", () => {
    expect(plainLines(quote({ ring_minutes: 5 }))[1]).toBe("The owner is rung and has up to 5 minutes to answer.");
    expect(plainLines(quote({ ring_minutes: 1 }))[1]).toBe("The owner is rung and has up to 1 minute to answer.");
    const old = plainLines(quote({ ring_minutes: undefined, cancel: undefined }));
    expect(old[1]).toBe("The owner is rung.");
    // No 24 made up: "a day".
    expect(old[4]).toBe("Once they accept, cancelling up to a day before pickup gives the rent back in full. Renit keeps the ₹99.");
    expect(old[5]).toBe("Inside that time, one day's rent goes to the owner for holding the dates, and the rest comes back.");
    expect(plainLines(quote({ rent_pay_minutes: undefined as unknown as number }))[3]).toBe(
      "If you do not pay the rent in time, the booking lapses and Renit keeps the ₹99."
    );
  });

  it("uses the singular for one hour and one minute", () => {
    const one = plainLines(quote({ ring_minutes: 1, rent_pay_minutes: 1, cancel: { free_hours: 1, grace_minutes: 1, grace: true, day_rent: "610.00" } }));
    expect(one[3]).toContain("within 1 minute of their yes");
    expect(one[4]).toContain("up to 1 hour before pickup");
    expect(one[6]).toBe("This pickup is under 1 hour away, so you have 1 minute after paying the rent to cancel and get the rent back.");
  });

  it("leaves out the rent's refund and the day's rent when the 99 covers the rent (nothing is paid after the accept)", () => {
    const covered = plainLines(quote({ rent: "60.00", total: "60.00", pay_now: "60.00", pay_after_accept: "0.00" }));
    expect(covered.join(" ")).not.toMatch(/rent back in full|one day's rent goes|do not pay the rent/);
    expect(covered).toContain("Once they accept, Renit keeps the ₹60 if you cancel up to 24 hours before pickup.");
  });

  it("says delivery, not pickup, for a delivery, and the 30-minute grace for a booking made for the next day (N7)", () => {
    const soon = plainLines(
      quote({ delivery_mode: "owner_delivery", cancel: { free_hours: 24, grace_minutes: 30, grace: true, day_rent: "610.00" } })
    );
    expect(soon[4]).toContain("24 hours before delivery");
    expect(soon[6]).toBe(
      "This delivery is under 24 hours away, so you have 30 minutes after paying the rent to cancel and get the rent back."
    );
  });

  it("says the grace counts from when the owner is asked, for a shop that is closed now", () => {
    const grace = { free_hours: 24, grace_minutes: 30, grace: true, day_rent: "610.00" };
    const lines = plainLines(quote({ shop: closed, cancel: grace }));
    expect(lines).toContain(
      "This pickup is under 24 hours after the owner is asked, so you have 30 minutes after paying the rent to cancel and get the rent back."
    );
    expect(lines.join(" ")).not.toMatch(/hours away/);
  });

  it("says the 99 already paid moves, when it does", () => {
    expect(plainLines(quote(), true).slice(0, 2)).toEqual([
      "Your ₹99 from the earlier request moves to this booking and counts toward the rent.",
      "The owner is rung and has up to 10 minutes to answer.",
    ]);
  });

  it("says a closed shop is asked when it opens, and keeps the change-of-mind line", () => {
    expect(plainLines(quote({ shop: closed })).slice(0, 4)).toEqual([
      "Book for the morning pays ₹99 now, which counts toward the rent.",
      "The owner is asked when they open and has up to 10 minutes to answer.",
      "If they say no, do not answer, or you cancel before they answer, the ₹99 comes back in full.",
      "Changed your mind? Cancel any time before they open and the ₹99 comes back.",
    ]);
  });

  it("adds up the whole booking in one line (E-65)", () => {
    expect(totalLine(quote())).toBe(
      "₹99 now, ₹1,731 after the owner accepts, ₹3,000 deposit (refundable). In all, deposit included: ₹4,830."
    );
    // No deposit, nothing after the accept (the 99 covers it all).
    const small = quote({
      rent: "60.00",
      total: "60.00",
      pay_now: "60.00",
      pay_after_accept: "0.00",
      deposit: { amount: "0.00", with_rent: false, due_on: null, refundable: true },
    });
    expect(totalLine(small)).toBe("₹60 now. In all: ₹60.");
    expect(totalLine(quote(), true)).toContain("₹99 already paid, ₹1,731 after");
    // Never the price panel's own word.
    expect(totalLine(quote())).not.toMatch(/\bTotal\b/);
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

  it("writes no minutes of its own: the owner's and the customer's come from the quote", () => {
    const words = [
      ...plainLines(quote({ ring_minutes: 7, rent_pay_minutes: 45 })),
      ...paySteps(quote({ rent_pay_minutes: 45 }), false, NOW).map((step) => step.sub),
    ].join(" ");
    expect(words).toMatch(/up to 7 minutes/);
    expect(words).toMatch(/Within 45 minutes of their yes/);
    expect(words).toMatch(/within 45 minutes of their yes, the booking lapses/);
    expect(words).not.toMatch(/\b(10|30) minutes/);
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
      "area_off",
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

  it("names the area a shop turned off, on the dates screen and at Book now (ENG-284)", () => {
    const off = quote({
      blockers: ["area_off"],
      delivery_mode: "owner_delivery",
      delivery: { status: "too_far", reason: "area_off", area: { pin: "400061", name: "Vesava" }, fee: "0.00", distance_km: "3.2", offer_pickup: true },
    });
    expect(datesBlocker(off)).toBe("This shop doesn't deliver to Vesava (400061). Choose self pickup.");
    expect(reviewBlocker(off)?.text).toBe("This shop doesn't deliver to Vesava (400061). Choose self pickup.");
    expect(blockerText("area_off")).toBe("This shop doesn't deliver to this area. Choose self pickup.");
    const said = { status: 409, code: "area_off", message: "This shop doesn't deliver to Juhu (400049). Choose self pickup.", details: null };
    expect(bookErrorText(said)).toBe("This shop doesn't deliver to Juhu (400049). Choose self pickup.");
    expect(bookErrorText({ ...said, message: null })).toBe("This shop doesn't deliver to this area. Choose self pickup.");
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
    // A second guard behind the 180-day check: the last day that can be booked comes with it.
    expect(bookErrorText(error("days_too_far", { until: "2027-04-09" }))).toBe("Bookings can be made up to Fri 9 Apr. Pick earlier days.");
    expect(bookErrorText(error("days_too_far"))).toBe("Bookings can be made up to 180 days ahead. Pick earlier days.");
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
  const withCheck = (needed: "none" | "id" | "id_and_match", passed: boolean | null, blockers: string[] = []) =>
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

  it("says nothing at all while no real check stands behind the answer (passed is null, T-41): no 'ID check passed', no 'needs an ID check'", () => {
    expect(idCheckCopy(withCheck("id", null))).toBeNull();
    expect(idCheckCopy(withCheck("id_and_match", null))).toBeNull();
    // The gates are the server's: a blocker it names, or a Book now refusal, still asks for the check.
    expect(idCheckCopy(withCheck("id", null, ["id_check_needed"]))?.state).toBe("needed");
    expect(idCheckCopy(withCheck("id", null), "id")?.state).toBe("needed");
  });

  it("tells the customer to bring an ID to a handover that needs the match, by itself, whatever `passed` says (e2e-B r2 finding 14)", () => {
    const line = "Bring a photo ID in your own name to the handover. The owner checks the name on it.";
    // True, false and null (no real check): the sentence stands without the card, and says nothing of a check.
    for (const passed of [true, false, null]) expect(handoverIdLine(withCheck("id_and_match", passed))).toBe(line);
    expect(line).not.toMatch(/check(?!s the name)/i);
    // Pricing an extension (the booking's number is `extends`): there is no handover, the item is already with the customer.
    for (const passed of [true, false, null]) expect(handoverIdLine(withCheck("id_and_match", passed), "RN-24831")).toBeNull();
    expect(handoverIdLine(withCheck("id_and_match", null), true)).toBeNull();
    expect(handoverIdLine(withCheck("id_and_match", null), null)).toBe(line);
    // Any other item, and signed out (the quote cannot say): nothing.
    expect(handoverIdLine(withCheck("id", null))).toBeNull();
    expect(handoverIdLine(withCheck("none", true))).toBeNull();
    expect(handoverIdLine(quote({ id_check: null, blockers: [] }))).toBeNull();
    // The cards no longer carry it (it is said once, under them).
    expect(idCheckCopy(withCheck("id_and_match", true))?.body).toBeNull();
    expect(idCheckCopy(withCheck("id_and_match", false))?.body).not.toMatch(/photo ID/);
    expect(HANDOVER_ID).toBe(line);
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
      kept: [{ what: "booking_amount", amount: "99.00", text: "Renit keeps the ₹99: the owner had already said yes" }],
      to_owner: "0.00",
      free_until: "2026-10-23T04:30:00Z",
    });
    expect(free.title).toBe("Cancel this booking?");
    expect(free.lines).toEqual([
      "₹1,731 goes back to UPI asha@okhdfcbank. Expect it in 5 to 7 working days.",
      "Renit keeps the ₹99: the owner had already said yes.",
    ]);
    const inside = cancelCopy({
      case: "inside_24h",
      back: [{ what: "rent", amount: "1220.00", text: null }],
      kept: [],
      to_owner: "610.00",
      to_owner_delivery: "0.00",
      free_until: null,
    });
    // Who gets the money and why (E-82): one day's rent, with the booking amount inside it.
    expect(inside.lines).toEqual([
      "₹1,220 goes back the way you paid.",
      "₹610 goes to the owner: one day's rent, for holding the dates. Your booking amount counts toward it.",
    ]);
  });

  it("does not call the owner's whole share one day's rent when the delivery fee is in it, or when it cannot tell (review 4)", () => {
    const base = { case: "inside_24h" as const, back: [], kept: [], to_owner: "780.00", free_until: null };
    expect(cancelCopy({ ...base, to_owner_delivery: "170.00" }).lines).toEqual([
      "₹780 goes to the owner: one day's rent (₹610) and the delivery fee (₹170), as they had set out. Your booking amount counts toward it.",
    ]);
    expect(cancelCopy(base).lines).toEqual(["₹780 goes to the owner for holding the dates."]);
  });

  it("the page after a cancel says what comes back, to where, in how many days, and what is kept (D-24)", () => {
    const done = {
      case: "free" as const,
      back: [{ what: "rent" as const, amount: "511.00", text: "UPI test@fakebank", expected_days_min: 1, expected_days_max: 5 }],
      kept: [{ what: "booking_amount" as const, amount: "99.00", text: "Renit keeps the ₹99: the owner had already said yes" }],
      to_owner: "0.00",
      free_until: null,
    };
    const cancelled = booking({ exit: "cancelled_by_customer", exit_reason: "free" });
    expect(bookingBanner(cancelled, done)).toEqual({
      tone: "neutral",
      title: "Booking cancelled",
      sub: "You cancelled this booking. ₹511 goes back to UPI test@fakebank. Expect it in 1 to 5 working days. Renit keeps the ₹99: the owner had already said yes.",
    });
    // Opened later, or on another phone: the plain line, and the refund row in the payments list.
    expect(bookingBanner(cancelled).sub).toBe("You cancelled this booking.");
    expect(bookingBanner(cancelled, null).sub).toBe("You cancelled this booking.");
    // A request cancelled while it rang.
    const ringingOutcome = { ...done, case: "ringing" as const, kept: [], back: [{ ...done.back[0], what: "booking_amount" as const, amount: "99.00" }] };
    expect(bookingBanner(booking({ exit: "cancelled_by_customer", exit_reason: "while_ringing" }), ringingOutcome).sub).toBe(
      "You cancelled before the owner answered. ₹99 goes back to UPI test@fakebank. Expect it in 1 to 5 working days."
    );
  });

  it("reads the same sentence back from the booking after the app was closed, or on another phone (D-28)", () => {
    const refund = {
      id: "r1",
      kind: "refund" as const,
      what: "rent" as const,
      amount: "511.00",
      status: "processed",
      text: "UPI test@fakebank",
      expected_days_min: 1,
      expected_days_max: 5,
      expected_by: "2026-10-19T00:00:00Z",
      at: "2026-10-12T17:23:00Z",
    };
    const cancelled = (reason: string, moneyOver = {}, payments = [refund]) =>
      booking({ exit: "cancelled_by_customer", exit_reason: reason, payments: [...booking().payments, ...payments] }, { booking_amount_state: "kept", ...moneyOver });
    // The tester's booking: ₹511 rent refunded to the UPI it came from, the ₹99 kept.
    expect(bookingBanner(cancelled("free")).sub).toBe(
      "You cancelled this booking. ₹511 goes back to UPI test@fakebank. Expect it in 1 to 5 working days. Renit keeps the ₹99: the owner had already said yes."
    );
    // The same words as the sentence made from the cancel's own answer, except for the server's own text of what is kept.
    expect(cancelOutcomeOf(cancelled("free"))).toMatchObject({
      case: "free",
      back: [{ what: "rent", amount: "511.00", text: "UPI test@fakebank", expected_days_min: 1, expected_days_max: 5 }],
      kept: [{ what: "booking_amount", amount: "99.00" }],
    });
    // Inside 24 hours: one day's rent went to the owner. The booking names the amount (money.owner_share)...
    expect(bookingBanner(cancelled("inside_24h", { booking_amount_state: "refunded", owner_share: "300.00" })).sub).toBe(
      "You cancelled this booking. ₹511 goes back to UPI test@fakebank. Expect it in 1 to 5 working days. ₹300 goes to the owner: one day's rent, for holding the dates. Your booking amount counts toward it."
    );
    // ...and from a server that does not give it yet, the sentence says it without an amount.
    expect(bookingBanner(cancelled("inside_24h", { booking_amount_state: "refunded" })).sub).toBe(
      "You cancelled this booking. ₹511 goes back to UPI test@fakebank. Expect it in 1 to 5 working days. One day's rent goes to the owner."
    );
    // A request cancelled while it rang: the ₹99 back, nothing kept.
    const rang = booking({ exit: "cancelled_by_customer", exit_reason: "while_ringing", payments: [{ ...refund, what: "booking_amount", amount: "99.00" }] }, { booking_amount_state: "refund_requested" });
    expect(bookingBanner(rang).sub).toBe(
      "You cancelled before the owner answered. ₹99 goes back to UPI test@fakebank. Expect it in 1 to 5 working days."
    );
    // Nothing on the booking yet (the refund row is a few seconds behind): only what is known.
    expect(bookingBanner(cancelled("free", { booking_amount_state: "refund_requested" }, [])).sub).toBe("You cancelled this booking.");
    expect(cancelOutcomeOf(booking({ payments: [] }))).toBeNull();
    // Read back from the booking, the delivery fee is what is over the day's rent (₹610).
    expect(bookingBanner(cancelled("inside_24h", { booking_amount_state: "refunded", owner_share: "780.00" })).sub).toContain(
      "₹780 goes to the owner: one day's rent (₹610) and the delivery fee (₹170), as they had set out."
    );
    // This run's own outcome wins over the reading (it has the owner's amount).
    const owner = { case: "inside_24h" as const, back: [], kept: [], to_owner: "610.00", to_owner_delivery: "0.00", free_until: null };
    expect(bookingBanner(cancelled("inside_24h"), owner).sub).toBe("You cancelled this booking. ₹610 goes to the owner: one day's rent, for holding the dates. Your booking amount counts toward it.");
  });

  it("waits for the refund row while the cancel promised money back (D-24)", () => {
    const outcome = {
      case: "free" as const,
      back: [{ what: "rent" as const, amount: "511.00", text: null }],
      kept: [],
      to_owner: "0.00",
      free_until: null,
    };
    const refund = { id: "r1", kind: "refund" as const, what: "rent" as const, amount: "511.00", status: "pending", text: null, expected_days_min: null, expected_days_max: null, expected_by: null, at: "2026-10-12T17:00:00Z" };
    expect(refundPending(booking({ payments: [] }), outcome)).toBe(true);
    expect(refundPending(booking({ payments: [refund] }), outcome)).toBe(false);
    // Nothing promised back, or nothing known: nothing to wait for.
    expect(refundPending(booking({ payments: [] }), { ...outcome, back: [] })).toBe(false);
    expect(refundPending(booking({ payments: [] }), null)).toBe(false);
    expect(refundPending(undefined, outcome)).toBe(false);
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
    ringing("ringing", { exit: "refused", exit_reason: "not_available", pick_deadline_at: "2026-10-13T04:28:00Z", ...over, money: { ...booking().money, booking_amount_state: state, booking_amount_refund_days: { min: 1, max: 5 } } });

  it("says the 99 moves with the customer until the pick-by time", () => {
    expect(bookingAmountCopy(refused("paid"), true)).toEqual({
      title: "Your ₹99",
      body: "It moves with you if you pick one of these. Pick nothing by 9:58 am and it goes back to UPI asha@okhdfcbank. Expect it in 1 to 5 working days.",
    });
  });

  it("says it goes back once it can no longer move, or was asked back", () => {
    expect(bookingAmountCopy(refused("paid"), false).body).toBe(
      "It goes back to UPI asha@okhdfcbank. Expect it in 1 to 5 working days."
    );
    // The figure is the server's, from the booking or from the refund row; the app has none of its own (D-11, E-75).
    const unknown = refused("paid");
    unknown.money = { ...unknown.money, booking_amount_refund_days: null };
    expect(bookingAmountCopy(unknown, false).body).toBe("It goes back to UPI asha@okhdfcbank.");
    expect(bookingAmountCopy(refused("paid"), false).body).not.toMatch(/5 to 7/);
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
      note: "Deposit ₹3,000, refundable, due Fri 23 Oct.",
      small: "If it isn't paid in time, the booking lapses and Renit keeps the ₹99.",
      button: "Pay ₹1,731",
    });
  });

  it("says month 1 alone for a monthly booking (ENG-282), so the lines add up to what is charged", () => {
    const monthly = accepted(
      { pay_now: { purpose: "rent", amount: "1851.00", deposit_part: "0.00", due_at: "2026-10-13T04:43:00Z", payment: null } },
      {
        rent: "10800.00",
        delivery_fee: "150.00",
        billing: "monthly",
        periods: [
          { booking: "RN-24831", n: 1, label: "Month 1", kind: "rent", first_day: "2026-10-24", last_day: "2026-11-22", amount: "1950.00", rent: "1800.00", state: "upcoming", link_on: null, pay_by: null, grace_ends: null, paid_at: null, linked_at: null },
        ],
      }
    );
    expect(payRentCopy(monthly, NOW).lines).toEqual([
      { label: "Month 1", amount: "₹1,950" },
      { label: "Already paid", amount: "₹99", amountTone: "success" },
    ]);
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

  it("says the deposit's timing one way on the review, the accepted screen and the next-day sentence (E-79)", () => {
    expect(depositTerms(false, "Fri 23 Oct")).toBe("refundable, due Fri 23 Oct");
    expect(depositTerms(true, null)).toBe("refundable, paid with the rent");
    const soon = accepted(
      { pay_now: { purpose: "rent_and_deposit", amount: "4901.00", deposit_part: "3000.00", due_at: "2026-10-13T04:43:00Z", payment: null } },
      { pay_after_accept: "1901.00" }
    );
    // The accepted screen and the review step carry the same words, the first with the amount in front.
    expect(payRentCopy(soon, NOW).note).toBe("Deposit ₹3,000, refundable, paid with the rent.");
    expect(paySteps(quote({ deposit: { amount: "3000.00", with_rent: true, due_on: null, refundable: true } }), false, NOW)[2].sub).toBe(
      "Refundable, paid with the rent"
    );
    expect(payRentCopy(accepted(), NOW).note).toBe("Deposit ₹3,000, refundable, due Fri 23 Oct.");
    // No date known: it still says when, never just "later".
    expect(payRentCopy(accepted({}, { deposit_ask_at: null, deposit_due_at: null }), NOW).note).toBe(
      "Deposit ₹3,000, refundable, due before the handover."
    );
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

  it("shows an expired request as ended, with nothing to answer", () => {
    const old = booking({
      window_request: { by: "owner", start: "2026-10-24T06:30:00Z", end: "2026-10-24T07:30:00Z", asked_at: "2026-10-13T05:00:00Z", expired: true },
      can: ["request_window_change", "cancel"],
    });
    expect(windowRequestCopy(old)).toEqual({
      title: "The shop asked to move your arrival",
      body: "This time has passed. The request has ended.",
      canAnswer: false,
    });
    expect(windowErrorText({ status: 409, code: "window_request_expired", message: null, details: null })).toBe(
      "This time has passed. The request has ended."
    );
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
      sub: "The rent was not paid in time. Renit kept the ₹99.",
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
      { label: "Deposit ₹3,000", when: "due Sat 24 Oct, 8:00 am", state: "next" },
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
    // ENG-282: a month's rent says which month, where the server names it.
    expect(moneyRowView({ ...booking().payments[0], what: "rent", label: "Month 3 rent" }, NOW).sub).toBe("Month 3 rent · 9:41 am");
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
      sub: "Refundable, due Sat 24 Oct, 8:00 am",
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
        kept: [{ what: "booking_amount", amount: "99.00", text: "Renit keeps the ₹99: the owner had already said yes" }],
        to_owner: "0.00",
        free_until: "2026-10-23T04:30:00Z",
      })
    ).toBe("Rent back in full until Fri 23 Oct, 10:00 am. Renit keeps the ₹99: the owner had already said yes.");
    const late = { case: "inside_24h" as const, back: [], kept: [], to_owner: "610.00", free_until: null };
    expect(cancelHint({ ...late, to_owner_delivery: "0.00" })).toBe("One day's rent (₹610) goes to the owner. The rest is refunded.");
    // An owner delivering who had set out keeps the delivery fee too: it is not all "one day's rent" (review 4).
    expect(cancelHint({ ...late, to_owner: "780.00", to_owner_delivery: "170.00" })).toBe(
      "₹780 goes to the owner: one day's rent and the delivery fee, as they had set out. The rest is refunded."
    );
    // An answer that cannot say: the amount, no name for it.
    expect(cancelHint(late)).toBe("₹610 goes to the owner. The rest is refunded.");
    expect(
      cancelHint({
        case: "after_accept",
        back: [],
        kept: [{ what: "booking_amount", amount: "99.00", text: null }],
        to_owner: "0.00",
        free_until: null,
      })
    ).toBe("Renit keeps the ₹99: the owner had already said yes.");
  });
});

describe("the deposit after a late return (review r1 #3)", () => {
  const late = { deposit: "3000.00", late_days: 2, late_fee: "1220.00" };

  it("what is kept for the late days, and what comes back", () => {
    expect(depositAfterLate(late)).toEqual({ deposit: 3000, days: 2, kept: 1220, notice: 0, back: 1780 });
    expect(depositAfterLate({ deposit: "3000.00", late_days: 0, late_fee: "0.00" })).toEqual({ deposit: 3000, days: 0, kept: 0, notice: 0, back: 3000 });
    // ENG-282: an unpaid notice comes after the late days, from what is left.
    expect(depositAfterLate({ ...late, notice_deduction: "1800.00" })).toMatchObject({ kept: 1220, notice: 1780, back: 0 });
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
    // ENG-282: an unpaid notice is kept too, said as such.
    const notice = booking({ stage: "returned" }, { deposit_state: "paid", deposit: "5000.00", notice_deduction: "1800.00" });
    expect(bookingBanner(notice).sub).toBe(
      "₹3,200 of your ₹5,000 deposit comes back within 48 hours: ₹1,800 is kept for the notice, and any damage Renit agrees comes off too."
    );
    const both = booking({ stage: "returned" }, { deposit_state: "paid", ...late, deposit: "5000.00", notice_deduction: "1800.00" });
    expect(bookingBanner(both).sub).toBe(
      "₹1,980 of your ₹5,000 deposit comes back within 48 hours: ₹1,220 is kept for 2 late days and ₹1,800 for the notice, and any damage Renit agrees comes off too."
    );
    expect(rentalNextLine(notice, NOW)).toBe("₹3,200 of the deposit comes back within 48 hours");
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
    expect(rentalNextLine(booking(), NOW)).toBe("Deposit ₹3,000 due Sat 24 Oct, 8:00 am");
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

describe("an extension whose quote the server refuses outright (409)", () => {
  const refused = (code: string | null, status = 409, message: string | null = null) => ({ status, code, message, details: null });

  it("shows the server's sentence for a rental already past its last day", () => {
    expect(quoteRefusal(refused("too_late_to_extend", 409, "It is too close to the time the item is due back to extend."))).toBe(
      "It is too close to the time the item is due back to extend."
    );
  });

  it("falls back to this app's words for the code when the answer carries none", () => {
    expect(quoteRefusal(refused("too_late_to_extend"))).toBe(
      "It is too close to the return time for the shop to answer. Return the item, then book it again."
    );
    expect(quoteRefusal(refused("claim_open"))).toMatch(/waiting for Renit's decision/);
  });

  it("is null for anything else: another code, another status, no answer", () => {
    expect(quoteRefusal(refused("no_unit_free"))).toBeNull();
    expect(quoteRefusal(refused("too_late_to_extend", 400))).toBeNull();
    expect(quoteRefusal(refused(null))).toBeNull();
    expect(quoteRefusal(null)).toBeNull();
  });
});

describe("the price block of the product page (BK-01; test run D-15)", () => {
  it("says the rate and, under it, the deposit as refundable, as the frame does", () => {
    expect(priceBlock("610.00", "3000.00")).toEqual({ rate: "₹610", deposit: "Deposit ₹3,000 · refundable" });
    expect(priceBlock(610, 3000)).toEqual({ rate: "₹610", deposit: "Deposit ₹3,000 · refundable" });
  });

  it("has no deposit line when there is no deposit to refund, and no block when the listing has no price yet", () => {
    expect(priceBlock("610.00", "0.00")).toEqual({ rate: "₹610", deposit: null });
    expect(priceBlock("610.00", null)).toEqual({ rate: "₹610", deposit: null });
    expect(priceBlock("610.00", undefined)).toEqual({ rate: "₹610", deposit: null });
    expect(priceBlock(null, "3000.00")).toBeNull();
    expect(priceBlock("", "3000.00")).toBeNull();
    expect(priceBlock(undefined, undefined)).toBeNull();
  });
});

describe("when the deposit is due, on every screen of a booking (test run D-18)", () => {
  // RN-20100: pickup on Wed 28 Oct, the window 2 to 3 pm picked. The server asks 24 hours before the window (Tue 27 Oct, 2 pm)
  // and the last moment to pay is 2 hours before it (Wed 28 Oct, 12:00 pm), both worked out again when the window was set.
  const ask = "2026-10-27T08:30:00Z";
  const due = "2026-10-28T06:30:00Z";
  const withWindow = booking(
    {
      window: { start: "2026-10-28T08:30:00Z", end: "2026-10-28T09:30:00Z", step: 60 } as never,
    },
    { deposit_ask_at: ask, deposit_due_at: due, deposit_state: "not_due" }
  );
  const noWindow = booking({ window: null }, { deposit_ask_at: ask, deposit_due_at: due, deposit_state: "not_due" });

  it("once a window is picked the timeline, the payment row and the list line say the deadline, as the Deposit due screen does", () => {
    const timeline = timelineRows(withWindow, NOW).find((row) => row.label === "Deposit ₹3,000");
    expect(timeline?.when).toBe("due Wed 28 Oct, 12:00 pm");
    const payment = paymentRows(withWindow, NOW).find((row) => row.key === "deposit-to-pay");
    expect(payment?.sub).toBe("Refundable, due Wed 28 Oct, 12:00 pm");
    expect(rentalNextLine({ ...withWindow, stage: "confirmed" }, NOW)).toBe("Deposit ₹3,000 due Wed 28 Oct, 12:00 pm");
    // The same moment the Deposit due screen prints: "Pay by Wed 28 Oct, 12:00 pm".
    expect(depositCopy(withWindow).payBy).toBe("Pay by Wed 28 Oct, 12:00 pm");
  });

  it("before any window exists the day Renit asks is kept, in the design's words ('due Tue 27 Oct')", () => {
    expect(depositDueWhen(noWindow.money, false)).toBe("Tue 27 Oct");
    expect(paymentRows(noWindow, NOW).find((row) => row.key === "deposit-to-pay")?.sub).toBe("Refundable, due Tue 27 Oct");
  });

  it("falls back to the ask day when the answer has no due moment, and to nothing when it has neither", () => {
    expect(depositDueWhen({ deposit_ask_at: ask, deposit_due_at: null }, true)).toBe("Tue 27 Oct");
    expect(depositDueWhen({ deposit_ask_at: null, deposit_due_at: null }, true)).toBeNull();
  });
});

describe("pricing plans (ENG-281)", () => {
  const weekly = quote({
    days: 10,
    rate: "357.14",
    rent: "3571.00",
    total: "3571.00",
    plan: { unit: "week", price: "2500.00", min: 1 },
  });

  it("names the plan that priced the rent, with its maths under it", () => {
    expect(priceLines(weekly)[0]).toEqual({ label: "Rent · 10 days, weekly rate", amount: "₹3,571" });
    expect(rateLine(weekly)).toBe("₹2,500 a week ÷ 7 = ₹357.14 a day");
    expect(rateLine(quote())).toBeNull();
    expect(priceLines(quote({ plan: { unit: "day", price: "610.00", min: 1 } }))[0].label).toBe("Rent · 3 days × ₹610");
  });

  it("says a late day costs the plan's price a day", () => {
    expect(plainLines(weekly)).toContain("Each late day costs ₹357.14, your plan's price a day.");
    expect(plainLines(quote())).toContain("Each late day costs one day's rent.");
  });

  it("keeps a return day inside the minimum from being picked", () => {
    const start = { first: "2026-10-24", last: null };
    expect(tapDay(start, "2026-10-25", new Set(), 3)).toEqual({ picked: start, blocked: false, short: true });
    expect(tapDay(start, "2026-10-26", new Set(), 3).picked).toEqual({ first: "2026-10-24", last: "2026-10-26" });
  });

  it("greys out the return days inside the minimum, and not the minimum's own last day", () => {
    expect(daysInsideMinimum("2026-10-24", 3)).toEqual(["2026-10-25"]);
    expect(daysInsideMinimum("2026-10-24", 1)).toEqual([]);
    expect(daysInsideMinimum("2026-10-24", 2)).toEqual([]);
    expect(daysInsideMinimum("2026-10-24", 7)).toHaveLength(5); // the 7th day, Fri 30, can be the return
  });

  it("allows a start within 180 days and a booking of up to a year", () => {
    const today = "2026-11-02";
    expect(daysAllowed("2027-05-01", "2027-05-01", today)).toBe(true);
    expect(daysAllowed("2027-05-02", "2027-05-02", today)).toBe(false);
    expect(daysAllowed("2026-11-07", "2027-11-06", today)).toBe(true); // 365 days
    expect(daysAllowed("2026-11-07", "2027-11-07", today)).toBe(false);
  });

  it("asks for more days when the dates are under the minimum", () => {
    expect(datesBlocker(quote({ blockers: ["too_short"], can_book: false, min_days: 3 }))).toBe("Pick at least 3 days.");
  });
});

describe("the Renit courier, customer side (unified delivery B1)", () => {
  const home = {
    id: 17,
    address: "Lodha Bellissimo, Mahalaxmi, Mumbai",
    address_line_1: "Flat 12B",
    address_line_2: "",
    locality: "Mahalaxmi, Mumbai",
    address_type: "home" as const,
    label: "",
    coordinates: { lat: 18.9827, long: 72.8205 },
  };
  const deliveryQuote = (by?: "shop" | "renit") =>
    quote({
      delivery_mode: "owner_delivery",
      delivery: { status: "ok", fee: by === "renit" ? "280.00" : "170.00", distance_km: by === "renit" ? null : "8.0", offer_pickup: false, ...(by ? { by } : {}) },
    });
  const delivered = (by?: "shop" | "renit", over: Partial<BookingCustomer> = {}, moneyOver: Partial<BookingCustomer["money"]> = {}) =>
    booking({ delivery_mode: "owner_delivery", delivery_address: home, ...(by ? { delivered_by: by } : {}), ...over }, moneyOver);
  const shop = { name: "SoundBox Rentals", maxKm: "5.0" };

  it("draws the courier's delivery card: both trips, GST in, no km, and the shop not at the door", () => {
    expect(deliveryOption(deliveryQuote("renit"), "Home", shop)).toEqual({
      title: "Delivery to Home · ₹280 · Renit courier partner",
      reason: null,
      ok: true,
      sub: "Drop-off and pickup included, GST included",
      note: "The shop won't be there: you check the item when it arrives",
    });
    // The shop's own delivery, and a server before B1, read as today.
    const today = { title: "Delivery to Home · ₹170 · 8 km", reason: null, ok: true };
    expect(deliveryOption(deliveryQuote("shop"), "Home", shop)).toStrictEqual(today);
    expect(deliveryOption(deliveryQuote(), "Home", shop)).toStrictEqual(today);
  });

  it("says why the courier refused, with no courier lines on the card", () => {
    const refused = quote({
      delivery_mode: "owner_delivery",
      delivery: { status: "too_far", fee: "0.00", distance_km: null, offer_pickup: true, reason: "courier_value", by: "renit" },
    });
    expect(deliveryOption(refused, "Home", shop)).toStrictEqual({
      title: "Delivery to Home",
      reason: "Items above ₹25,000 can't go by courier. You can pick it up from the shop.",
      ok: false,
    });
  });

  it("names the courier on the delivery row of the price, but not on an extension's", () => {
    expect(priceLines(deliveryQuote("renit"))[1]).toEqual({ label: "Renit courier partner", amount: "₹280" });
    expect(priceLines(deliveryQuote("renit"), true)[1]).toEqual({ label: "Delivery", amount: "₹280" });
    expect(priceLines(deliveryQuote("shop"))).toEqual(priceLines(deliveryQuote()));
    expect(priceLines(deliveryQuote())[1]).toEqual({ label: "Delivery", amount: "₹170" });
  });

  it("adds the courier's cancel rule to the plain lines, and leaves today's lines alone otherwise", () => {
    const today = plainLines(deliveryQuote());
    expect(plainLines(deliveryQuote("shop"))).toEqual(today);
    const courier = plainLines(deliveryQuote("renit"));
    const rule =
      "The Renit courier partner fee comes back in full if you cancel before a rider is assigned, or if the shop, the rider or Renit caused the cancel. Otherwise Renit keeps the fee for the trips already used and the rest comes back.";
    const after = today.findIndex((text) => text.startsWith("Inside that time"));
    expect(courier).toEqual([...today.slice(0, after + 1), rule, ...today.slice(after + 1)]);
    // Never that the delivery fee goes to the shop.
    expect(courier.join(" ")).not.toMatch(/delivery fee/);
  });

  it("is a courier quote only for an owner delivery the server gave to Renit", () => {
    expect(courierQuote(deliveryQuote("renit"))).toBe(true);
    expect(courierQuote(deliveryQuote("shop"))).toBe(false);
    expect(courierQuote(deliveryQuote())).toBe(false);
    expect(courierQuote({ ...deliveryQuote("renit"), delivery_mode: "pickup" })).toBe(false);
  });

  it("sends Book now the carrier it was quoted, and nothing more for a server before B1", () => {
    expect(bookBy(deliveryQuote("renit"))).toEqual({ delivery_by: "renit" });
    expect(bookBy(deliveryQuote("shop"))).toEqual({ delivery_by: "shop" });
    expect(bookBy(deliveryQuote())).toStrictEqual({});
    expect(bookBy({ ...deliveryQuote("renit"), delivery_mode: "pickup" })).toStrictEqual({});
  });

  it("says the product page's from-fee from the courier when the server sends one", () => {
    const productShop = { delivers: true, delivery_base_fee: "50.00" } as ProductShop;
    expect(getItLine(productShop, false, null, null, "280.00")).toBe("Self pickup or delivery from ₹280");
    expect(getItLine({ ...productShop, delivers: false }, false, null, null, "280.00")).toBe("Self pickup or delivery from ₹280");
    expect(getItLine(productShop, true, null, null, "280.00")).toBe("Self pickup");
    // Absent: today's line from the shop's base fee.
    expect(getItLine(productShop, false, null, null, null)).toBe(getItLine(productShop, false, null, null));
    expect(getItLine(productShop, false)).toBe("Self pickup or delivery from ₹50");
  });

  it("says the courier partner brings it, on the summary line, the banner, the card and the timeline", () => {
    expect(bookingHow(delivered("renit"))).toBe("Renit courier partner brings it to Home");
    expect(bookingHow(delivered("renit", { delivery_address: null }))).toBe("Renit courier partner brings it");
    expect(howLabel("owner_delivery", "Home", true)).toBe("Renit courier partner brings it to Home");
    expect(howLabel("pickup", null, true)).toBe("Self pickup");
    expect(bookingHow(delivered("shop"))).toBe("Delivery to Home");
    expect(bookingHow(delivered())).toBe("Delivery to Home");

    expect(bookingBanner(delivered("renit")).sub).toBe("Renit courier partner brings it Sat 24 Oct, 10:00 – 11:00 am");
    expect(bookingBanner(delivered()).sub).toBe("Arrives Sat 24 Oct, 10:00 – 11:00 am");
    expect(bookingBanner(delivered("shop"))).toEqual(bookingBanner(delivered()));

    const paid = { deposit_state: "paid" };
    expect(rentalNextLine(delivered("renit", {}, paid), NOW)).toBe("Renit courier partner brings it Sat 24 Oct, 10:00 – 11:00 am");
    expect(rentalNextLine(delivered(undefined, {}, paid), NOW)).toBe("Arrives Sat 24 Oct, 10:00 – 11:00 am");

    const label = (b: BookingCustomer) => timelineRows(b, NOW).map((row) => row.label);
    expect(label(delivered("renit", {}, paid))).toContain("Renit courier partner brings it");
    expect(label(delivered(undefined, {}, paid))).toContain("Delivery");
    expect(label(delivered("shop", {}, paid))).toEqual(label(delivered(undefined, {}, paid)));
    // The customer is never told a pack-by time.
    expect(JSON.stringify([bookingBanner(delivered("renit")), timelineRows(delivered("renit"), NOW)])).not.toMatch(/pack/i);
  });

  it("never says the delivery fee goes to the owner of a courier booking", () => {
    const base = { case: "inside_24h" as const, back: [], kept: [], to_owner: "610.00", free_until: null };
    // A server that split a share as if a delivery fee were in it: the courier's is Renit's, so none is the owner's.
    expect(cancelCopy({ ...base, to_owner_delivery: "170.00" }, true).lines).toEqual([
      "₹610 goes to the owner: one day's rent, for holding the dates. Your booking amount counts toward it.",
    ]);
    expect(cancelHint({ ...base, to_owner_delivery: "170.00" }, true)).toBe(
      "One day's rent (₹610) goes to the owner. Renit keeps the courier fee for any trips already used, and the rest is refunded."
    );
    // No split at all: the amount, no name for it, as today.
    expect(cancelCopy(base, true).lines).toEqual(cancelCopy(base).lines);
    expect(cancelHint(base, true)).toBe("₹610 goes to the owner. Renit keeps the courier fee for any trips already used, and the rest is refunded.");
    // The shop's own delivery keeps today's words.
    expect(cancelCopy({ ...base, to_owner: "780.00", to_owner_delivery: "170.00" }).lines[0]).toContain("and the delivery fee (₹170)");

    // Read back from the booking: a courier booking's owner share is rent only, never split into a delivery fee.
    const refund = { ...booking().payments[0], id: "ref_01", kind: "refund" as const, what: "rent" as const, amount: "511.00" };
    const cancelled = (by?: "shop" | "renit") =>
      delivered(by, { exit: "cancelled_by_customer", exit_reason: "inside_24h", payments: [refund] }, { owner_share: "780.00", booking_amount_state: "refunded" });
    expect(cancelOutcomeOf(cancelled("renit"))?.to_owner_delivery).toBe("0.00");
    expect(bookingBanner(cancelled("renit")).sub).not.toMatch(/delivery fee/);
    expect(cancelOutcomeOf(cancelled())?.to_owner_delivery).toBe("170.00");
    expect(bookingBanner(cancelled("shop"))).toEqual(bookingBanner(cancelled()));
  });

  it("says the courier trips already used are kept inside 24 hours, not that all the rest comes back", () => {
    const late = { case: "inside_24h" as const, back: [], kept: [], to_owner: "610.00", free_until: null };
    const kept = "Renit keeps the courier fee for any trips already used, and the rest is refunded.";
    expect(cancelHint({ ...late, to_owner_delivery: "0.00" }, true)).toBe(`One day's rent (₹610) goes to the owner. ${kept}`);
    expect(cancelHint(late, true)).toBe(`₹610 goes to the owner. ${kept}`);
    expect(cancelHint({ ...late, to_owner: "0.00" }, true)).toBe(kept);
    // Not a courier booking: today's words, word for word.
    expect(cancelHint({ ...late, to_owner_delivery: "0.00" })).toBe("One day's rent (₹610) goes to the owner. The rest is refunded.");
    expect(cancelHint(late)).toBe("₹610 goes to the owner. The rest is refunded.");
    expect(cancelHint({ ...late, to_owner: "0.00" })).toBe("The rest of what you paid is refunded.");
    // The other cases have no courier words.
    expect(cancelHint({ ...late, case: "ringing" }, true)).toBe(cancelHint({ ...late, case: "ringing" }));
  });

  it("heads the arrival window with the courier, not the shop's hours", () => {
    expect(windowHeading(delivered("renit"), "2026-10-24")).toEqual({
      title: "When should it arrive?",
      sub: "Sat 24 October · the Renit courier partner brings it in the window you pick",
    });
    const today = { title: "When should it arrive?", sub: "Sat 24 October · the shop hands over between 10 am and 8 pm" };
    expect(windowHeading(delivered("shop"), "2026-10-24")).toEqual(today);
    expect(windowHeading(delivered(), "2026-10-24")).toEqual(today);
    // A pickup is collected from the shop, whatever the field says.
    expect(windowHeading(booking({ delivered_by: "renit" }), "2026-10-24").sub).toContain("the shop hands over");
  });

  it("says who brings it to the address in the address picker", () => {
    const courier = "The Renit courier partner brings it here and collects it at the end.";
    const today = "The shop brings it here and collects it at the end.";
    expect(addressSheetLine(deliveryQuote("renit"))).toBe(courier);
    // Before any quote: a shop that doesn't deliver itself but has a from-price is the courier's.
    expect(addressSheetLine(undefined, { shop: { delivers: false }, delivery_from: "280.00" })).toBe(courier);
    expect(addressSheetLine(undefined, { shop: null, delivery_from: "280.00" })).toBe(courier);
    // A shop that delivers itself, with a from-price, waits for the quote to say who.
    expect(addressSheetLine(undefined, { shop: { delivers: true }, delivery_from: "280.00" })).toBe(today);
    expect(addressSheetLine(deliveryQuote("shop"), { shop: { delivers: true }, delivery_from: "170.00" })).toBe(today);
    // Field-absent: today's line.
    expect(addressSheetLine(deliveryQuote("shop"))).toBe(today);
    expect(addressSheetLine(deliveryQuote())).toBe(today);
    expect(addressSheetLine(undefined)).toBe(today);
    expect(addressSheetLine(undefined, { shop: { delivers: false } })).toBe(today);
    expect(addressSheetLine(undefined, { shop: { delivers: true }, delivery_from: null })).toBe(today);
  });

  it("adds the courier's kept trips to the free cancel hint", () => {
    const free = {
      case: "free" as const,
      back: [],
      kept: [{ what: "booking_amount" as const, amount: "99.00", text: "Renit keeps the ₹99: the owner had already said yes" }],
      to_owner: "0.00",
      free_until: "2026-10-23T04:30:00Z",
    };
    const today = "Rent back in full until Fri 23 Oct, 10:00 am. Renit keeps the ₹99: the owner had already said yes.";
    expect(cancelHint(free, true)).toBe(
      `${today} Renit keeps the courier fee for any trips already used, and the rest is refunded.`
    );
    expect(cancelHint(free)).toBe(today);
    expect(cancelHint({ ...free, kept: [], free_until: null }, true)).toBe(
      "Rent back in full if you cancel now. Renit keeps the courier fee for any trips already used, and the rest is refunded."
    );
    expect(cancelHint({ ...free, kept: [], free_until: null })).toBe("Rent back in full if you cancel now.");
  });
});
