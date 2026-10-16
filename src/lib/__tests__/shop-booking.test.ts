import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import {
  BookingShop,
  SHOP_TABS,
  bookingCard,
  cancelWarningCopy,
  cardNote,
  customerBlock,
  customerRequest,
  defaultTab,
  emptyTab,
  howLine,
  moneyView,
  revealChipAt,
  ownRequest,
  shopActionErrorText,
  shopPill,
  shopTimeline,
} from "../shop-booking";

// 13 October 2026, 10:00 in India.
const NOW = new Date("2026-10-13T04:30:00Z");

function booking(over: Record<string, unknown> = {}): BookingShop {
  return {
    number: "RN-24831",
    stage: "confirmed",
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
      deposit_state: "not_due",
      deposit_ask_at: "2026-10-23T04:30:00Z",
      deposit_due_at: "2026-10-24T02:30:00Z",
      rent_pay_minutes: 30,
      rent_due_at: null,
      payout: { status: "none", status_reason: null, text: "Sent on the day of handover", amount: "1830.00", due_at: null, paid_at: null, more: 0 },
    },
    answered: {
      at: "2026-10-12T04:13:00Z",
      via: "dashboard",
      device_name: "Chrome on Windows",
      seconds: 118,
      this_device: false,
      session_id: 31,
    },
    window: { start: "2026-10-24T04:30:00Z", end: "2026-10-24T05:30:00Z" },
    window_request: null,
    return_by: "2026-10-26T14:30:00Z",
    day: { call_number: null, call_from: "2026-10-24T02:30:00Z", no_show_from: "2026-10-24T06:00:00Z" },
    can: ["cancel", "request_window_change", "get_help"],
    timeline: [
      { event: "book", label: "Booked", at: "2026-10-12T04:11:00Z", by: "customer" },
      { event: "accept", label: "Accepted", at: "2026-10-12T04:13:00Z", by: "owner" },
      { event: "rent_paid", label: "Rent paid", at: "2026-10-12T04:22:00Z", by: "system" },
      { event: "set_window", label: "Arrival window picked", at: "2026-10-12T04:23:00Z", by: "customer" },
    ],
    created_at: "2026-10-12T04:11:00Z",
    server_time: "2026-10-13T04:30:00Z",
    ...over,
  } as BookingShop;
}

describe("the Bookings tabs", () => {
  it("are the stages in the order of a booking's life, then the ones that ended early", () => {
    expect(SHOP_TABS.map((t) => t.key)).toEqual(["ringing", "accepted", "confirmed", "ready", "out", "returned", "closed", "ended"]);
  });

  it("opens on the first stage that has something in it", () => {
    const counts = { ringing: 0, accepted: 0, confirmed: 6, ready: 4, out: 9, returned: 0, closed: 212, ended: 19 };
    expect(defaultTab(counts)).toBe("confirmed");
    expect(defaultTab({ ...counts, ringing: 1 })).toBe("ringing");
    // Only finished bookings: the finished ones, not the early endings.
    expect(defaultTab({ ringing: 0, accepted: 0, confirmed: 0, ready: 0, out: 0, returned: 0, closed: 3, ended: 5 })).toBe("closed");
    expect(defaultTab(undefined)).toBe("confirmed");
  });

  it("says what an empty tab is for", () => {
    expect(emptyTab("ringing").title).toBe("Nothing is ringing");
    expect(emptyTab("ended").title).toBe("Nothing ended early");
    expect(emptyTab("ready").title).toBe("No bookings here");
  });
});

describe("a booking's stage in a word", () => {
  it("names each stage", () => {
    expect(shopPill(booking({ stage: "ready" }))).toEqual({ label: "Ready", tone: "brand" });
    expect(shopPill(booking({ stage: "confirmed" })).label).toBe("Confirmed");
    expect(shopPill(booking({ stage: "out" })).label).toBe("Out");
    expect(shopPill(booking({ stage: "closed" })).label).toBe("Closed");
  });

  it("an ending wins over the stage it kept", () => {
    expect(shopPill(booking({ stage: "accepted", exit: "refused" })).label).toBe("Refused");
    expect(shopPill(booking({ exit: "no_answer" })).label).toBe("No answer");
    expect(shopPill(booking({ exit: "cancelled_by_owner", exit_reason: "owner" })).label).toBe("Cancelled by you");
    expect(shopPill(booking({ exit: "no_show", exit_reason: "customer" })).label).toBe("Customer did not come");
    expect(shopPill(booking({ exit: "no_show", exit_reason: "owner" })).label).toBe("You did not come");
  });
});

describe("a card on the list", () => {
  it("has the dates, who and how, and what the shop earns", () => {
    const card = bookingCard(booking({ stage: "ready" }), NOW);
    expect(card).toMatchObject({
      number: "RN-24831",
      title: "Sony PS5",
      dates: "Sat 24 – Mon 26 Oct · 3 days",
      who: "Aarav M. · Self pickup",
      earn: "₹1,830",
      pill: { label: "Ready" },
    });
    expect(howLine(booking({ delivery_mode: "owner_delivery", customer: { ...booking().customer, distance_km: "2.8" } }))).toBe(
      "Delivery · 2.8 km"
    );
  });

  it("says what the shop does next", () => {
    const today = booking({ stage: "ready", window: { start: "2026-10-13T04:30:00Z", end: "2026-10-13T05:30:00Z" } });
    expect(cardNote(today, NOW)).toBe("Collects today, 10:00 – 11:00 am");
    expect(cardNote(booking({ stage: "ready" }), NOW)).toBe("Collects Sat 24 Oct, 10:00 – 11:00 am");
    expect(cardNote(booking({ stage: "confirmed", window: null }), NOW)).toBe("Waiting for the customer to pick an arrival time");
    expect(cardNote(booking({ stage: "accepted" }), NOW)).toBe("Waiting for the customer to pay the rent");
    expect(cardNote(booking({ stage: "out", return_by: "2026-10-13T14:30:00Z" }), NOW)).toBe("Back by 8:00 pm");
    expect(cardNote(booking({ stage: "out" }), NOW)).toBe("Back by Mon 26 Oct, 8:00 pm");
    expect(cardNote(booking({ stage: "ready", exit: "cancelled_by_owner" }), NOW)).toBeNull();
  });
});

describe("a booking's timeline", () => {
  it("shows what happened, with where it was accepted, then what is still to come", () => {
    const rows = shopTimeline(booking(), NOW);
    expect(rows.slice(0, 4)).toEqual([
      { label: "Booked", when: "Mon 12 Oct, 9:41 am", state: "done" },
      { label: "Accepted", when: "Mon 12 Oct, 9:43 am on the dashboard (Chrome on Windows)", state: "done" },
      { label: "Rent paid", when: "Mon 12 Oct, 9:52 am", state: "done" },
      { label: "Arrival window picked", when: "Sat 24 Oct, 10:00 – 11:00 am", state: "done" },
    ]);
    expect(rows.slice(4)).toEqual([
      { label: "Deposit", when: "due Fri 23 Oct", state: "next" },
      { label: "Handover", when: "Sat 24 Oct", state: "todo" },
      { label: "Return", when: "Mon 26 Oct, 8:00 pm", state: "todo" },
    ]);
  });

  it("says 'on this phone' when this phone's own session accepted (P3-9)", () => {
    const mine = booking({ answered: { ...booking().answered, via: "phone", device_name: "Owner's phone", this_device: true } });
    expect(shopTimeline(mine, NOW)[1].when).toBe("Mon 12 Oct, 9:43 am on this phone");
    const staff = booking({ answered: { ...booking().answered, via: "admin", device_name: "Renit staff (Meera)" } });
    expect(shopTimeline(staff, NOW)[1].when).toBe("Mon 12 Oct, 9:43 am on Renit staff (Meera)");
  });

  it("an ended booking shows only what happened", () => {
    const rows = shopTimeline(booking({ exit: "cancelled_by_owner", exit_reason: "owner" }), NOW);
    expect(rows.every((r) => r.state === "done")).toBe(true);
  });

  it("says an arrival time is not picked yet", () => {
    const rows = shopTimeline(booking({ window: null, timeline: [] }), NOW);
    expect(rows[0]).toEqual({ label: "Arrival window", when: "Not picked yet", state: "next" });
  });

  it("an accepted booking says by when the customer must pay (P3-13)", () => {
    const accepted = booking({
      stage: "accepted",
      timeline: [],
      money: { ...booking().money, deposit_state: "none", rent_due_at: "2026-10-13T05:00:00Z" },
    });
    expect(shopTimeline(accepted, NOW)[0]).toEqual({ label: "Rent", when: "customer pays by 10:30 am", state: "next" });
    expect(cardNote(accepted, NOW)).toBe("Waiting for the customer to pay the rent by 10:30 am");
  });

  it("an accepted booking is waiting for the rent", () => {
    expect(shopTimeline(booking({ stage: "accepted", timeline: [], money: { ...booking().money, deposit_state: "none" } }), NOW)[0]).toEqual({
      label: "Rent",
      when: "Waiting for the customer",
      state: "next",
    });
  });
});

describe("the Customer card", () => {
  it("has the first name, ID and rentals, the area and distance, and when they can call", () => {
    expect(customerBlock(booking(), NOW)).toEqual({
      name: "Aarav M.",
      initial: "A",
      line: "ID checked · 3 rentals completed",
      place: "Andheri East · 3.2 km",
      address: null,
      note: "You can call each other from 8:00 am on Sat 24 Oct, before the handover.",
    });
  });

  it("asks nothing of the shop before an arrival time exists, and says nothing once the booking ended", () => {
    expect(customerBlock(booking({ window: null, day: { call_number: null, call_from: null, no_show_from: null } }), NOW).note).toMatch(
      /once an arrival time is picked/
    );
    expect(customerBlock(booking({ exit: "refused" }), NOW).note).toBeNull();
  });

  it("shows the address only when the server sends text", () => {
    expect(customerBlock(booking({ customer: { ...booking().customer, address: "Flat 12B, Lodha Bellissimo" } }), NOW).address).toBe(
      "Flat 12B, Lodha Bellissimo"
    );
    expect(customerBlock(booking({ customer: { ...booking().customer, address: { weird: true } } }), NOW).address).toBeNull();
  });
});

describe("the Money card", () => {
  it("shows the rent, Renit's fee crossed out, what the shop earns, the payout and the deposit", () => {
    expect(moneyView(booking())).toEqual({
      rent: "₹1,830",
      delivery: null,
      fee: { struck: "₹92", charged: "₹0" },
      earn: "₹1,830",
      payout: "Sent on the day of handover",
      notes: [],
      deposit: { amount: "₹3,000", sub: "Asked from the customer before the handover" },
    });
  });

  it("says what was kept from the deposit for the shop, and what of it went back (E-110)", () => {
    const m = { ...booking().money, deposit: "5000.00", deposit_state: "settled", damage_deduction: "200.00" };
    const view = moneyView(booking({ stage: "closed", money: m }));
    expect(view.notes).toEqual(["₹200 kept from the deposit for you, for the damage"]);
    expect(view.deposit).toEqual({ amount: "₹5,000", sub: "₹4,800 returned, ₹200 kept for the damage" });
    // Late days count once they are fixed at the return, and come out of the deposit before the damage is asked.
    const late = moneyView(booking({ stage: "closed", money: { ...m, late_days: 2, late_fee: "1220.00" } }));
    expect(late.notes).toEqual([
      "₹200 kept from the deposit for you, for the damage",
      "₹1,220 kept from the deposit for you, for the late days",
    ]);
    expect(late.deposit?.sub).toBe("₹3,580 returned, ₹200 kept for the damage, ₹1,220 kept for the late days");
    // While the item is out the late fee is only today's count: nothing is kept yet.
    expect(moneyView(booking({ stage: "out", money: { ...m, deposit_state: "paid", damage_deduction: "0.00", late_fee: "610.00" } })).notes).toEqual([]);
    // Nothing kept: the deposit just settles.
    expect(moneyView(booking({ money: { ...m, damage_deduction: "0.00" } })).deposit?.sub).toBe("Settled");
  });

  it("does not split a forfeited deposit, and drops '₹0 returned'", () => {
    const m = { ...booking().money, deposit: "3000.00", deposit_state: "forfeited", damage_deduction: "200.00", late_fee: "610.00" };
    const forfeited = moneyView(booking({ stage: "closed", money: m }));
    expect(forfeited.notes).toEqual([]);
    expect(forfeited.deposit?.sub).toBe("Kept, as the item was not returned");
    const whole = moneyView(booking({ stage: "closed", money: { ...m, deposit: "800.00", deposit_state: "settled" } }));
    expect(whole.deposit?.sub).toBe("₹200 kept for the damage, ₹600 kept for the late days");
  });

  it("says a refunded fault comes off a later payout, then that it was taken (E-116)", () => {
    const m = { ...booking().money, clawback: "600.00", clawback_left: "600.00" };
    expect(moneyView(booking({ money: m })).notes).toEqual(["₹600 comes off your payouts for the fault report on this booking"]);
    expect(moneyView(booking({ money: { ...m, clawback_left: "0.00" } })).notes).toEqual([
      "₹600 was recovered for the fault report on this booking",
    ]);
    // A server without the field says nothing.
    expect(moneyView(booking()).notes).toEqual([]);
  });

  it("a held deposit is 'Held by Renit'; no deposit is not drawn; a delivery fee is", () => {
    const m = booking().money;
    expect(moneyView(booking({ money: { ...m, deposit_state: "paid" } })).deposit?.sub).toBe("Held by Renit");
    expect(moneyView(booking({ money: { ...m, deposit: "0.00", deposit_state: "none" } })).deposit).toBeNull();
    expect(moneyView(booking({ money: { ...m, delivery_fee: "170.00" } })).delivery).toBe("₹170");
    expect(moneyView(booking({ money: { ...m, payout: null } })).payout).toBeNull();
  });
});

describe("the time-change request", () => {
  const request = { by: "customer", start: "2026-10-24T06:30:00Z", end: "2026-10-24T07:30:00Z", asked_at: "2026-10-12T05:00:00Z" };

  it("the customer's request can be answered by the shop", () => {
    expect(customerRequest(booking({ window_request: request, can: ["answer_window_change"] }))).toEqual({
      title: "Aarav asked to move the arrival time",
      body: "New time: Sat 24 Oct, 12:00 – 1:00 pm. The time stays as it is unless you accept.",
    });
  });

  it("is not offered for the shop's own request, or when the server does not allow an answer", () => {
    expect(customerRequest(booking({ window_request: { ...request, by: "owner" }, can: ["answer_window_change"] }))).toBeNull();
    expect(customerRequest(booking({ window_request: request, can: [] }))).toBeNull();
    expect(customerRequest(booking())).toBeNull();
  });

  it("the shop's own request says it is waiting", () => {
    expect(ownRequest(booking({ window_request: { ...request, by: "owner" } }))).toMatch(/You asked to move it to Sat 24 Oct, 12:00 – 1:00 pm/);
    expect(ownRequest(booking({ window_request: request }))).toBeNull();
  });
});

describe("cancelling", () => {
  it("shows the server's own lines", () => {
    expect(
      cancelWarningCopy({
        refund_to_customer: "1830.00",
        deposit_back: "0.00",
        marks_last_30_days: 1,
        will_pause_listings: true,
        text: ["The customer gets everything back, the ₹99 included.", "This is marked on your record."],
      })
    ).toEqual({
      title: "Cancel this booking?",
      lines: ["The customer gets everything back, the ₹99 included.", "This is marked on your record."],
      confirm: "Cancel booking",
    });
  });

  it("reads each refusal", () => {
    const failure = (status: number, code: string | null, message: string | null = null): ApiError => ({ status, code, message, details: null });
    expect(shopActionErrorText(failure(0, null))).toMatch(/couldn't reach Renit/);
    expect(shopActionErrorText(failure(409, "stage_not_allowed"))).toMatch(/has moved on/);
    expect(shopActionErrorText(failure(409, "claim_open"))).toMatch(/claim is open/);
    expect(shopActionErrorText(failure(409, "request_open"))).toMatch(/already waiting/);
    expect(shopActionErrorText(failure(409, "window_outside_hours"))).toMatch(/no longer open/);
    expect(shopActionErrorText(failure(500, null))).toMatch(/Something went wrong/);
    expect(shopActionErrorText(failure(400, null, "The server's own words."))).toBe("The server's own words.");
  });
});

describe("keeping the chosen chip in view (test run: the default chip sat half off the edge)", () => {
  // A 402 pt screen with a 24 pt gutter: chips of about 130 pt, the third starting at 300.
  const third = { x: 300, width: 150 };

  it("scrolls by the least that shows a chip that is cut off on the right", () => {
    expect(revealChipAt(third, 402, 0, 24)).toBe(300 + 150 + 24 - 402);
  });

  it("leaves the row where it is when the chip is already in view", () => {
    expect(revealChipAt({ x: 60, width: 120 }, 402, 0, 24)).toBe(0);
    expect(revealChipAt(third, 402, 100, 24)).toBe(100);
  });

  it("scrolls back for a chip that is cut off on the left, never past the start", () => {
    expect(revealChipAt({ x: 130, width: 100 }, 402, 200, 24)).toBe(106);
    expect(revealChipAt({ x: 10, width: 100 }, 402, 50, 24)).toBe(0);
  });

  it("does nothing before the row has a width", () => {
    expect(revealChipAt(third, 0, 20, 24)).toBe(20);
  });
});
