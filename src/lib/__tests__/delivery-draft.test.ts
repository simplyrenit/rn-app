import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { deliveryDraft } from "../delivery-draft";

const draft = { delivers: true, base: "50", perKm: "15", maxKm: "5", excluded: ["400061"] };

describe("the delivery draft store", () => {
  afterEach(() => deliveryDraft.reset());

  it("starts empty, holds a draft, and resets", () => {
    expect(deliveryDraft.get()).toBeNull();
    deliveryDraft.set(draft);
    expect(deliveryDraft.get()).toBe(draft);
    deliveryDraft.reset();
    expect(deliveryDraft.get()).toBeNull();
  });

  it("tells each subscriber, until it unsubscribes", () => {
    const listener = jest.fn();
    const unsubscribe = deliveryDraft.subscribe(listener);
    deliveryDraft.set(draft);
    deliveryDraft.reset();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    deliveryDraft.set(draft);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
