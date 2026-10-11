import { describe, expect, it } from "@jest/globals";
import type { ApiError } from "../api-error";
import type { BookingShop } from "../shop-booking";
import {
  LiveAnswer,
  RecentRing,
  Ring,
  answerErrorText,
  blockResult,
  customerLine,
  customerName,
  endingCopy,
  endingFromBooking,
  endingFromError,
  endingFromRecent,
  feeText,
  hereEnding,
  liveStillMatters,
  missingText,
  outcomeUnknown,
  parseRing,
  refuseBody,
  ringDates,
  ringView,
  ringWhere,
  summaryOfBooking,
  summaryOfRing,
  unitDots,
  unitsLine,
  whereText,
} from "../shop-ring";

const ring: Ring = {
  number: "RN-24831",
  product: { name: "PRO_8fk2Lq", title: "Sony PS5", cover_image: "https://cdn.example/ps5.jpg" },
  first_day: "2026-10-24",
  last_day: "2026-10-26",
  days: 3,
  delivery_mode: "pickup",
  customer: {
    first_name: "Aarav",
    last_initial: "M",
    id_checked: true,
    rentals_completed: 3,
    area: "Andheri East",
    distance_km: "3.2",
  },
  units: { in_use: 2, quantity: 5 },
  you_earn: "1830.00",
  fee_shown: "92.00",
  fee_charged: "0.00",
  ring_state: "ringing",
  ring_at: "2026-10-12T04:11:20Z",
  ring_ends_at: "2026-10-12T04:21:20Z",
};

const live = (over: Partial<LiveAnswer> = {}): LiveAnswer => ({
  server_time: "2026-10-12T04:12:00Z",
  poll_after_ms: 1000,
  open: { is_open: true, reason: "hours", opens_at: null, closes_at: null },
  ringing: [],
  waiting_to_ring: [],
  recent: [],
  needs_you_count: 0,
  ...over,
});

const recent = (over: Partial<RecentRing> = {}): RecentRing => ({
  number: "RN-24831",
  outcome: "accepted",
  answered_via: "dashboard",
  device_name: "Chrome on Windows",
  answered_at: "2026-10-12T04:13:00Z",
  ended_at: "2026-10-12T04:13:00Z",
  this_device: false,
  ...over,
});

const failure = (status: number, code: string | null, details: Record<string, unknown> | null = null): ApiError => ({
  status,
  code,
  message: null,
  details,
});

describe("parseRing", () => {
  it("reads a ring sent as an object", () => {
    expect(parseRing(ring)?.number).toBe("RN-24831");
  });

  it("reads a ring sent as JSON text, as one platform hands it over", () => {
    expect(parseRing(JSON.stringify(ring))?.customer.first_name).toBe("Aarav");
  });

  it("is null for text that is not JSON, and for half a ring", () => {
    expect(parseRing("{nope")).toBeNull();
    expect(parseRing({ number: "RN-1" })).toBeNull();
    expect(parseRing({ ...ring, product: null })).toBeNull();
    expect(parseRing({ ...ring, units: { in_use: "2", quantity: 5 } })).toBeNull();
    expect(parseRing(undefined)).toBeNull();
    expect(parseRing([ring])).toBeNull();
  });
});

describe("the request in words", () => {
  it("writes the dates and where it is as SH-01 does", () => {
    expect(ringDates(ring)).toBe("Sat 24 – Mon 26 Oct · 3 days");
    expect(ringWhere(ring)).toBe("Self pickup · Andheri East · 3.2 km");
    expect(ringWhere({ ...ring, delivery_mode: "owner_delivery", customer: { ...ring.customer, distance_km: null } })).toBe(
      "Delivery · Andheri East"
    );
  });

  it("names the customer and what is known of them", () => {
    expect(customerName(ring.customer)).toBe("Aarav M.");
    expect(customerName({ first_name: "Aarav", last_initial: "" })).toBe("Aarav");
    expect(customerLine(ring.customer)).toBe("ID checked · 3 rentals completed");
    expect(customerLine({ id_checked: false, rentals_completed: 1 })).toBe("ID not checked yet · 1 rental completed");
    expect(customerLine({ id_checked: true, rentals_completed: 0 })).toBe("ID checked · No rentals completed yet");
  });

  it("says how many units are in use, with a dot for each unit up to ten", () => {
    expect(unitsLine(ring.units)).toBe("2 of 5 in use on these dates");
    expect(unitDots(ring.units)).toEqual([true, true, false, false, false]);
    expect(unitDots({ in_use: 3, quantity: 12 })).toBeNull();
    expect(unitDots({ in_use: 0, quantity: 0 })).toBeNull();
  });

  it("shows the fee that was shown, crossed out, only when it differs from the one charged", () => {
    expect(feeText(ring)).toEqual({ struck: "₹92", charged: "₹0" });
    expect(feeText({ fee_shown: "0.00", fee_charged: "0.00" })).toEqual({ struck: null, charged: "₹0" });
    expect(feeText({ fee_shown: "92.00", fee_charged: "92.00" }).struck).toBeNull();
  });

  it("gives the card of an ended request from the ring or from the booking", () => {
    expect(summaryOfRing(ring)).toEqual({
      title: "Sony PS5",
      image: "https://cdn.example/ps5.jpg",
      range: "Sat 24 – Mon 26 Oct",
      dates: "Sat 24 – Mon 26 Oct · 3 days",
      how: "Self pickup · Aarav M.",
      firstName: "Aarav",
      earn: "₹1,830",
    });
    const booking = {
      product: { name: "PRO_8fk2Lq", title: "Sony PS5", shop_code: "PS5-01", cover_image: null, quantity: 5 },
      customer: ring.customer,
      first_day: "2026-10-24",
      last_day: "2026-10-26",
      days: 3,
      delivery_mode: "owner_delivery",
      money: { you_earn: "1830.00" },
    } as unknown as BookingShop;
    expect(summaryOfBooking(booking).how).toBe("Delivery · Aarav M.");
    expect(summaryOfBooking(booking).earn).toBe("₹1,830");
  });
});

describe("ringView: what the screen draws", () => {
  const base = { number: "RN-24831", pushed: ring, live: undefined, liveFailed: false, here: null, ended: null };

  it("draws the ring a tap on a push carried, so the owner can answer at once", () => {
    expect(ringView(base)).toEqual({ kind: "ringing", ring });
  });

  it("draws the live ring once the server has answered, and not the pushed one", () => {
    const fresh = { ...ring, units: { in_use: 4, quantity: 5 } };
    expect(ringView({ ...base, live: live({ ringing: [fresh] }) })).toEqual({ kind: "ringing", ring: fresh });
  });

  it("shows another device's answer when the live answer remembers it, even if the push says ringing", () => {
    const view = ringView({ ...base, live: live({ recent: [recent()] }) });
    expect(view.kind).toBe("ended");
    expect(view.kind === "ended" && view.ending.where).toBe("the dashboard (Chrome on Windows)");
  });

  it("reads the booking when the request is neither ringing nor remembered (an old tap)", () => {
    expect(ringView({ ...base, live: live() }).kind).toBe("unknown");
  });

  it("without a pushed ring: loading, then failed if the live answer cannot be read", () => {
    expect(ringView({ ...base, pushed: null }).kind).toBe("loading");
    expect(ringView({ ...base, pushed: null, liveFailed: true }).kind).toBe("failed");
  });

  it("keeps the pushed ring up when the live answer cannot be read: the server checks every tap", () => {
    expect(ringView({ ...base, liveFailed: true }).kind).toBe("ringing");
  });

  it("this phone's own answer, then the server's word on a tap, come before the live answer", () => {
    const here = hereEnding("accepted", "2026-10-12T04:13:00Z");
    expect(ringView({ ...base, live: live({ ringing: [ring] }), here }).kind).toBe("here");
    const ended = endingFromError(failure(409, "no_unit_free"));
    expect(ringView({ ...base, live: live({ ringing: [ring] }), ended }).kind).toBe("ended");
  });

  it("stops asking once the request is seen to have ended, and while it is not yet seen", () => {
    expect(liveStillMatters(undefined, "RN-24831")).toBe(true);
    expect(liveStillMatters(live({ ringing: [ring] }), "RN-24831")).toBe(true);
    expect(liveStillMatters(live({ recent: [recent()] }), "RN-24831")).toBe(false);
    expect(liveStillMatters(live(), "RN-24831")).toBe(false);
  });
});

describe("what a failed tap means", () => {
  it("ring_ended says who answered first and when (the first answer wins)", () => {
    const ending = endingFromError(
      failure(409, "ring_ended", {
        outcome: "accepted",
        answered_via: "phone",
        device_name: "Owner's phone",
        answered_at: "2026-10-12T04:13:00Z",
      })
    );
    expect(ending).toMatchObject({ outcome: "accepted", where: "Owner's phone", system: false });
    expect(endingCopy(ending!, "Aarav").title).toBe("Accepted on Owner's phone at 9:43 am");
  });

  it("no_unit_free ends the request by the system: no mark on the shop", () => {
    const ending = endingFromError(failure(409, "no_unit_free", { days: ["2026-10-25"] }))!;
    expect(ending).toMatchObject({ outcome: "refused", system: true, reason: "no_unit" });
    const copy = endingCopy(ending, "Aarav");
    expect(copy.title).toBe("This request has ended");
    expect(copy.sub).toMatch(/No unit is free any more/);
    expect(copy.sub).toMatch(/isn't counted against you/);
  });

  it("cannot_accept names what the shop is missing", () => {
    const ending = endingFromError(failure(403, "cannot_accept", { missing: ["bank_account", "id_check"] }))!;
    expect(ending.missing).toEqual(["bank_account", "id_check"]);
    expect(endingCopy(ending, null).sub).toMatch(/a verified bank account and a passed ID check/);
  });

  it("is null for a failure that leaves the request ringing", () => {
    expect(endingFromError(failure(0, null))).toBeNull();
    expect(endingFromError(failure(500, null))).toBeNull();
    expect(endingFromError(failure(429, "rate_limited"))).toBeNull();
    expect(endingFromError(failure(409, "stage_not_allowed"))).toBeNull();
    expect(endingFromError(null)).toBeNull();
  });

  it("knows when a tap may still have reached the server", () => {
    expect(outcomeUnknown(failure(0, null))).toBe(true);
    expect(outcomeUnknown(null)).toBe(true);
    expect(outcomeUnknown(failure(502, null))).toBe(true);
    expect(outcomeUnknown(failure(409, "stage_not_allowed"))).toBe(false);
  });

  it("has a line for each failure that does not end the request", () => {
    expect(answerErrorText(failure(0, null))).toMatch(/couldn't reach Renit/);
    expect(answerErrorText(failure(429, "rate_limited"))).toMatch(/Too many taps/);
    expect(answerErrorText(failure(403, "not_owner"))).toMatch(/can't answer bookings/);
    expect(answerErrorText(failure(500, null))).toMatch(/Something went wrong/);
  });
});

describe("what became of a request, in words", () => {
  it("another device accepted (SH-03)", () => {
    const ending = endingFromRecent(recent());
    const copy = endingCopy(ending, "Aarav");
    expect(copy.title).toBe("Accepted on the dashboard (Chrome on Windows) at 9:43 am");
    // No minutes are promised: the shop's object does not carry the rent time.
    expect(copy.sub).toBe("Aarav has been asked to pay the rent.");
  });

  it("this phone's own device wins the name, whatever the server called it", () => {
    expect(whereText("phone", "iPhone 15", true)).toBe("this phone");
    expect(endingCopy(endingFromRecent(recent({ answered_via: "phone", this_device: true })), "Aarav").title).toBe(
      "Accepted on this phone at 9:43 am"
    );
  });

  it("says where each kind of answer came from", () => {
    expect(whereText("dashboard", null)).toBe("the dashboard");
    expect(whereText("phone", null)).toBe("another phone");
    expect(whereText("admin", null)).toBe("Renit");
    expect(whereText(null, null)).toBeNull();
  });

  it("a refusal elsewhere, a cancelled request, and one nobody answered", () => {
    expect(endingCopy(endingFromRecent(recent({ outcome: "refused" })), "Aarav").title).toMatch(/^Refused on the dashboard/);
    const cancelled = endingFromRecent(recent({ outcome: "cancelled", answered_via: null, device_name: null, answered_at: null }));
    expect(endingCopy(cancelled, "Aarav")).toEqual({ title: "This request has ended", sub: "Aarav cancelled it." });
    const silent = endingFromRecent(recent({ outcome: "no_answer", answered_via: null, device_name: null, answered_at: null }));
    expect(endingCopy(silent, null)).toEqual({ title: "This request has ended", sub: "It wasn't answered in time." });
  });

  it("a request the system ended is not drawn as an answer, and is not counted against the shop", () => {
    const ending = endingFromRecent(recent({ outcome: "refused", answered_via: "system", device_name: null }));
    expect(ending.system).toBe(true);
    expect(endingCopy(ending, "Aarav").title).toBe("This request has ended");
  });

  it("this phone's own answer and what happened to the block", () => {
    const accepted = hereEnding("accepted", null);
    expect(endingCopy(accepted, "Aarav", true)).toEqual({
      title: "You accepted this booking",
      sub: "Aarav has been asked to pay the rent.",
    });
    expect(endingCopy(hereEnding("refused", null, "blocked"), "Aarav", true).sub).toMatch(/dates are blocked for one unit/);
    expect(endingCopy(hereEnding("refused", null, "none_free"), "Aarav", true).sub).toMatch(/nothing was blocked/);
    expect(endingCopy(hereEnding("refused", null, "not_asked"), "Aarav", true).sub).toBe(
      "Aarav has been told. A refusal carries no penalty."
    );
  });

  it("lists what is missing in plain words", () => {
    expect(missingText(["bank_account"])).toBe("a verified bank account");
    expect(missingText(["bank_account", "id_check"])).toBe("a verified bank account and a passed ID check");
    expect(missingText([])).toBe("");
  });
});

describe("endingFromBooking: an old tap, long after the five minutes the live answer remembers", () => {
  const booking = (over: Record<string, unknown>) =>
    ({ exit: "", exit_reason: "", stage: "accepted", answered: null, ...over }) as unknown as BookingShop;
  const answered = { at: "2026-10-12T04:13:00Z", via: "phone", device_name: "Owner's phone", seconds: 118 };

  it("an accepted booking is an accepted request, with where and when", () => {
    expect(endingFromBooking(booking({ answered }))).toMatchObject({
      outcome: "accepted",
      where: "Owner's phone",
      at: "2026-10-12T04:13:00Z",
    });
    // Accepted, then cancelled by the customer: the ring's ending is still the accept.
    expect(endingFromBooking(booking({ answered, exit: "cancelled_by_customer", exit_reason: "free" }))?.outcome).toBe(
      "accepted"
    );
  });

  it("a refusal keeps its reason, and a system one is marked as the system's", () => {
    expect(endingFromBooking(booking({ exit: "refused", exit_reason: "not_available", answered }))?.outcome).toBe("refused");
    const system = endingFromBooking(
      booking({ exit: "refused", exit_reason: "no_unit", answered: { ...answered, via: "system", device_name: null } })
    );
    expect(system).toMatchObject({ system: true, reason: "no_unit" });
  });

  it("silence and a cancel while it rang", () => {
    expect(endingFromBooking(booking({ exit: "no_answer" }))?.outcome).toBe("no_answer");
    expect(endingFromBooking(booking({ exit: "cancelled_by_customer", exit_reason: "while_ringing" }))?.outcome).toBe(
      "cancelled"
    );
  });

  it("is null for a booking that is still ringing or waiting for the shop to open", () => {
    expect(endingFromBooking(booking({ stage: "ringing" }))).toBeNull();
  });
});

describe("Can't do it", () => {
  it("sends block_dates only with 'not available'", () => {
    expect(refuseBody("not_available", true)).toEqual({ reason: "not_available", block_dates: true });
    expect(refuseBody("not_available", false)).toEqual({ reason: "not_available", block_dates: false });
    expect(refuseBody("other", true)).toEqual({ reason: "other", block_dates: false });
  });

  it("tells what became of the block: made, no unit free to take, or not asked for", () => {
    expect(blockResult(true, { id: 88 })).toBe("blocked");
    expect(blockResult(true, null)).toBe("none_free");
    expect(blockResult(false, null)).toBe("not_asked");
  });
});
