import { describe, expect, it } from "@jest/globals";
import { BookingCustomer, BookingLine, CancelOutcome, cancelCopy, cancelHint, cancelOutcomeOf, payRentCopy } from "@/lib/booking";
import {
  basketActive,
  basketNextLine,
  basketPayRent,
  basketReturnNote,
  cancelHead,
  exitLineProduct,
  isBasket,
  lapseBanner,
  lapseNotice,
  leftOutChip,
  madeOf,
  moreBadge,
  notHereCopy,
  ownerCancelCopy,
  partlyAccepted,
  receivedBody,
  restOf,
  theItems,
  ticksCaption,
  ticksOf,
} from "@/lib/booking-lines";
import { activeCopy, dayOfCopy, depositCopy } from "@/lib/day-of";

const line = (n: number, title: string, rent: string, deposit: string, state: BookingLine["state"] = "live"): BookingLine => ({
  id: 100 + n,
  n,
  ref: `RN-21345·${n}`,
  product: { name: `PRO_${n}`, title, cover_image: null },
  rent,
  deposit,
  state,
});

const camera = line(1, "Sony A7 IV camera", "1500.00", "20000.00");
const lens = line(2, "Sony FE lens", "900.00", "5000.00");
const tripod = line(3, "Manfrotto tripod", "300.00", "1000.00");

/** Lens Lane's basket of the Figma story (RN-21345), accepted and waiting for the rent. */
const basket = (over: Partial<BookingCustomer> = {}, money: Partial<BookingCustomer["money"]> = {}): BookingCustomer => ({
  number: "RN-21345",
  stage: "accepted",
  ring_state: "",
  exit: "",
  exit_reason: "",
  exit_line: null,
  is_open: true,
  product: { name: "PRO_1", title: "Sony A7 IV camera + 2 more", cover_image: null },
  lines: [camera, lens, tripod],
  shop: {
    name: "Lens Lane",
    locality: "Andheri W",
    hours_first_day: null,
    hours_last_day: null,
    opens_at: null,
    address: null,
    coordinates: null,
  },
  first_day: "2026-10-24",
  last_day: "2026-10-26",
  days: 3,
  delivery_mode: "pickup",
  distance_km: "6.0",
  delivery_address: null,
  money: {
    rate: "900.00",
    rent: "2700.00",
    delivery_fee: "0.00",
    fee_shown: "135.00",
    fee_charged: "0.00",
    total: "2700.00",
    booking_amount: "99.00",
    booking_amount_state: "paid",
    booking_amount_refund_days: { min: 3, max: 5 },
    pay_after_accept: "2601.00",
    rent_pay_minutes: 30,
    rent_due_at: "2026-10-22T11:04:00Z",
    deposit: "26000.00",
    deposit_with_rent: false,
    deposit_state: "not_due",
    deposit_ask_at: "2026-10-23T04:30:00Z",
    deposit_due_at: "2026-10-24T02:30:00Z",
    deposit_refund_due_at: null,
    late_days: 0,
    late_fee: "0.00",
    damage_deduction: "0.00",
    ...money,
  },
  pay_now: { purpose: "rent", amount: "2601.00", deposit_part: "0.00", due_at: "2026-10-22T11:04:00Z", payment: null },
  payments: [],
  pick_deadline_at: null,
  cancels_left_today: 3,
  window: null,
  window_request: null,
  return_by: "2026-10-26T13:30:00Z",
  id_match_required: false,
  day: { call_number: null, call_from: null, my_status: "", their_status: "", no_show_from: null, handover_code: null },
  captures: { handover: { mine: false, theirs: false }, return: { mine: false, theirs: false } },
  claim_open: false,
  claims: [],
  extends: null,
  extensions: [],
  can: ["pay_rent", "cancel"],
  timeline: [],
  created_at: "2026-10-22T10:30:00Z",
  server_time: "2026-10-22T10:35:00Z",
  ...over,
});

/** The shop unticked the tripod: two of three, rent ₹2,400. */
const partial = (over: Partial<BookingCustomer> = {}, money: Partial<BookingCustomer["money"]> = {}) =>
  basket(
    { lines: [camera, lens, { ...tripod, state: "refused" }], pay_now: { purpose: "rent", amount: "2301.00", deposit_part: "0.00", due_at: "2026-10-22T11:04:00Z", payment: null }, ...over },
    { rent: "2400.00", total: "2400.00", pay_after_accept: "2301.00", deposit: "25000.00", ...money }
  );

/** One item, as every booking before the cart. */
const single = (over: Partial<BookingCustomer> = {}) =>
  basket({ product: { name: "PRO_1", title: "Sony A7 IV camera", cover_image: null }, lines: [camera], ...over });

// 4:05 pm in India on Thu 22 Oct 2026.
const NOW = new Date("2026-10-22T10:35:00Z");

describe("a basket's lines", () => {
  it("is a basket with more than one line in any state, and one line reads as before", () => {
    expect(isBasket(basket())).toBe(true);
    expect(isBasket(basket({ lines: [camera, { ...lens, state: "no_unit" }] }))).toBe(true);
    expect(isBasket(single())).toBe(false);
    expect(isBasket(basket({ lines: undefined }))).toBe(false);
  });

  it("counts the other live items on the thumb", () => {
    expect(moreBadge(basket())).toBe("+2");
    expect(moreBadge(partial())).toBe("+1");
    expect(moreBadge(basket({ lines: [camera, { ...lens, state: "refused" }] }))).toBeNull();
    expect(moreBadge(single())).toBeNull();
  });

  it("says what the one deposit is made of, live items only", () => {
    expect(madeOf(basket())).toBe("Sony A7 IV camera ₹20,000 · Sony FE lens ₹5,000 · Manfrotto tripod ₹1,000");
    expect(madeOf(partial())).toBe("Sony A7 IV camera ₹20,000 · Sony FE lens ₹5,000");
    expect(madeOf(single())).toBeNull();
  });

  it("names the items and why one is left out (G12)", () => {
    expect(theItems([lens])).toBe("the Sony FE lens");
    expect(theItems([camera, lens, tripod])).toBe("the Sony A7 IV camera, the Sony FE lens and the Manfrotto tripod");
    expect(leftOutChip({ ...tripod, state: "refused" })).toEqual({ label: "Not available · dates blocked", tone: "neutral" });
    expect(leftOutChip({ ...tripod, state: "no_unit" })).toEqual({ label: "No longer free", tone: "danger" });
  });
});

describe("the partial accept (CT-27, D11)", () => {
  it("is a basket the shop accepted with an item left out, rent unpaid", () => {
    expect(partlyAccepted(partial())).toBe(true);
    expect(partlyAccepted(basket())).toBe(false);
    expect(partlyAccepted(partial({ stage: "confirmed" }))).toBe(false);
    expect(partlyAccepted(partial({ exit: "lapsed_unpaid" }))).toBe(false);
  });

  it("PayRent names what was left out, the new sum, and the ₹99 that comes back", () => {
    const copy = basketPayRent(partial(), payRentCopy(partial(), NOW), NOW);
    expect(copy.title).toBe("Lens Lane can do 2 of 3 items");
    expect(copy.sub).toBe(
      "The Manfrotto tripod is not available. Pay ₹2,301 by 4:34 pm for the other 2, or cancel and get your ₹99 back."
    );
    expect(copy.button).toBe("Pay ₹2,301 for 2 items");
    expect(copy.small).toBe("If you don't pay by 4:34 pm, the request ends and your ₹99 comes back.");
    expect(copy.cancel).toBe("Cancel · ₹99 back");
    expect(copy.lines[0]).toEqual({ label: "Rent (2 items)", amount: "₹2,400", struck: "₹2,700" });
    expect(copy.total.amount).toBe("₹2,301");
    expect(copy.note).toContain("Made of: Sony A7 IV camera ₹20,000 · Sony FE lens ₹5,000.");
  });

  it("a full accept names every item, and the ₹99 is kept on a cancel", () => {
    const copy = basketPayRent(basket(), payRentCopy(basket(), NOW), NOW);
    expect(copy.title).toBe("Lens Lane accepted all 3 items");
    expect(copy.lines[0]).toEqual({ label: "Rent (3 items)", amount: "₹2,700", struck: undefined });
    expect(copy.cancel).toBe("Cancel · Renit keeps the ₹99");
  });

  it("leaves one item's PayRent exactly as it was", () => {
    const base = payRentCopy(single(), NOW);
    expect(basketPayRent(single(), base, NOW)).toEqual({ ...base, cancel: "Cancel booking" });
  });

  it("puts the partial accept on the Rentals card", () => {
    expect(basketNextLine(partial(), NOW)).toBe("Pay ₹2,301 for 2 of 3 items by 4:34 pm");
    expect(basketNextLine(basket(), NOW)).toBeNull();
  });
});

describe("cancelling a basket (CT-33)", () => {
  const outcome = (kase: CancelOutcome["case"]): CancelOutcome => ({
    case: kase,
    back: kase === "after_accept" ? [] : [{ what: "booking_amount", amount: "99.00", text: null }],
    kept: kase === "after_accept" ? [{ what: "booking_amount", amount: "99.00", text: null }] : [],
    to_owner: "0.00",
    free_until: null,
  });

  it("says the cancel covers every item, and whether they stay in the cart", () => {
    expect(cancelHead(outcome("ringing"), basket({ stage: "ringing" }))).toEqual({
      title: "Stops the request for all 3 items",
      sub: null,
      stay: "Your 3 items stay in your cart.",
    });
    expect(cancelHead(outcome("shop_changed"), partial())).toEqual({
      title: "Lens Lane can do 2 of your 3 items",
      sub: "The Manfrotto tripod is not available, so you can leave for free.",
      stay: "All 3 items stay in your cart.",
    });
    expect(cancelHead(outcome("after_accept"), basket())?.title).toBe("Cancels all 3 items");
    expect(cancelHead(outcome("free"), basket({ stage: "confirmed" }))).toEqual({
      title: "Cancels all 3 items",
      sub: "The Sony A7 IV camera, the Sony FE lens and the Manfrotto tripod. One item can't be cancelled on its own.",
      stay: null,
    });
    expect(cancelHead(outcome("ringing"), single())).toBeNull();
  });

  it("gives shop_changed its own button and line, and reads it back from the booking", () => {
    expect(cancelCopy(outcome("shop_changed")).confirm).toBe("Cancel · ₹99 back");
    expect(cancelCopy(outcome("after_accept")).confirm).toBe("Cancel booking");
    expect(cancelHint(outcome("shop_changed"))).toBe("The shop accepted only some items, so your ₹99 comes back in full.");
    const ended = partial(
      {
        exit: "cancelled_by_customer",
        exit_reason: "shop_changed",
        payments: [
          { id: "r1", kind: "refund", what: "booking_amount", amount: "99.00", status: "pending", text: null, expected_days_min: 3, expected_days_max: 5, expected_by: null, at: "2026-10-22T10:40:00Z" },
        ],
      },
      { booking_amount_state: "refund_requested" }
    );
    expect(cancelOutcomeOf(ended)?.case).toBe("shop_changed");
  });
});

describe("a basket's rent not paid (CT-29, G10)", () => {
  it("after a partial accept the ₹99 comes back, and says why", () => {
    const lapsed = partial({ stage: "accepted", exit: "lapsed_unpaid" }, { booking_amount_state: "refund_requested" });
    expect(lapseBanner(lapsed)).toEqual({ title: "The rent wasn't paid by 4:34 pm", sub: "So the request ended." });
    expect(lapseNotice(lapsed)).toEqual({
      tone: "success",
      title: "₹99 is on its way back to you (3-5 working days)",
      body: "Lens Lane could do only 2 of your 3 items, so the ₹99 comes back.",
    });
  });

  it("after a full accept Renit keeps it, said in a neutral tone", () => {
    const lapsed = basket({ exit: "lapsed_unpaid" }, { booking_amount_state: "kept" });
    expect(lapseNotice(lapsed)).toEqual({
      tone: "neutral",
      title: "Renit kept your ₹99",
      body: "Lens Lane had already said yes to all 3 items.",
    });
  });

  it("leaves one item's lapse to today's banner", () => {
    expect(lapseBanner(single({ exit: "lapsed_unpaid" }))).toBeNull();
    expect(lapseNotice(single({ exit: "lapsed_unpaid" }))).toBeNull();
  });
});

describe("the shop couldn't give one item (CT-47, D46)", () => {
  const rentRow = {
    id: "p2",
    kind: "payment" as const,
    what: "rent" as const,
    amount: "2601.00",
    status: "paid",
    text: null,
    expected_days_min: null,
    expected_days_max: null,
    expected_by: null,
    at: "2026-10-22T10:42:00Z",
  };
  const cancelled = (paid: boolean) =>
    basket({
      stage: paid ? "confirmed" : "accepted",
      exit: "cancelled_by_owner",
      exit_line: { id: lens.id, ref: lens.ref, title: lens.product.title },
      payments: paid ? [rentRow] : [],
    });

  it("names the item; with the rent unpaid only the ₹99 goes back", () => {
    expect(ownerCancelCopy(cancelled(false))).toEqual({
      title: "Lens Lane can't give the Sony FE lens",
      body: "So Lens Lane cancelled the request. Your ₹99 is going back to you.",
    });
    expect(ownerCancelCopy(cancelled(true))?.body).toBe("So Lens Lane cancelled the booking. Everything you paid is going back to you.");
    expect(ownerCancelCopy(basket({ exit: "cancelled_by_owner" }))).toBeNull();
  });

  it("books the rest without that item, and offers that item to the cart", () => {
    expect(restOf(cancelled(true))).toEqual(["PRO_1", "PRO_3"]);
    expect(exitLineProduct(cancelled(true))).toEqual(lens.product);
  });
});

describe("the day-of ticks (D44, CT-34, CT-45)", () => {
  const ready = basket({ stage: "ready" });

  it("sends nothing until every live item is ticked one way", () => {
    expect(receivedBody(ready, { [camera.id]: "got", [lens.id]: "got" })).toBeNull();
    expect(receivedBody(ready, { [camera.id]: "got", [lens.id]: "not_here", [tripod.id]: "got" })).toEqual({
      got: [camera.id, tripod.id],
      not_here: [lens.id],
    });
    // A left-out item is not ticked: the server names only live lines.
    expect(receivedBody(partial({ stage: "ready" }), { [camera.id]: "got", [lens.id]: "got" })).toEqual({
      got: [camera.id, lens.id],
      not_here: [],
    });
  });

  it("reads the server's ticks back, and counts them under the hidden code", () => {
    expect(ticksOf({ got: [camera.id], not_here: [lens.id] })).toEqual({ [camera.id]: "got", [lens.id]: "not_here" });
    expect(ticksCaption(ready, { [camera.id]: "got" })).toBe("Tick all 3 items to see your code · 1 of 3 ticked");
  });

  it("gives each Not here choice with its money", () => {
    const copy = notHereCopy(ready, lens);
    expect(copy.title).toBe("The Sony FE lens isn't here?");
    expect(copy.take.sub).toBe(
      "Your code shows for the Sony A7 IV camera and the Manfrotto tripod. After the handover, report the Sony FE lens: Renit can refund up to its rent (₹900). Its ₹5,000 deposit share comes back with your deposit."
    );
    expect(copy.refuse.sub).toBe("This refuses all 3 items, not only the Sony FE lens. Lens Lane takes everything back.");
  });

  it("says the day's title for the items", () => {
    expect(dayOfCopy(ready, NOW).title).toBe("Collect your 3 items on Sat 24 Oct");
    expect(dayOfCopy({ ...ready, delivery_mode: "owner_delivery" }, NOW).title).toBe("Your 3 items arrive on Sat 24 Oct");
    expect(dayOfCopy(single({ stage: "ready" }), NOW).title).toBe("Collect your Sony A7 IV camera on Sat 24 Oct");
  });
});

describe("the rental and the return of a basket (CT-35, CT-35b, CT-37)", () => {
  it("returns every item by one time, with one deposit made of the items", () => {
    const out = basket({ stage: "out" }, { deposit_state: "paid" });
    const copy = basketActive(out, activeCopy(out, null, NOW));
    expect(copy.title).toBe("3 items from Lens Lane");
    expect(copy.returnBy).toBe("Return these 3 items by Mon 26 Oct, 7:00 pm");
    expect(copy.button).toBe("Return these 3 items");
    expect(copy.deposit?.sub).toBe(
      "Held by Renit · back within 48 hours of closing. Made of: Sony A7 IV camera ₹20,000 · Sony FE lens ₹5,000 · Manfrotto tripod ₹1,000"
    );
    expect(basketReturnNote(out)).toContain("All 3 go back together.");
    const one = single({ stage: "out" });
    expect(basketActive(one, activeCopy(one, null, NOW))).toEqual(activeCopy(one, null, NOW));
    expect(basketReturnNote(one)).toBeNull();
  });

  it("the deposit page lists what the deposit is made of", () => {
    expect(depositCopy(basket({ stage: "confirmed" })).madeOf).toBe(
      "Made of: Sony A7 IV camera ₹20,000 · Sony FE lens ₹5,000 · Manfrotto tripod ₹1,000"
    );
    expect(depositCopy(single({ stage: "confirmed" })).madeOf).toBeNull();
  });
});
