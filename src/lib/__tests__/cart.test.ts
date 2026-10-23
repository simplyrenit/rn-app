import { afterEach, describe, expect, it } from "@jest/globals";
import {
  Cart,
  CartCard,
  CartLine,
  addFailure,
  afterBookRoutes,
  cardDeposit,
  cardNote,
  cartLine,
  cartSize,
  checkoutDates,
  checkoutLines,
  forgetDates,
  lineNote,
  rememberDates,
  rememberSearchDates,
  waitingForRent,
  withLine,
  withoutLine,
} from "../cart";

const lensLane = { key: "lenslane", name: "Lens Lane", locality: "Andheri W", delivers: true, verified: true };
const partyProps = { key: "partyprops", name: "Party Props", locality: "Lokhandwala", delivers: false, verified: false };

const product = (name: string, rate = "500.00", deposit = "20000.00") => ({
  name,
  title: name,
  cover_image: null,
  rate,
  deposit,
});
const line = (name: string, warning: CartLine["warning"] = null, rate?: string, deposit?: string): CartLine => ({
  product: product(name, rate, deposit),
  warning,
  booking: warning?.code === "in_checkout" ? warning.booking : null,
  added_at: "2026-10-24T10:00:00Z",
});

const cart: Cart = {
  count: 3,
  cards: [
    { shop: lensLane, warning: null, lines: [line("camera"), line("lens", null, "300.00", "5000.00")] },
    { shop: partyProps, warning: null, lines: [line("fog", null, "400.00", "3000.00")] },
  ],
};

describe("the cart before the server answers", () => {
  it("puts a new line at the end of its shop's card and that card first", () => {
    const next = withLine(cart, partyProps, product("bubbles"));
    expect(next.count).toBe(4);
    expect(next.cards.map((c) => c.shop.key)).toEqual(["partyprops", "lenslane"]);
    expect(next.cards[0].lines.map((l) => l.product.name)).toEqual(["fog", "bubbles"]);
  });

  it("starts a card for a shop not in the cart yet", () => {
    const next = withLine(cart, { ...partyProps, key: "homeease", name: "HomeEase" }, product("fridge"));
    expect(next.cards.map((c) => c.shop.key)).toEqual(["homeease", "lenslane", "partyprops"]);
  });

  it("adds nothing for a line already there, as the server does", () => {
    expect(withLine(cart, lensLane, product("camera"))).toBe(cart);
  });

  it("removes a line, and its card with the last one", () => {
    const next = withoutLine(cart, "fog");
    expect(next.count).toBe(2);
    expect(next.cards.map((c) => c.shop.key)).toEqual(["lenslane"]);
    expect(withoutLine(cart, "nothing")).toBe(cart);
  });

  it("finds a line by product", () => {
    expect(cartLine(cart, "lens")?.product.rate).toBe("300.00");
    expect(cartLine(cart, "nothing")).toBeNull();
    expect(cartLine(undefined, "lens")).toBeNull();
  });
});

describe("what the cart says", () => {
  it("counts items and shops", () => {
    expect(cartSize(cart)).toBe("3 items from 2 shops");
    expect(cartSize({ count: 1, cards: [cart.cards[1]] })).toBe("1 item from Party Props");
  });

  it("checks out every line but the gone and the ones in checkout, and sums their deposit", () => {
    const card: CartCard = {
      shop: lensLane,
      warning: null,
      lines: [
        line("camera"),
        line("lens", { code: "in_checkout", booking: "RN-21345" }),
        line("tripod", { code: "not_listed" }),
        line("light", { code: "you_booked_it", booking: "RN-2", first_day: "2026-11-12", last_day: "2026-11-15" }, "200.00", "3000.00"),
      ],
    };
    expect(checkoutLines(card).map((l) => l.product.name)).toEqual(["camera", "light"]);
    expect(cardDeposit(card)).toBe(23000);
  });

  const card = cart.cards[0];
  it.each([
    [{ code: "in_checkout", booking: "RN-21345" }, { text: "In checkout · RN-21345", tone: "info", booking: "RN-21345" }],
    [{ code: "not_listed" }, { text: "No longer available", tone: "neutral" }],
    [
      { code: "you_booked_it", booking: "RN-2", first_day: "2026-11-12", last_day: "2026-11-15" },
      { text: "You've booked this for Thu 12 – Sun 15 Nov · starts left out at checkout", tone: "info" },
    ],
    [{ code: "other_pickup_point", locality: "Bandra W" }, { text: "Collected from Bandra W · checked out separately", tone: "neutral" }],
    [{ code: "pickup_only" }, { text: "Pickup only · you collect it from Andheri W", tone: "neutral" }],
  ] as [object, object][])("says %j", (warning, note) => {
    expect(lineNote(line("camera", warning as CartLine["warning"]), card)).toEqual(note);
  });

  it("says which price moved", () => {
    const rate = line("camera", { code: "price_changed", rate_was: "500.00", deposit_was: "20000.00" }, "600.00");
    expect(lineNote(rate, card)?.text).toBe("Now ₹600 a day (was ₹500)");
    const deposit = line("lens", { code: "price_changed", rate_was: "300.00", deposit_was: "5000.00" }, "300.00", "8000.00");
    expect(lineNote(deposit, card)?.text).toBe("Deposit now ₹8,000 (was ₹5,000)");
  });

  it("shows nothing for a warning it does not know", () => {
    expect(lineNote(line("camera", { code: "from_the_future" } as never), card)).toBeNull();
  });

  it("turns Check out off for a paused shop and a one-item shop, not for a closed one", () => {
    expect(cardNote({ ...card, warning: { code: "shop_paused" } })).toMatchObject({ tone: "warning", off: true });
    expect(cardNote({ ...card, warning: { code: "one_item_only" } })).toMatchObject({
      title: "Lens Lane takes one item per booking for now",
      off: true,
    });
    expect(cardNote({ ...card, warning: { code: "closed_now", opens_at: "2026-10-25T04:30:00Z" } })).toMatchObject({
      title: "Closed now · asked when they open at 10:00 am",
      off: false,
    });
    expect(cardNote(card)).toBeNull();
  });
});

describe("a refused add", () => {
  const refusal = (status: number, code: string | null, details: Record<string, unknown> | null = null) => ({
    status,
    code,
    message: null,
    details,
  });

  it("takes Add away when the shop takes no carts now", () => {
    expect(addFailure(refusal(409, "shop_not_ready"), "Lens Lane")).toMatchObject({ severity: "warning", refused: true, action: null });
  });

  it("offers the cart when it is full", () => {
    expect(addFailure(refusal(409, "cart_full", { max: 30 }), "Lens Lane")).toMatchObject({
      message: "It holds 30 items. Remove one to add this.",
      action: "view_cart",
      refused: false,
    });
  });

  it("offers a retry when there was no answer, and not for the owner's own listing", () => {
    expect(addFailure(refusal(0, null), "Lens Lane").action).toBe("retry");
    expect(addFailure(null, "Lens Lane").action).toBe("retry");
    expect(addFailure(refusal(403, "own_product"), "Lens Lane").action).toBeNull();
    expect(addFailure(refusal(404, null), "Lens Lane").action).toBeNull();
  });
});

describe("the dates a checkout starts on", () => {
  afterEach(forgetDates);
  const search = { first_day: "2026-10-24", last_day: "2026-10-26" };

  it("is nothing before any search or booking", () => {
    expect(checkoutDates()).toEqual({});
  });

  it("is the search's, until a booking is made, then the booking's", () => {
    rememberSearchDates(search);
    expect(checkoutDates()).toEqual(search);
    rememberDates("2026-11-01", "2026-11-03");
    rememberSearchDates({ first_day: "2026-12-01", last_day: "2026-12-02" });
    expect(checkoutDates()).toEqual({ first_day: "2026-11-01", last_day: "2026-11-03" });
  });
});

describe("afterBookRoutes", () => {
  const tabs = { name: "MainTabs", params: { screen: "Rentals" } };
  const booking = { name: "Booking", params: { number: "RN-21345", pay: true } };

  it("puts the cart under the booking while another card can check out", () => {
    expect(afterBookRoutes({ number: "RN-21345", pay: true, fromCart: true, cart, booked: ["camera", "lens"] })).toEqual({
      index: 2,
      routes: [tabs, { name: "Cart" }, booking],
    });
  });

  it("keeps the cart for lines of the same card left out of this booking", () => {
    const one = { count: 2, cards: [cart.cards[0]] };
    expect(afterBookRoutes({ number: "RN-21345", pay: true, fromCart: true, cart: one, booked: ["camera"] }).routes).toHaveLength(3);
  });

  it("goes as before once nothing is left to check out", () => {
    const rest = {
      count: 2,
      cards: [{ shop: partyProps, warning: null, lines: [line("fog", { code: "in_checkout", booking: "RN-9" })] }, cart.cards[0]],
    };
    expect(afterBookRoutes({ number: "RN-21345", pay: true, fromCart: true, cart: rest, booked: ["camera", "lens"] })).toEqual({
      index: 1,
      routes: [tabs, booking],
    });
  });

  it("never brings the cart in after Book now", () => {
    expect(afterBookRoutes({ number: "RN-21345", pay: false, fromCart: false, cart, booked: ["camera"] })).toEqual({
      index: 1,
      routes: [tabs, { name: "Booking", params: { number: "RN-21345", pay: false } }],
    });
  });

  it("goes as before when the cart was never read", () => {
    expect(afterBookRoutes({ number: "RN-21345", pay: true, fromCart: true, cart: undefined, booked: ["camera"] }).index).toBe(1);
  });
});

describe("the booking the pay strip names", () => {
  const b = (number: string, stage: string, rent_due_at: string | null) => ({ number, stage, money: { rent_due_at } });

  it("is the accepted one due first", () => {
    const list = [b("RN-1", "ringing", null), b("RN-2", "accepted", "2026-10-24T11:04:00Z"), b("RN-3", "accepted", "2026-10-24T10:34:00Z")];
    expect(waitingForRent(list)?.number).toBe("RN-3");
  });

  it("is none while nothing waits for its rent", () => {
    expect(waitingForRent([b("RN-1", "ringing", null), b("RN-4", "confirmed", null)])).toBeNull();
  });
});
