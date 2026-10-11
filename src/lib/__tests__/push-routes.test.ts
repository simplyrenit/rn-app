import { describe, expect, it } from "@jest/globals";
import { pushRoute } from "../push-routes";

const push = (type: string, over: Record<string, unknown> = {}) => ({
  type,
  booking: "RN-24831",
  role: "customer",
  ...over,
});

describe("pushRoute", () => {
  it("opens the booking for every customer type the contract lists", () => {
    for (const type of [
      "accepted",
      "refused",
      "no_answer",
      "rent_reminder",
      "lapsed",
      "confirmed",
      "window",
      "deposit_ask",
      "deposit_reminder",
      "ready",
      "cancelled",
      "started",
      "returned",
      "closed",
      "late",
      "refund",
      "claim",
    ]) {
      expect(pushRoute(push(type))).toEqual({ screen: "Booking", number: "RN-24831" });
    }
  });

  it("reads the extra fields of a type without needing them", () => {
    expect(pushRoute(push("refused", { reason: "not_available" }))?.number).toBe("RN-24831");
    expect(pushRoute(push("window", { what: "request" }))?.number).toBe("RN-24831");
    expect(pushRoute(push("refund", { amount: "99.00", destination: "UPI asha@okhdfcbank" }))?.number).toBe("RN-24831");
  });

  it("ignores a type this build does not know", () => {
    expect(pushRoute(push("something_new"))).toBeNull();
  });

  it("opens the ring on a `ring` push, with the request it carried", () => {
    const ring = {
      number: "RN-24831",
      product: { name: "PRO_8fk2Lq", title: "Sony PS5", cover_image: null },
      first_day: "2026-10-24",
      last_day: "2026-10-26",
      days: 3,
      delivery_mode: "pickup",
      customer: { first_name: "Aarav", last_initial: "M", id_checked: true, rentals_completed: 3, area: "Andheri East", distance_km: "3.2" },
      units: { in_use: 2, quantity: 5 },
      you_earn: "1830.00",
    };
    const route = pushRoute(push("ring", { role: "owner", ring }));
    expect(route).toMatchObject({ screen: "ShopRing", number: "RN-24831", ended: false });
    expect(route?.screen === "ShopRing" && route.ring?.you_earn).toBe("1830.00");
    // The same, with the ring as text.
    const asText = pushRoute(push("ring", { role: "owner", ring: JSON.stringify(ring) }));
    expect(asText?.screen === "ShopRing" && asText.ring?.product.title).toBe("Sony PS5");
  });

  it("still opens the ring for a `ring` whose ring object is missing or broken: the screen reads the server", () => {
    expect(pushRoute(push("ring", { role: "owner" }))).toEqual({ screen: "ShopRing", number: "RN-24831", ring: null, ended: false });
    expect(pushRoute(push("ring", { role: "owner", ring: { number: "RN-1" } }))).toMatchObject({ ring: null });
    // Nothing to open without a number from either place.
    expect(pushRoute(push("ring", { role: "owner", booking: null, ring: { number: "RN-9" } }))).toBeNull();
  });

  it("does not drop a ring that left out the role: only a customer's copy is not the shop's", () => {
    const { role: _role, ...noRole } = push("ring");
    expect(pushRoute(noRole)).toMatchObject({ screen: "ShopRing", number: "RN-24831" });
    expect(pushRoute(push("ring", { role: "customer" }))).toBeNull();
  });

  it("`ring_ended` closes the ring: it only says the request is over", () => {
    expect(pushRoute(push("ring_ended", { role: "owner", outcome: "accepted", answered_via: "dashboard" }))).toEqual({
      screen: "ShopRing",
      number: "RN-24831",
      ring: null,
      ended: true,
    });
  });

  it("leaves the owner's other pushes to ENG-210", () => {
    // Types both sides get are routed by who this copy is for.
    expect(pushRoute(push("confirmed", { role: "owner" }))).toBeNull();
    expect(pushRoute(push("cancelled", { role: "owner" }))).toBeNull();
  });

  it("opens nothing without a booking number", () => {
    expect(pushRoute(push("accepted", { booking: null }))).toBeNull();
    expect(pushRoute(push("accepted", { booking: "" }))).toBeNull();
  });

  it("ignores a chat push and anything that is not a booking push", () => {
    expect(pushRoute({ conversationId: "abc" })).toBeNull();
    expect(pushRoute(null)).toBeNull();
    expect(pushRoute(undefined)).toBeNull();
    expect(pushRoute("accepted")).toBeNull();
  });
});
