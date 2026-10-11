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

  it("leaves the owner's pushes to the sub-tasks that build the shop's screens", () => {
    expect(pushRoute(push("ring", { role: "owner" }))).toBeNull();
    expect(pushRoute(push("ring_ended", { role: "owner" }))).toBeNull();
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
