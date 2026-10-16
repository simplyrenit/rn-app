import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  Block,
  ComingBack,
  GoingOut,
  TodayFeed,
  blockCall,
  blockErrorText,
  blockHold,
  blockRowLine,
  blockLabel,
  clampQuantity,
  comingBackRow,
  depositPill,
  extendFrom,
  feedNow,
  filterPicker,
  freeText,
  goingOutRow,
  isQuiet,
  needsRow,
  removableBlocks,
  removeBlockCopy,
  returnedNotice,
  openLine,
  pickerProductFrom,
  reasonNote,
  ringingRow,
  startForm,
  waitingLine,
} from "../shop-today";

// 13 October 2026, 10:00 in India.
const NOW = new Date("2026-10-13T04:30:00Z");

const block: Block = {
  id: 88,
  product: { name: "PRO_tr1p0d", title: "Manfrotto tripod", shop_code: "TRI-04" },
  quantity: 1,
  first_day: "2026-10-11",
  last_day: "2026-10-13",
  reason: "walk_in",
  source: "quick",
  returned_at: null,
  waiting_back: true,
  created_at: "2026-10-11T06:00:00Z",
};

const open = { is_open: true, reason: "hours", opens_at: null, closes_at: "2026-10-13T14:30:00Z" };

describe("openLine: the Open switch's words", () => {
  it("says when an open shop closes, in India time", () => {
    expect(openLine(open, null)).toEqual({ line: "Open until 8:00 pm", hint: null });
    expect(openLine({ ...open, closes_at: null }, null).line).toBe("Open");
  });

  it("two missed requests in a row is told plainly, with the way out", () => {
    const copy = openLine({ is_open: false, reason: "missed_requests", opens_at: null, closes_at: null }, null);
    expect(copy.line).toBe("Closed after two missed requests");
    expect(copy.hint).toMatch(/Switch Open on/);
  });

  it("the other reasons a shop is closed", () => {
    const closed = { is_open: false, opens_at: null, closes_at: null };
    expect(openLine({ ...closed, reason: "manual" }, null)).toEqual({ line: "Closed by you", hint: null });
    expect(openLine({ ...closed, reason: "closed_until" }, "2026-10-20").line).toBe("Closed until 20 Oct");
    expect(openLine({ ...closed, reason: "closed_until" }, null).line).toBe("Closed for a holiday");
    expect(openLine({ ...closed, reason: "no_hours" }, null).line).toBe("Set your handover hours to open");
    expect(openLine({ ...closed, reason: "hours", opens_at: "2026-10-14T04:30:00Z" }, null, NOW).line).toBe(
      "Closed · opens tomorrow 10 am"
    );
    expect(openLine({ ...closed, reason: "hours" }, null).line).toBe("Closed outside your hours");
  });
});

describe("Today's lists", () => {
  const out: GoingOut = {
    number: "RN-24831",
    product_title: "Epson projector",
    customer_first_name: "Kabir",
    customer_last_initial: "A",
    delivery_mode: "pickup",
    stage: "ready",
    window: { start: "2026-10-13T04:30:00Z", end: "2026-10-13T05:30:00Z" },
    deposit_state: "paid",
  };

  it("a going-out row has the arrival window and the deposit", () => {
    expect(goingOutRow(out)).toEqual({
      number: "RN-24831",
      title: "Epson projector · Kabir A.",
      sub: "Arrives 10:00 – 11:00 am",
      pill: { label: "Deposit paid", tone: "success" },
    });
    expect(goingOutRow({ ...out, delivery_mode: "owner_delivery" }).sub).toBe("Deliver 10:00 – 11:00 am");
    expect(goingOutRow({ ...out, window: null, deposit_state: "due" })).toMatchObject({
      sub: "No arrival time picked yet",
      pill: { label: "Deposit due", tone: "warning" },
    });
    expect(goingOutRow({ ...out, customer_last_initial: "" }).title).toBe("Epson projector · Kabir");
  });

  it("says the deposit in one small word, and nothing for an item with none", () => {
    expect(depositPill("none")).toBeNull();
    expect(depositPill("not_due")?.label).toBe("Deposit not asked yet");
    expect(depositPill("carried")?.label).toBe("Deposit carried");
    expect(depositPill("forfeited")?.tone).toBe("warning");
  });

  const back: ComingBack = {
    number: "RN-24790",
    product_title: "Sony PS5",
    customer_first_name: "Isha",
    customer_last_initial: "T",
    stage: "out",
    return_by: "2026-10-12T14:30:00Z",
    late_days: 1,
    deposit_state: "paid",
  };

  it("a late return says when it was due and how late it is", () => {
    expect(comingBackRow(back, NOW)).toEqual({
      number: "RN-24790",
      title: "Sony PS5 · Isha T.",
      sub: "Was due yesterday, 8:00 pm",
      pill: { label: "1 day late", tone: "danger" },
    });
    expect(comingBackRow({ ...back, late_days: 3, return_by: "2026-10-10T14:30:00Z" }, NOW)).toMatchObject({
      sub: "Was due on Sat 10 Oct, 8:00 pm",
      pill: { label: "3 days late" },
    });
  });

  it("a return that is due today says by when", () => {
    expect(comingBackRow({ ...back, late_days: 0, return_by: "2026-10-13T12:30:00Z" }, NOW)).toMatchObject({
      sub: "Back by 6:00 pm",
      pill: { label: "Due today", tone: "neutral" },
    });
    expect(comingBackRow({ ...back, late_days: 0, return_by: null }, NOW).sub).toBe("Due today");
  });

  it("bookings waiting for the shop to open are one line each", () => {
    expect(waitingLine({ ring_at: "2026-10-14T04:30:00Z", count: 3 }, NOW)).toBe("Ringing tomorrow 10 am: 3 bookings");
    expect(waitingLine({ ring_at: "2026-10-13T11:30:00Z", count: 1 }, NOW)).toBe("Ringing today 5 pm: 1 booking");
  });

  it("a ringing card says what it is and what it earns", () => {
    const ring = {
      product: { title: "Sony PS5" },
      first_day: "2026-10-24",
      last_day: "2026-10-26",
      customer: { first_name: "Aarav" },
      you_earn: "1830.00",
    } as never;
    expect(ringingRow(ring)).toEqual({ title: "Sony PS5", sub: "Sat 24 – Mon 26 Oct · Aarav", earn: "₹1,830" });
  });

  it("knows a quiet day", () => {
    const feed: TodayFeed = {
      date: "2026-10-13",
      open,
      ringing: [],
      waiting_to_ring: [],
      going_out: [],
      coming_back: [],
      needs_you: [],
    };
    expect(isQuiet(feed)).toBe(true);
    expect(isQuiet({ ...feed, needs_you: [{ kind: "no_hours", text: "No hours" }] })).toBe(false);
  });
});

describe("needsRow: what each item offers", () => {
  it("opens the booking for a late return that leaves a booking with no unit, and for a time request", () => {
    expect(needsRow({ kind: "late_no_unit", booking: "RN-24840", text: "PS5 is late" }, 0)).toMatchObject({
      icon: "warning",
      action: { kind: "booking", number: "RN-24840" },
    });
    expect(needsRow({ kind: "window_request", booking: "RN-24831", text: "Aarav asked to move his arrival" }, 1)).toMatchObject({
      icon: "clock",
      action: { kind: "booking", number: "RN-24831" },
    });
  });

  it("asks 'Is it back?' of a walk-in block", () => {
    const row = needsRow({ kind: "block_back", block, text: "Is it back? Tripod, walk-in block ended today" }, 0);
    expect(row.action).toEqual({ kind: "block_back", block });
    expect(row.key).toBe("block_back-88");
  });

  it("sends flagged products and prices to My products, and missing hours to the hours screen", () => {
    expect(needsRow({ kind: "flagged_products", count: 3, text: "3 products flagged by the check" }, 0).action).toEqual({
      kind: "products",
    });
    expect(needsRow({ kind: "rates_to_confirm", count: 2, text: "2 prices to confirm" }, 0).action).toEqual({ kind: "products" });
    expect(needsRow({ kind: "no_hours", text: "Set your hours" }, 0).action).toEqual({ kind: "hours" });
  });

  it("starts the photo walk-through from '42 drafts need photos'", () => {
    expect(needsRow({ kind: "drafts_need_photos", count: 42, text: "42 drafts need photos" }, 0)).toEqual({
      key: "drafts_need_photos-0",
      icon: "camera",
      text: "42 drafts need photos",
      action: { kind: "photos" },
    });
  });

  it("opens the Shop address screen from 'Confirm your shop's address'", () => {
    expect(needsRow({ kind: "address_unconfirmed", text: "Confirm your shop's address" }, 0)).toMatchObject({
      icon: "warning",
      action: { kind: "address" },
    });
  });

  it("shows a claim and a kind it does not know as their words alone", () => {
    for (const kind of ["claim_deadline", "something_new"]) {
      expect(needsRow({ kind, text: "Some words" }, 4)).toMatchObject({ icon: "info", text: "Some words", action: null });
    }
  });

  it("a late booking without its number, or a block without its object, has nothing to open", () => {
    expect(needsRow({ kind: "late_no_unit", text: "x" }, 0).action).toBeNull();
    expect(needsRow({ kind: "block_back", text: "x" }, 0).action).toBeNull();
  });
});

describe("the quick block", () => {
  const form = { ...startForm(NOW), product: { name: "PRO_tr1p0d", title: "Canon R6 body", quantity: 2 } };

  it("starts as 'Rented at the counter': one unit, today, a walk-in", () => {
    expect(startForm(NOW)).toEqual({ product: null, quantity: 1, lastDay: "2026-10-13", reason: "walk_in" });
  });

  it("says how many are free to block", () => {
    expect(freeText(1, 2)).toBe("1 of 2 is free to block");
    expect(freeText(2, 8)).toBe("2 of 8 are free to block");
    expect(freeText(undefined, 2)).toBeNull();
    expect(blockLabel(1)).toBe("Block 1 unit");
    expect(blockLabel(3)).toBe("Block 3 units");
  });

  it("keeps the number of units inside what is free, and at least one", () => {
    expect(clampQuantity(3, 2)).toBe(2);
    expect(clampQuantity(0, 2)).toBe(1);
    expect(clampQuantity(5, 0)).toBe(1);
    expect(clampQuantity(5, undefined)).toBe(5);
    expect(clampQuantity(2.9, 8)).toBe(2);
  });

  it("makes the one-tap counter call for a walk-in of one unit", () => {
    expect(blockCall({ ...form, lastDay: "2026-10-15" }, NOW)).toEqual({
      path: "counter",
      body: { product: "PRO_tr1p0d", last_day: "2026-10-15" },
    });
  });

  it("makes the general block for more units or another reason, always from today", () => {
    expect(blockCall({ ...form, quantity: 2, lastDay: "2026-10-15" }, NOW)).toEqual({
      path: "block",
      body: { product: "PRO_tr1p0d", quantity: 2, first_day: "2026-10-13", last_day: "2026-10-15", reason: "walk_in" },
    });
    expect(blockCall({ ...form, reason: "repair" }, NOW)).toMatchObject({
      path: "block",
      body: { reason: "repair", quantity: 1, first_day: "2026-10-13", last_day: "2026-10-13" },
    });
  });

  it("makes no call without an item", () => {
    expect(blockCall(startForm(NOW), NOW)).toBeNull();
  });

  it("holds the button for no item, a past day, or no unit free", () => {
    expect(blockHold(startForm(NOW), undefined, NOW)).toBe("Pick the item first.");
    expect(blockHold({ ...form, lastDay: "2026-10-12" }, 2, NOW)).toBe("Pick today or a later day.");
    expect(blockHold(form, 0, NOW)).toBe("No unit is free on these days.");
    expect(blockHold(form, 1, NOW)).toBeNull();
    // The count is not known yet: the server checks it at the tap.
    expect(blockHold(form, undefined, NOW)).toBeNull();
  });

  it("explains what happens at the end of each kind of block", () => {
    expect(reasonNote("walk_in")).toMatch(/ask if it's back/);
    expect(reasonNote("repair")).toBe("It ends by itself after its last day.");
  });

  it("offers Extend only after the block's last day, and never in the past", () => {
    expect(extendFrom({ last_day: "2026-10-13" }, NOW)).toBe("2026-10-14");
    // A walk-in that ran over days ago: from tomorrow.
    expect(extendFrom({ last_day: "2026-10-09" }, NOW)).toBe("2026-10-14");
    // A block that still has days left.
    expect(extendFrom({ last_day: "2026-10-16" }, NOW)).toBe("2026-10-17");
  });

  it("reads the server's refusals", () => {
    const failure = (status: number, code: string | null, details: Record<string, unknown> | null = null): ApiError => ({
      status,
      code,
      message: null,
      details,
    });
    expect(blockErrorText(failure(409, "only_n_free", { free: 1 }))).toBe("Only 1 is free on those days.");
    expect(blockErrorText(failure(409, "only_n_free", { free: 2 }))).toBe("Only 2 are free on those days.");
    expect(blockErrorText(failure(409, "only_n_free", { free: 0 }))).toBe("No unit is free on those days.");
    expect(blockErrorText(failure(400, "validation_error"))).toMatch(/Check the day/);
    expect(blockErrorText(failure(0, null))).toMatch(/couldn't reach Renit/);
    expect(blockErrorText(failure(500, null))).toMatch(/Something went wrong/);
  });
});

describe("feedNow: the day words come from the server's date (P3-17)", () => {
  it("is midday in India on the feed's date, whatever the phone's clock says", () => {
    const phoneWrong = new Date("2026-10-20T01:00:00Z");
    expect(feedNow({ date: "2026-10-13" }, phoneWrong).toISOString()).toBe("2026-10-13T06:30:00.000Z");
  });

  it("makes yesterday and tomorrow right on a phone a week out", () => {
    const now = feedNow({ date: "2026-10-13" }, new Date("2026-10-20T04:30:00Z"));
    const back: ComingBack = {
      number: "RN-1",
      product_title: "Sony PS5",
      customer_first_name: "Isha",
      customer_last_initial: "T",
      stage: "out",
      return_by: "2026-10-12T14:30:00Z",
      late_days: 1,
      deposit_state: "paid",
    };
    expect(comingBackRow(back, now).sub).toBe("Was due yesterday, 8:00 pm");
    expect(waitingLine({ ring_at: "2026-10-14T04:30:00Z", count: 2 }, now)).toBe("Ringing tomorrow 10 am: 2 bookings");
  });

  it("falls back to the phone's clock without a date", () => {
    const phone = new Date("2026-10-13T04:30:00Z");
    expect(feedNow(null, phone)).toBe(phone);
    expect(feedNow({ date: "" }, phone)).toBe(phone);
  });
});

describe("the item picker reads the owner's own listings (review round 1, finding 3)", () => {
  it("takes a live or paused listing, with its code and units", () => {
    expect(pickerProductFrom({ name: "PRO_1", title: "Canon R6 body", status: "live", quantity: 2, shop_code: "CAM-01" })).toEqual({
      name: "PRO_1",
      title: "Canon R6 body",
      shop_code: "CAM-01",
      quantity: 2,
      status: "live",
    });
    expect(pickerProductFrom({ name: "PRO_2", title: "Tripod", status: "paused" })?.quantity).toBe(1);
  });

  it("reads a server that sends no status as live, and no units as one", () => {
    expect(pickerProductFrom({ name: "PRO_3", title: "Lens" })).toMatchObject({ status: "live", quantity: 1, shop_code: "" });
  });

  it("leaves out what cannot be blocked: a draft, a listing in the check, a flagged or an archived one", () => {
    for (const status of ["draft", "checking", "flagged", "archived"]) {
      expect(pickerProductFrom({ name: "PRO_4", title: "X", status })).toBeNull();
    }
    expect(pickerProductFrom(null)).toBeNull();
    expect(pickerProductFrom({ title: "No name" })).toBeNull();
  });

  it("searches the title or the code, any case, and lists by title", () => {
    const products = [
      { name: "a", title: "Tripod", shop_code: "TRI-04", quantity: 1, status: "live" },
      { name: "b", title: "Canon R6 body", shop_code: "CAM-01", quantity: 2, status: "live" },
      { name: "c", title: "Manfrotto tripod", shop_code: "", quantity: 1, status: "paused" },
    ];
    expect(filterPicker(products, "").map((p) => p.name)).toEqual(["b", "c", "a"]);
    expect(filterPicker(products, " TRIPOD ").map((p) => p.name)).toEqual(["c", "a"]);
    expect(filterPicker(products, "cam-0").map((p) => p.name)).toEqual(["b"]);
    expect(filterPicker(products, "nothing")).toEqual([]);
  });
});

describe("blocks: the server's sentences, what follows Returned, and taking one off (lane F)", () => {
  const failure = (status: number, code: string | null, details: Record<string, unknown> | null = null): ApiError => ({
    status,
    code,
    message: null,
    details,
  });
  const block = (over: Partial<import("../shop-today").Block> = {}): import("../shop-today").Block => ({
    id: 88,
    product: { name: "PRO_tr1p0d", title: "Manfrotto tripod", shop_code: "TRI-04" },
    quantity: 1,
    first_day: "2026-10-13",
    last_day: "2026-10-15",
    reason: "walk_in",
    source: "quick",
    returned_at: null,
    waiting_back: false,
    created_at: "2026-10-13T06:00:00Z",
    ...over,
  });

  it("a refused block shows the server's own sentence for the field, not fixed words", () => {
    const paused = failure(400, "validation_error", { fields: { product: ["This product is paused, so nobody can book it. Resume it to block days."] } });
    expect(blockErrorText(paused)).toBe("This product is paused, so nobody can book it. Resume it to block days.");
    const far = failure(400, "validation_error", { fields: { last_day: ["A block can reach at most 365 days ahead."] } });
    expect(blockErrorText(far)).toBe("A block can reach at most 365 days ahead.");
    // No field named: the fixed line.
    expect(blockErrorText(failure(400, "validation_error"))).toBe("Check the day and the number of units, then try again.");
  });

  it("extending a block that has already ended says the server's sentence (409 block_ended)", () => {
    const ended = { ...failure(409, "block_ended"), message: "This block has ended. Make a new one." };
    expect(blockErrorText(ended)).toBe("This block has ended. Make a new one.");
    expect(blockErrorText(failure(409, "block_ended"))).toBe("This block has ended. Make a new one.");
  });

  it("after Returned, a block that has not ended keeps today's unit taken: free from tomorrow, not from today", () => {
    // Began today, ends today (a counter rental returned the same day): the answer's last day is today.
    expect(returnedNotice(block({ first_day: "2026-10-13", last_day: "2026-10-13" }), "2026-10-13")).toEqual({
      title: "Manfrotto tripod is back",
      message: "Today's unit stays blocked. It can be booked again from tomorrow.",
    });
    // One that ran on past today ends today when returned: the answer's last day is today too.
    expect(returnedNotice(block({ last_day: "2026-10-13" }), "2026-10-13").message).toBe("Today's unit stays blocked. It can be booked again from tomorrow.");
    // A walk-in already past its last day has nothing left to hold.
    expect(returnedNotice(block({ first_day: "2026-10-10", last_day: "2026-10-12" }), "2026-10-13").message).toBe("It can be booked again.");
  });

  it("offers to take off the shop's own blocks, soonest first, and leaves a listing's own dates to the listing", () => {
    const listed = [block({ id: 3, first_day: "2026-10-20" }), block({ id: 2, source: "listing" }), block({ id: 1, first_day: "2026-10-11" })];
    expect(removableBlocks(listed).map((b) => b.id)).toEqual([1, 3]);
    expect(removableBlocks(undefined)).toEqual([]);
  });

  it("describes a block in a line, and a walk-in that waits for 'Is it back?'", () => {
    expect(blockRowLine(block(), "2026-10-13")).toBe("1 unit · Rented at the counter · from today until Thu 15 Oct");
    expect(blockRowLine(block({ quantity: 2, reason: "repair", first_day: "2026-10-20", last_day: "2026-10-22" }), "2026-10-13")).toBe(
      "2 units · Repair · from Tue 20 Oct until Thu 22 Oct"
    );
    expect(blockRowLine(block({ waiting_back: true, last_day: "2026-10-12" }), "2026-10-13")).toBe("1 unit · Rented at the counter · ended Mon 12 Oct, waiting for you");
  });

  it("says plainly what taking off a block that has begun does", () => {
    const began = removeBlockCopy(block(), "2026-10-13");
    expect(began.title).toBe("Take this block off?");
    expect(began.body).toContain("It has begun. Taking it off is for a block made by mistake");
    expect(began.body).toContain("every day it held, today included, can be booked again straight away");
    const future = removeBlockCopy(block({ first_day: "2026-10-20", last_day: "2026-10-22" }), "2026-10-13");
    expect(future.body).toContain("It goes as if it had never been made, and its days can be booked again.");
    expect(future.body).not.toContain("It has begun");
  });
});
