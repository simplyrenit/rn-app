import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import { ShotList, listFor } from "../capture";
import { pushRoute } from "../push-routes";
import { BookingShop, cardNote, customerBlock, howLine, moneyView, shopTimeline } from "../shop-booking";
import {
  OwnerCourier,
  arrivingLine,
  bannerTone,
  canPack,
  courierCall,
  courierErrorText,
  courierOf,
  courierPayoutLine,
  legSteps,
  packByText,
  packSteps,
  returnTitle,
  riderCard,
  ringCourierLine,
  sealOf,
} from "../shop-courier";
import { dayButton } from "../shop-handover";
import { Ring, answerErrorText, parseRing, ringWhere, summaryOfBooking, summaryOfRing } from "../shop-ring";
import { GoingOut, goingOutRow } from "../shop-today";

// 24 October 2026, 10:00 in India: the day the courier collects.
const NOW = new Date("2026-10-24T04:30:00Z");

/** The owner's courier block as rn-api `courier.block(b, "owner")` sends it (eng303-build.md), with the rider set. */
function courier(over: Partial<OwnerCourier> = {}): OwnerCourier {
  return {
    state: "rider_assigned",
    steps: [
      { key: "packed", label: "Packed", sub: "Seal R-1042", at: "2026-10-24T05:39:00Z", state: "done" },
      { key: "rider", label: "Rider booked", sub: "Ravi, Bike MH02AB1. OTP 4411", at: "2026-10-24T05:45:00Z", state: "done" },
      { key: "picked_up", label: "Handed to rider", sub: "On the way to the customer", at: null, state: "now" },
      { key: "delivered", label: "Delivered", sub: "Waiting for the customer to open it on camera", at: null, state: "todo" },
      { key: "received", label: "Opened on camera", sub: "Your payout has started", at: null, state: "todo" },
      { key: "return_window", label: "Return window picked", sub: null, at: null, state: "todo" },
      { key: "return_rider", label: "Rider booked", sub: null, at: null, state: "todo" },
      { key: "return_picked_up", label: "Item arriving", sub: null, at: null, state: "todo" },
      { key: "at_shop", label: "Back at the shop", sub: "Record it in the app", at: null, state: "todo" },
      { key: "return_received", label: "Received by the shop", sub: "Report any problem within 24 hours", at: null, state: "todo" },
    ],
    banner: null,
    seal: "R-1042",
    rider: { name: "Ravi", vehicle: "Bike", plate: "MH02AB1", otp: "4411" },
    pack_by: "2026-10-24T08:15:00Z",
    return: { state: "not_set", window: null, earliest: "2026-10-26", seal: null },
    attempt: 1,
    not_delivered_reason: null,
    ...over,
  };
}

function booking(over: Record<string, unknown> = {}): BookingShop {
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
      address: "Flat 4, Sunrise CHS, Andheri East",
    },
    first_day: "2026-10-24",
    last_day: "2026-10-26",
    days: 3,
    delivery_mode: "owner_delivery",
    units: { in_use: 2, quantity: 5 },
    money: {
      rate: "610.00",
      rent: "1830.00",
      delivery_fee: "170.00",
      fee_shown: "92.00",
      fee_charged: "0.00",
      you_earn: "2000.00",
      deposit: "3000.00",
      deposit_state: "paid",
      deposit_ask_at: null,
      deposit_due_at: null,
      rent_pay_minutes: 30,
      rent_due_at: null,
      payout: null,
    },
    answered: null,
    window: { start: "2026-10-24T10:30:00Z", end: "2026-10-24T11:30:00Z" },
    window_request: null,
    return_by: "2026-10-26T14:30:00Z",
    day: { call_number: "+919800000000", call_from: "2026-10-24T08:30:00Z", no_show_from: null, return_code: null },
    captures: { handover: { mine: false, theirs: false }, return: { mine: false, theirs: false } },
    can: ["cancel", "get_help"],
    timeline: [],
    created_at: "2026-10-12T04:11:00Z",
    server_time: "2026-10-24T04:30:00Z",
    ...over,
  } as unknown as BookingShop;
}

/** The same booking on a courier: what rn-api's ENG-304 sends the owner (no address, no km, no fee, the desk's line). */
const courierBooking = (over: Record<string, unknown> = {}, block: Partial<OwnerCourier> = {}) =>
  booking({
    delivered_by: "renit",
    customer: { ...booking().customer, address: null, distance_km: null },
    money: { ...booking().money, delivery_fee: "0.00", you_earn: "1830.00" },
    day: { call_number: "+912240000000", call_from: null, no_show_from: null, return_code: null },
    courier: courier(block),
    ...over,
  });

const ring: Ring = {
  number: "RN-24831",
  product: { name: "PRO_8fk2Lq", title: "Sony PS5", cover_image: null },
  first_day: "2026-10-24",
  last_day: "2026-10-26",
  days: 3,
  delivery_mode: "owner_delivery",
  customer: { first_name: "Aarav", last_initial: "M", id_checked: true, rentals_completed: 3, area: "Andheri East", distance_km: "3.2" },
  units: { in_use: 2, quantity: 5 },
  you_earn: "2000.00",
  fee_shown: "92.00",
  fee_charged: "0.00",
  ring_state: "ringing",
  ring_at: "2026-10-12T04:11:20Z",
  ring_ends_at: "2026-10-12T04:21:20Z",
};

const failure = (status: number, code: string | null, message: string | null = null): ApiError =>
  ({ status, code, message, details: {} }) as ApiError;

describe("a shop booking reads as today", () => {
  // `delivered_by` absent (a server before B1) and `shop` give the same words on every owner surface.
  for (const by of [undefined, "shop"] as const) {
    it(`with delivered_by ${by ?? "absent"}`, () => {
      const b = booking(by ? { delivered_by: by } : {});
      expect(courierOf(b)).toBeNull();
      expect(howLine(b)).toBe("Delivery · 3.2 km");
      expect(cardNote(b, NOW)).toBe("Deliver today, 4:00 – 5:00 pm");
      expect(customerBlock(b, NOW).address).toBe("Flat 4, Sunrise CHS, Andheri East");
      expect(customerBlock(b, NOW).note).toMatch(/You can call each other/);
      expect(moneyView(b).delivery).toBe("₹170");
      expect(shopTimeline(b, NOW).map((row) => row.label)).toContain("Delivery");
      expect(summaryOfBooking(b).how).toBe("Delivery · Aarav M.");
      expect(dayButton(b)).toBe("Open the handover");

      const r = { ...ring, ...(by ? { delivered_by: by } : {}) };
      expect(ringWhere(r)).toBe("Delivery · Andheri East · 3.2 km");
      expect(summaryOfRing(r).how).toBe("Delivery · Aarav M.");
      expect(ringCourierLine(r)).toBeNull();

      const out: GoingOut = {
        number: "RN-24831",
        product_title: "Sony PS5",
        customer_first_name: "Aarav",
        customer_last_initial: "M",
        delivery_mode: "owner_delivery",
        stage: "ready",
        window: { start: "2026-10-24T10:30:00Z", end: "2026-10-24T11:30:00Z" },
        deposit_state: "paid",
        ...(by ? { delivered_by: by } : {}),
      };
      expect(goingOutRow(out, NOW).sub).toBe("Deliver 4:00 – 5:00 pm");
      // A pack-by sent on a shop booking is not the shop's to read.
      expect(goingOutRow({ ...out, pack_by: "2026-10-24T08:15:00Z" }, NOW).sub).toBe("Deliver 4:00 – 5:00 pm");
    });
  }

  it("a stray courier block on a shop booking is ignored", () => {
    expect(courierOf(booking({ delivered_by: "shop", courier: courier() }))).toBeNull();
    expect(dayButton(booking({ delivered_by: "shop", courier: courier({ seal: null }) }))).toBe("Open the handover");
  });

  it("a shop owner's window push still opens the booking or the handover", () => {
    expect(pushRoute({ type: "window", booking: "RN-1", role: "owner" })).toEqual({ screen: "ShopBooking", number: "RN-1" });
    expect(pushRoute({ type: "window", booking: "RN-1", role: "owner", what: "status" })).toEqual({ screen: "ShopHandover", number: "RN-1" });
  });

  it("the owner's handover list and every other record walk the server's list as it is", () => {
    const list = { shots: [{ key: "front", label: "Front", hint: "" }], video_hint: "", included_items: [], id_match_required: false } as ShotList;
    expect(listFor(list, "handover", "owner")).toBe(list);
    expect(listFor(undefined, "handover", "owner")).toBeUndefined();
  });
});

describe("the ring of a courier booking", () => {
  const r: Ring = { ...ring, delivered_by: "renit", customer: { ...ring.customer, distance_km: null }, you_earn: "1830.00" };

  it("names the courier, the area only, and when it is collected", () => {
    expect(ringWhere(r)).toBe("Renit courier · Andheri East");
    expect(ringCourierLine(r)).toBe("Courier collects Sat 24 Oct in your open hours. Exact pack-by time once the customer picks.");
    expect(summaryOfRing(r)).toMatchObject({ how: "Renit courier · Aarav M.", earn: "₹1,830" });
  });

  it("keeps delivered_by from the push's ring", () => {
    expect(parseRing(JSON.stringify(r))?.delivered_by).toBe("renit");
  });

  it("says update_required on Accept, and the request keeps ringing", () => {
    expect(answerErrorText(failure(409, "update_required"))).toBe(
      "Update the Renit app to accept courier bookings. This request is still ringing."
    );
  });
});

describe("Today and the booking page of a courier booking", () => {
  it("Today says pack by, else the courier's window", () => {
    const out: GoingOut = {
      number: "RN-24831",
      product_title: "Sony PS5",
      customer_first_name: "Aarav",
      customer_last_initial: "M",
      delivery_mode: "owner_delivery",
      delivered_by: "renit",
      stage: "ready",
      window: { start: "2026-10-24T10:30:00Z", end: "2026-10-24T11:30:00Z" },
      deposit_state: "paid",
    };
    expect(goingOutRow({ ...out, pack_by: "2026-10-24T08:15:00Z" }, NOW).sub).toBe("Pack by 1:45 pm");
    // A server that does not send `pack_by` on Today yet.
    expect(goingOutRow(out, NOW).sub).toBe("Courier collects 4:00 – 5:00 pm");
    expect(goingOutRow({ ...out, window: null }, NOW).sub).toBe("No arrival time picked yet");
  });

  it("the booking page: no delivery fee, no address, the courier's words", () => {
    const b = courierBooking();
    expect(howLine(b)).toBe("Renit courier");
    expect(moneyView(b).delivery).toBeNull();
    // Even when a server sends a fee or an address, the owner never sees them on a courier booking.
    const leaky = courierBooking({ money: { ...b.money, delivery_fee: "280.00" }, customer: { ...b.customer, address: "Flat 4" } });
    expect(moneyView(leaky).delivery).toBeNull();
    expect(customerBlock(leaky, NOW).address).toBeNull();
    expect(customerBlock(b, NOW)).toMatchObject({ place: "Andheri East", note: expect.stringMatching(/don't meet the customer/) });
    expect(shopTimeline(b, NOW).map((row) => row.label)).toContain("Courier collects");
    expect(summaryOfBooking(b).how).toBe("Renit courier · Aarav M.");
  });

  it("the card note: pack by until the seal, then the courier's window", () => {
    expect(cardNote(courierBooking({}, { seal: null, state: "awaiting_pack" }), NOW)).toBe("Pack by 1:45 pm");
    expect(cardNote(courierBooking({ stage: "confirmed" }, { seal: null, state: "awaiting_pack" }), NOW)).toBe("Pack by 1:45 pm");
    expect(cardNote(courierBooking({}, { seal: null, pack_by: "2026-10-25T08:15:00Z" }), NOW)).toBe("Pack by 1:45 pm, Sun 25 Oct");
    expect(cardNote(courierBooking(), NOW)).toBe("Courier collects today, 4:00 – 5:00 pm");
  });

  it("the day button packs first", () => {
    expect(dayButton(courierBooking({}, { seal: null }))).toBe("Pack it for the courier");
    expect(dayButton(courierBooking())).toBe("Open the courier handover");
    expect(dayButton(courierBooking({ stage: "out" }))).toBe("Open the return");
  });
});

describe("Pack it for the courier", () => {
  it("splits the server's tracker into its two legs, `now` as next", () => {
    const c = courier();
    expect(legSteps(c, "out")).toEqual([
      { label: "Packed", sub: "Seal R-1042", state: "done" },
      { label: "Rider booked", sub: "Ravi, Bike MH02AB1. OTP 4411", state: "done" },
      { label: "Handed to rider", sub: "On the way to the customer", state: "next" },
      { label: "Delivered", sub: "Waiting for the customer to open it on camera", state: "todo" },
      { label: "Opened on camera", sub: "Your payout has started", state: "todo" },
    ]);
    expect(legSteps(c, "return").map((s) => s.label)).toEqual([
      "Return window picked",
      "Rider booked",
      "Item arriving",
      "Back at the shop",
      "Received by the shop",
    ]);
    expect(legSteps(c, "return")[0].sub).toBeUndefined();
  });

  it("the shop's own steps: record with the seal, type the number, Packed", () => {
    const c = courier({ seal: null, state: "awaiting_pack" });
    expect(packSteps(c, false, "").map((s) => s.state)).toEqual(["next", "todo", "todo"]);
    expect(packSteps(c, true, "").map((s) => s.state)).toEqual(["done", "next", "todo"]);
    expect(packSteps(c, true, "r 1042").map((s) => s.state)).toEqual(["done", "done", "next"]);
    expect(packSteps(courier(), false, "").map((s) => s.state)).toEqual(["done", "done", "done"]);
  });

  it("takes a seal number the server takes, and only while it offers Packed", () => {
    expect(sealOf(" r-10 42 ")).toBe("R-1042");
    expect(canPack(["mark_packed"], "R-1042")).toBe(true);
    expect(canPack(["mark_packed"], "")).toBe(false);
    expect(canPack(["mark_packed"], "R/1042")).toBe(false);
    expect(canPack(["mark_packed"], "A".repeat(21))).toBe(false);
    expect(canPack([], "R-1042")).toBe(false);
  });

  it("the rider card shows the OTP while the rider is on the way, and not after", () => {
    expect(riderCard(courier())).toEqual({ title: "Ravi collects it", vehicle: "Bike · MH02AB1", otp: "4411" });
    expect(riderCard(courier({ rider: { name: null, vehicle: null, plate: null, otp: null } }))).toEqual({
      title: "A rider collects it",
      vehicle: null,
      otp: null,
    });
    expect(riderCard(courier({ state: "picked_up" }))).toBeNull();
    expect(riderCard(courier({ state: "dispatching", rider: null }))).toBeNull();
  });

  it("the payout waits for the customer to open it on camera", () => {
    expect(courierPayoutLine({ stage: "ready", exit: "" })).toBe("Your payout starts once the customer opens it on camera.");
    expect(courierPayoutLine({ stage: "out", exit: "" })).toBeNull();
    expect(courierPayoutLine({ stage: "ready", exit: "cancelled_by_customer" })).toBeNull();
  });

  it("Call via Renit dials the desk's line", () => {
    expect(courierCall({ call_number: "+912240000000" })).toMatchObject({ label: "Call via Renit", number: "+912240000000" });
    expect(courierCall({ call_number: null })).toMatchObject({ label: "Call via Renit", number: null });
  });

  it("says what a refused Packed or hand-over means", () => {
    expect(courierErrorText(failure(409, "capture_missing"))).toMatch(/seal photo hasn't reached Renit/);
    expect(courierErrorText(failure(409, "seal_required"))).toMatch(/number on the seal/);
    expect(courierErrorText(failure(409, "stage_not_allowed"))).toMatch(/moved on/);
    expect(courierErrorText(null)).toMatch(/couldn't reach Renit/);
    expect(courierErrorText(failure(409, "other", "Wait for the desk."))).toBe("Wait for the desk.");
  });

  it("the banner's tone", () => {
    expect(bannerTone({ tone: "bad", title: "x", body: null })).toBe("danger");
    expect(bannerTone({ tone: "warn", title: "x", body: null })).toBe("warning");
    expect(bannerTone({ tone: "info", title: "x", body: null })).toBe("info");
  });

  it("pack by, with the day when it is not today", () => {
    expect(packByText("2026-10-24T08:15:00Z", NOW)).toBe("Pack by 1:45 pm");
    expect(packByText("2026-10-25T03:00:00Z", NOW)).toBe("Pack by 8:30 am, Sun 25 Oct");
  });

  it("the owner's handover record on a courier booking ends with the seal shot, once", () => {
    const seal = { key: "seal", label: "The seal", hint: "The sealed bag." };
    const list = { shots: [{ key: "front", label: "Front", hint: "" }], video_hint: "", included_items: [], id_match_required: false, seal_shot: seal } as ShotList;
    expect(listFor(list, "handover", "owner").shots.map((s) => s.key)).toEqual(["front", "seal"]);
    expect(listFor(listFor(list, "handover", "owner"), "handover", "owner").shots).toHaveLength(2);
    // The customer's record and the return are not asked for it.
    expect(listFor(list, "handover", "customer")).toBe(list);
    expect(listFor(list, "return", "owner")).toBe(list);
  });
});

describe("the return of a courier booking", () => {
  it("item arriving, in the server's window", () => {
    expect(arrivingLine(courier())).toMatch(/customer picks a return window/);
    const set = { state: "rider_assigned", window: { from: "2026-10-26T10:30:00Z", to: "2026-10-26T12:30:00Z" }, earliest: "2026-10-26", seal: null };
    expect(arrivingLine(courier({ return: set }))).toBe("Item arriving Mon 26 Oct, 4:00 – 6:00 pm");
    expect(arrivingLine(courier({ return: { ...set, state: "picked_up" } }))).toBe(
      "Item arriving Mon 26 Oct, 4:00 – 6:00 pm: it is with the rider now"
    );
    expect(arrivingLine(courier({ return: { ...set, state: "at_shop" } }))).toBeNull();
  });

  it("titles the return 'Item arriving' until the rider has brought it back (ENG-333)", () => {
    const set = { state: "picked_up", window: { from: "2026-10-26T10:30:00Z", to: "2026-10-26T12:30:00Z" }, earliest: "2026-10-26", seal: "R-2052" };
    expect(returnTitle(courier())).toBe("Item arriving");
    expect(returnTitle(courier({ return: set }))).toBe("Item arriving");
    expect(returnTitle(courier({ return: { ...set, state: "at_shop" } }))).toBe("Back at your shop");
  });
});

describe("courier pushes", () => {
  const owner = (step: unknown) => pushRoute({ type: "window", booking: "RN-1", role: "owner", what: "courier", courier: step });

  it("an outbound step opens the handover, the return leg the return, anything else the booking", () => {
    for (const step of ["packed", "dispatching", "set_rider", "picked_up", "reattempt"]) {
      expect(owner(step)).toEqual({ screen: "ShopHandover", number: "RN-1" });
    }
    for (const step of ["return_window", "return_rider", "return_picked_up", "at_shop", "self_return"]) {
      expect(owner(step)).toEqual({ screen: "ShopReturn", number: "RN-1" });
    }
    for (const step of ["banner", "not_delivered", "delivered", "something_new", undefined]) {
      expect(owner(step)).toEqual({ screen: "ShopBooking", number: "RN-1" });
    }
  });

  it("a desk alarm shows as a notification and a tap opens nothing", () => {
    expect(pushRoute({ type: "desk_alert", booking: "RN-1", role: "customer", alarm: "packed" })).toBeNull();
    expect(pushRoute({ type: "desk_alert", booking: "RN-1", role: "owner", alarm: "packed" })).toBeNull();
  });
});
