import { describe, expect, it } from "@jest/globals";
import {
  Quote,
  bookErrorText,
  bookLabel,
  bookedDays,
  blockerText,
  clock,
  datesBlocker,
  datesLine,
  dayCount,
  dayLong,
  dayShort,
  deliveryOption,
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
  deposit: { amount: "3000.00", with_rent: false, due_on: "2026-10-23", refundable: true },
  units_free: 3,
  shop: { is_open: true, opens_at: null, book_for_morning: false, hours_first_day: { open: "10:00", close: "20:00" } },
  id_check: { needed: "id", passed: true },
  terms: { version: "2026-10", url: "https://simplyrenit.com/terms/rental", accepted: false },
  can_book: false,
  blockers: ["terms_not_accepted"],
  ...over,
});

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
    expect(bookErrorText(error("move_not_allowed"))).toMatch(/refunded/);
    expect(bookErrorText({ ...error("payments_unavailable"), status: 503 })).toMatch(/Nothing was booked/);
    // A code this build does not know: the server's own words.
    expect(bookErrorText(error("something_new"))).toBe("Server words.");
    expect(bookErrorText(null)).toMatch(/Check your connection/);
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

  it("offers Try again after a failed try", () => {
    expect(payButtonLabel("idle", "Pay ₹99")).toBe("Pay ₹99");
    expect(payButtonLabel("failed", "Pay ₹99")).toBe("Try again");
    expect(payButtonLabel("pending", "Pay ₹99")).toBe("Open the pay page again");
  });
});
