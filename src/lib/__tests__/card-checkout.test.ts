import { describe, expect, it } from "@jest/globals";
import { Quote, QuoteLine, datesBlocker, paySteps, plainLines, blockerText, requestedOn, reviewBlocker } from "@/lib/booking";
import {
  CHECKOUT_CAP,
  aloneNote,
  asOneItem,
  barLine,
  blockedNote,
  cardDays,
  cardPriceLines,
  depositOwnPage,
  fixLabel,
  lineAlone,
  lineBlock,
  lineChanges,
  lineChip,
  lineRefusalNote,
  madeOf,
  noDayAllFree,
  noDayNotice,
  notDeliveredReason,
  othersLine,
  refusalButton,
  refusalNotice,
  shortestOf,
  startLeftOut,
  wasAmount,
} from "@/lib/card-checkout";

const NOW = new Date("2026-10-22T10:00:00Z");

/** plan-v2 §6.2's card: camera, lens, tripod from Lens Lane, 3 days, delivery ₹200. */
const line = (over: Partial<QuoteLine> = {}): QuoteLine => ({
  product: "camera",
  n: 1,
  rate: "500.00",
  rent: "1500.00",
  deposit: "20000.00",
  units_free: 1,
  pickup_locality: "Andheri W",
  blockers: [],
  ...over,
});

const LINES = [
  line(),
  line({ product: "lens", n: 2, rate: "300.00", rent: "900.00", deposit: "5000.00" }),
  line({ product: "tripod", n: 3, rate: "100.00", rent: "300.00", deposit: "1000.00" }),
];

const quote = (over: Partial<Quote> = {}): Quote => ({
  product: "camera",
  first_day: "2026-10-24",
  last_day: "2026-10-26",
  days: 3,
  delivery_mode: "owner_delivery",
  rate: "900.00",
  rent: "2700.00",
  delivery: { status: "ok", fee: "200.00", distance_km: "6.0", offer_pickup: false },
  fee_shown: "135.00",
  fee_charged: "0.00",
  total: "2900.00",
  pay_now: "99.00",
  pay_after_accept: "2801.00",
  rent_pay_minutes: 30,
  ring_minutes: 10,
  cancel: { free_hours: 24, grace_minutes: 30, grace: false, day_rent: "900.00" },
  deposit: { amount: "26000.00", with_rent: false, due_on: "2026-10-24", refundable: true },
  units_free: 1,
  shop: { is_open: true, opens_at: null, book_for_morning: false, hours_first_day: { open: "10:00", close: "20:00" } },
  id_check: null,
  terms: { version: "2026-10", url: "https://simplyrenit.com/terms/rental", accepted: true },
  can_book: true,
  blockers: [],
  lines: LINES,
  ...over,
});

const TITLES: Record<string, string> = { camera: "Sony A7 IV camera", lens: "Sony FE 24-70 mm GM lens", tripod: "Manfrotto tripod" };
const titleOf = (name: string) => TITLES[name] ?? name;

describe("the card's calendar (D40)", () => {
  it("greys a day only when no included item is free, and dots the days some are", () => {
    const camera = [{ start_date: "2026-10-28", end_date: "2026-10-31" }];
    const lens = [{ start_date: "2026-10-31", end_date: "2026-11-01" }];
    const { none, some } = cardDays([camera, lens]);
    expect([...none]).toEqual(["2026-10-31"]);
    expect([...some].sort()).toEqual(["2026-10-28", "2026-10-29", "2026-10-30", "2026-11-01"]);
  });

  it("is one listing's booked days for Book Now, with nothing partial", () => {
    const { none, some } = cardDays([[{ start_date: "2026-10-28", end_date: "2026-10-29" }]]);
    expect([...none]).toEqual(["2026-10-28", "2026-10-29"]);
    expect(some.size).toBe(0);
  });

  it("offers every day with nothing included", () => {
    expect(cardDays([]).none.size).toBe(0);
  });

  it("takes the smallest included minimum", () => {
    const week = { name: "a", rate: "100", plans: [{ unit: "week" as const, price: "600", min: 1 }] };
    const days3 = { name: "b", rate: "100", plans: [{ unit: "day" as const, price: "100", min: 3 }] };
    expect(shortestOf([week, days3])?.name).toBe("b");
    expect(shortestOf([])).toBeUndefined();
  });
});

describe("the checkout cap (D7)", () => {
  it("starts the lines past the cap left in the cart", () => {
    const names = Array.from({ length: CHECKOUT_CAP + 2 }, (_, i) => `p${i}`);
    expect(startLeftOut(names)).toEqual([`p${CHECKOUT_CAP}`, `p${CHECKOUT_CAP + 1}`]);
    expect(startLeftOut(["a", "b"])).toEqual([]);
  });
});

describe("an item in the way", () => {
  it("tells reasons that block from those that send it on its own", () => {
    expect(lineBlock(line({ blockers: ["delivery_not_offered", "no_unit_free"] }))).toBe("no_unit_free");
    expect(lineBlock(line({ blockers: ["other_pickup_point"] }))).toBeNull();
    expect(lineAlone(line({ blockers: ["monthly_book_alone"] }))).toBe("monthly_book_alone");
    expect(lineBlock(undefined)).toBeNull();
  });

  it("names the item above the bar, and the button is the fix (G11)", () => {
    expect(blockedNote([{ title: "Manfrotto tripod", code: "no_unit_free" }])).toBe(
      "The Manfrotto tripod is booked on these dates. Leave it in your cart or pick other dates."
    );
    expect(blockedNote([{ title: "Sony FE 24-70 mm GM lens", code: "too_short", minDays: 4 }])).toBe(
      "The Sony FE 24-70 mm GM lens needs at least 4 days. Leave it in your cart or pick 4 days."
    );
    expect(blockedNote([{ title: "lens", code: "already_requested", number: "RN-21338" }])).toBe(
      "You already asked for this lens on these dates (RN-21338). Leave it in your cart to go on."
    );
    expect(blockedNote([{ title: "Manfrotto tripod", code: "no_unit_free" }], true)).toBe(
      "The last Manfrotto tripod was just booked for these dates."
    );
    expect(blockedNote([{ title: "a", code: "no_unit_free" }, { title: "b", code: "too_short" }])).toBe(
      "2 items can't go on these dates. Leave them in your cart or pick other dates."
    );
    expect(blockedNote([])).toBeNull();
    expect(fixLabel(1)).toBe("Leave it in cart and continue");
    expect(fixLabel(2, false)).toBe("Leave 2 items in cart");
  });

  it("chips say why, and the price screen says the item was just booked (CT-23b)", () => {
    expect(lineChip("no_unit_free")).toEqual({ text: "Not free on these dates", tone: "warning" });
    expect(lineChip("no_unit_free", { review: true })?.text).toBe("Just booked by someone else");
    expect(lineChip("too_short", { minDays: 4 })?.text).toBe("Minimum 4 days");
    expect(lineChip("already_requested", { number: "RN-21338" })?.text).toBe("You've requested this · RN-21338");
    expect(lineChip("other_pickup_point", { locality: "Bandra W" })?.text).toBe(
      "Collected from Bandra W · checked out separately"
    );
    expect(lineChip("left")).toEqual({ text: "Left in cart", tone: "neutral" });
    expect(lineChip("something_new")).toBeNull();
  });

  it("explains the items checked out on their own (CT-21d, e)", () => {
    expect(aloneNote([{ title: "Godox ring light 18 in", code: "other_pickup_point", locality: "Bandra W" }])).toBe(
      "The Godox ring light 18 in is collected from Bandra W, so it is checked out on its own. It stays in your cart."
    );
    expect(aloneNote([{ title: "Godrej sofa, monthly", code: "monthly_book_alone" }])).toBe(
      "The Godrej sofa, monthly is billed monthly, so it is booked on its own. It stays in your cart."
    );
    expect(aloneNote([])).toBeNull();
  });

  it("says which item keeps delivery off (CT-21c)", () => {
    expect(notDeliveredReason(["Manfrotto tripod"])).toBe(
      "The Manfrotto tripod is not delivered. Leave it in your cart to get delivery."
    );
    expect(notDeliveredReason(["a", "b"])).toBe("2 items are not delivered. Leave them in your cart to get delivery.");
  });
});

describe("no day has every item free (CT-40)", () => {
  const all = (from: string, to: string) => cardDays([[{ start_date: from, end_date: to }]]).none;

  it("names the item booked every day of the month on screen", () => {
    const lines = [
      { name: "Sony A7 IV camera", taken: new Set<string>() },
      { name: "Sony FE 24-70 mm GM lens", taken: all("2026-10-01", "2026-10-31") },
    ];
    expect(noDayAllFree("2026-10", "2026-10-22", "2027-04-20", lines)).toEqual({
      none: true,
      culprits: ["Sony FE 24-70 mm GM lens"],
    });
    expect(noDayNotice(3, ["Sony FE 24-70 mm GM lens"])).toEqual({
      title: "No day has all 3 items free",
      text: "The Sony FE 24-70 mm GM lens is booked every day this month. Leave it in your cart to pick dates for the rest.",
    });
  });

  it("counts only the days left from today, and finds none when the items take turns", () => {
    const lines = [
      { name: "a", taken: all("2026-10-22", "2026-10-26") },
      { name: "b", taken: all("2026-10-27", "2026-10-31") },
    ];
    expect(noDayAllFree("2026-10", "2026-10-22", "2027-04-20", lines)).toEqual({ none: true, culprits: [] });
    // November has free days for both.
    expect(noDayAllFree("2026-11", "2026-10-22", "2027-04-20", lines).none).toBe(false);
  });

  it("says nothing for one item, or a month before today", () => {
    expect(noDayAllFree("2026-10", "2026-10-22", "2027-04-20", [{ name: "a", taken: all("2026-10-01", "2026-10-31") }]).none).toBe(false);
    expect(noDayAllFree("2026-09", "2026-10-22", "2027-04-20", [{ name: "a", taken: new Set() }, { name: "b", taken: new Set() }]).none).toBe(false);
  });

  it("ends the year's month at December 31", () => {
    const lines = [
      { name: "a", taken: all("2026-12-01", "2026-12-31") },
      { name: "b", taken: new Set<string>() },
    ];
    expect(noDayAllFree("2026-12", "2026-10-22", "2027-04-20", lines).culprits).toEqual(["a"]);
  });
});

describe("the review, card mode (CT-22)", () => {
  it("draws G5's price panel", () => {
    expect(cardPriceLines(quote(), 3)).toEqual([
      { label: "Rent (3 items)", amount: "₹2,700" },
      { label: "Delivery", amount: "₹200" },
      { label: "Renit's fee", amount: "₹0", struck: "₹135" },
    ]);
    expect(cardPriceLines(quote({ delivery_mode: "pickup" }), 1)[0].label).toBe("Rent (1 item)");
    // ENG-343: items at mixed rates have no one rate to say.
    expect(cardPriceLines(quote({ rent_gst: "411.86", gst_rate: null }), 3)[0]).toEqual({
      label: "Rent (3 items)",
      amount: "₹2,700",
      note: "Includes GST ₹411.86",
    });
  });

  it("names the shop in the steps and lists what the deposit is made of", () => {
    const words = { shop: "Lens Lane", madeOf: madeOf(LINES, titleOf) };
    const steps = paySteps(quote(), false, NOW, words);
    expect(steps.map((s) => s.title)).toEqual(["Now", "After Lens Lane accepts", "Deposit"]);
    expect(steps[2].sub).toBe(
      "Refundable, due Sat 24 Oct\nMade of: Sony A7 IV camera ₹20,000 · Sony FE 24-70 mm GM lens ₹5,000 · Manfrotto tripod ₹1,000"
    );
    expect(madeOf([line()], titleOf)).toBeNull();
  });

  it("says the card's own plain lines: a partial accept gives the ₹99 back, a late day is every item's", () => {
    const lines = plainLines(quote(), false, { shop: "Lens Lane" });
    expect(lines).toContain("If Lens Lane says no, do not answer, or you cancel before they answer, the ₹99 comes back in full.");
    expect(lines).toContain(
      "If you don't pay the rent within 30 minutes of their yes, the request ends and Renit keeps the ₹99. If Lens Lane accepts only some items, the ₹99 comes back."
    );
    expect(lines).toContain("Each late day costs one day's rent of every item (₹900).");
    expect(lines.join(" ")).not.toMatch(/lapse/);
  });

  it("keeps Book Now's steps and lines as they were", () => {
    expect(paySteps(quote(), false, NOW)[1].title).toBe("After the owner accepts");
    expect(paySteps(quote(), false, NOW)[2].sub).toBe("Refundable, due Sat 24 Oct");
    expect(plainLines(quote())).toContain("If you do not pay the rent within 30 minutes of their yes, the booking lapses and Renit keeps the ₹99.");
  });

  it("says when the deposit is its own page, and when it can't go by UPI (CT-43a, D48)", () => {
    expect(depositOwnPage(quote())).toBeNull();
    expect(depositOwnPage(quote({ pay_after_accept: "7301.00", deposit: { amount: "106000.00", with_rent: false, due_on: "2026-10-24", refundable: true } }))).toEqual({
      title: "The deposit has its own page",
      text: "The deposit is a separate payment, due Sat 24 Oct. It is over ₹1 lakh, so pay it by card or net banking.",
    });
    expect(depositOwnPage(quote({ pay_after_accept: "10000.00", deposit: { amount: "95000.00", with_rent: false, due_on: null, refundable: true } }))?.text).toBe(
      "The deposit is a separate payment, due before the handover."
    );
    expect(depositOwnPage(quote({ deposit: { amount: "106000.00", with_rent: true, due_on: null, refundable: true } }))).toBeNull();
  });

  it("names the other shops whose items stay in the cart", () => {
    expect(othersLine({ items: 2, shops: ["Party Props", "HomeEase"] })).toBe(
      "Your 2 items from Party Props and HomeEase stay in your cart. Each shop is booked on its own."
    );
    expect(othersLine({ items: 1, shops: ["HomeEase"] })).toBe("Your item from HomeEase stays in your cart. Each shop is booked on its own.");
    expect(othersLine({ items: 0, shops: [] })).toBeNull();
    expect(othersLine(undefined)).toBeNull();
  });

  it("says the total isn't all due now (FIXES B2 row 16)", () => {
    expect(barLine(quote(), "Lens Lane")).toBe("3 days · ₹99 to book, the rest after Lens Lane accepts");
    expect(barLine(undefined, "Lens Lane")).toBeNull();
  });
});

describe("price changed at Book now (CT-23a)", () => {
  it("diffs every item's rate and deposit", () => {
    const now = quote({
      lines: [
        line({ rate: "600.00", rent: "1800.00" }),
        line({ product: "lens", n: 2, rate: "300.00", rent: "900.00", deposit: "8000.00" }),
        LINES[2],
      ],
    });
    expect(lineChanges(quote(), now)).toEqual({
      camera: ["Now ₹600 a day (was ₹500)"],
      lens: ["Deposit now ₹8,000 (was ₹5,000)"],
    });
    expect(lineChanges(null, now)).toEqual({});
  });

  it("strikes an amount only when it moved", () => {
    expect(wasAmount("2801.00", "3101.00")).toBe("₹2,801");
    expect(wasAmount("2801.00", "2801")).toBeUndefined();
    expect(wasAmount(undefined, "2801.00")).toBeUndefined();
  });
});

describe("refused for the whole card (CT-44)", () => {
  it("says nothing was booked, and the way on", () => {
    expect(refusalNotice("one_item_only", { shop: "Lens Lane", amount: "₹99", titleOf })).toEqual({
      title: "Lens Lane takes one item per booking for now",
      text: "Nothing was booked and no money was taken. Each item is booked on its own, with its own ₹99 and delivery fee. Your items stay in your cart.",
    });
    expect(refusalNotice("too_many_in_flight", { shop: "Lens Lane", amount: "₹99", details: { max: 3 }, titleOf })).toEqual({
      title: "You have 3 open requests",
      text: "Nothing was booked. Finish or cancel one of your 3 open requests first. Your items stay in your cart.",
    });
    expect(
      refusalNotice("already_requested", {
        shop: "Lens Lane",
        amount: "₹99",
        details: { product: "lens", number: "RN-21338" },
        titleOf,
      })
    ).toEqual({
      title: "You've already requested the Sony FE 24-70 mm GM lens",
      text: "Nothing was booked. Your request RN-21338 is for this Sony FE 24-70 mm GM lens on these dates. Leave it in your cart to book the rest.",
    });
    // The quote's blocker is a bare code: D49's cap of 3 stands in.
    expect(refusalNotice("too_many_in_flight", { shop: "Lens Lane", amount: "₹99", titleOf })?.title).toBe("You have 3 open requests");
    expect(refusalNotice("price_changed", { shop: "Lens Lane", amount: "₹99", titleOf })).toBeNull();
    expect(refusalButton("one_item_only")).toBe("Back to your cart");
    expect(refusalButton("too_many_in_flight")).toBe("See your open requests");
    expect(refusalButton("already_requested")).toBeNull();
  });
});

describe("Book Now on book_flow=card (D41)", () => {
  it("reads its one item's reasons as the quote's, so the screens say them as for `product`", () => {
    const one = quote({ lines: [line({ blockers: ["no_unit_free"] })], blockers: ["terms_not_accepted"] });
    expect(asOneItem(one).blockers).toEqual(["no_unit_free", "terms_not_accepted"]);
    expect(datesBlocker(asOneItem(one))).toBe("These dates are no longer free. Pick other dates.");
  });

  it("leaves a card of several items, a quote without lines, and a clean line alone", () => {
    const many = quote({ lines: [line({ blockers: ["no_unit_free"] }), LINES[1]] });
    expect(asOneItem(many)).toBe(many);
    const classic = quote({ lines: undefined });
    expect(asOneItem(classic)).toBe(classic);
    const clean = quote({ lines: [line()] });
    expect(asOneItem(clean)).toBe(clean);
  });

  it("has words for the server's new codes on both flows", () => {
    expect(blockerText("already_requested", { number: "RN-21338" })).toBe(
      "You already asked for this item on these dates (RN-21338). Pick other dates."
    );
    expect(datesBlocker(quote({ lines: undefined, blockers: ["already_requested"] }))).toBe(
      "You already asked for this item on these dates. Pick other dates."
    );
    expect(datesBlocker(quote({ lines: undefined, blockers: ["already_requested"] }), "RN-21338")).toBe(
      "You already asked for this item on these dates (RN-21338). Pick other dates."
    );
    expect(reviewBlocker(quote({ lines: undefined, blockers: ["already_requested"] }), "RN-21338")?.text).toBe(
      "You already asked for this item on these dates (RN-21338). Pick other dates."
    );
    expect(blockerText("too_many_in_flight", { max: 3 })).toBe("Finish or cancel one of your 3 open requests first.");
    expect(blockerText("too_many_in_flight", { max: 4 })).toBe("Finish or cancel one of your 4 open requests first.");
    expect(blockerText("too_many_in_flight")).toBe("Finish or cancel one of your 3 open requests first.");
    expect(blockerText("one_item_only")).toBe("This shop takes one item per booking for now. Book each item on its own.");
  });
});

describe("the other shops, as the cart sends them", () => {
  it("reads a count of shops too", () => {
    expect(othersLine({ items: 3, shops: 2 })).toBe("Your 3 items from 2 other shops stay in your cart. Each shop is booked on its own.");
    expect(othersLine({ items: 1, shops: 1 })).toBe("Your item from another shop stays in your cart. Each shop is booked on its own.");
  });
});

describe("the earlier request an already_requested is about", () => {
  const requested = { number: "RN-21338", first_day: "2026-10-24", last_day: "2026-10-26" };

  it("is named only when its days overlap the ones picked", () => {
    expect(requestedOn(requested, "2026-10-26", "2026-10-28")).toBe("RN-21338");
    expect(requestedOn(requested, "2026-10-20", "2026-10-24")).toBe("RN-21338");
    expect(requestedOn(requested, "2026-10-27", "2026-10-29")).toBeNull();
    expect(requestedOn(null, "2026-10-24", "2026-10-26")).toBeNull();
  });

  it("is the best guess without its days, or without a range", () => {
    expect(requestedOn({ number: "RN-21338" }, "2026-10-27", "2026-10-29")).toBe("RN-21338");
    expect(requestedOn(requested, "2026-10-27", null)).toBe("RN-21338");
  });
});

describe("Book now refused one of a card's items (CT-23b)", () => {
  const refused = (code: string, details: Record<string, unknown> | null) => ({ status: 409, code, message: null, details });

  it("names the item while the fresh quote comes", () => {
    expect(lineRefusalNote(refused("no_unit_free", { days: ["2026-10-24"], product: "lens" }), titleOf)).toBe(
      "The last Sony FE 24-70 mm GM lens was just booked for these dates."
    );
    expect(lineRefusalNote(refused("too_short", { min_days: 4, minimum: "4 days", product: "lens" }), titleOf)).toBe(
      "The Sony FE 24-70 mm GM lens needs at least 4 days. Leave it in your cart or pick 4 days."
    );
    expect(lineRefusalNote(refused("already_requested", { product: "lens", number: "RN-21338" }), titleOf)).toBe(
      "You already asked for this Sony FE 24-70 mm GM lens on these dates (RN-21338). Leave it in your cart to go on."
    );
  });

  it("leaves the rest to the usual words", () => {
    expect(lineRefusalNote(refused("no_unit_free", { days: ["2026-10-24"] }), titleOf)).toBeNull();
    expect(lineRefusalNote(refused("too_many_in_flight", { max: 3 }), titleOf)).toBeNull();
    expect(lineRefusalNote(refused("other_pickup_point", { product: "lens", locality: "Bandra W" }), titleOf)).toBeNull();
    expect(lineRefusalNote(null, titleOf)).toBeNull();
  });
});
