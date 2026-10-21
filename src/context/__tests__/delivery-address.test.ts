import { describe, expect, it, jest } from "@jest/globals";
import type { SavedAddress } from "@/lib/addresses";

// Only the resolution rules are under test; keep the address hook's network out.
jest.mock("@/backend/useAddresses", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: jest.fn() }));

// eslint-disable-next-line import/first
import { deliveryAddressKey, deliveryAddressState, resolveDeliveryAddress } from "../delivery-address";

const address = (id: number, over: Partial<SavedAddress> = {}): SavedAddress => ({
  id,
  address: "Mumbai",
  address_line_1: `Flat ${id}`,
  address_line_2: "",
  locality: "Versova, Mumbai",
  address_type: "other",
  label: "",
  coordinates: { lat: 19.13, long: 72.81 },
  is_default: false,
  postal_code: "400061",
  ...over,
});

describe("the session's delivery address (D12)", () => {
  const list = [address(1), address(2, { is_default: true }), address(3)];

  it("is the one chosen while it is still saved", () => {
    expect(resolveDeliveryAddress(list, 3)?.id).toBe(3);
  });

  it("falls back to the default when the chosen one was deleted, or none was chosen", () => {
    expect(resolveDeliveryAddress(list, 99)?.id).toBe(2);
    expect(resolveDeliveryAddress(list, null)?.id).toBe(2);
  });

  it("takes the first with no default, and is null with no addresses", () => {
    expect(resolveDeliveryAddress([address(5), address(6)], null)?.id).toBe(5);
    expect(resolveDeliveryAddress([], 5)).toBeNull();
  });

  it("is keyed on the id, the PIN and the point, so an edit is a change", () => {
    const before = deliveryAddressKey(address(1));
    expect(deliveryAddressKey(address(1, { postal_code: "400053" }))).not.toBe(before);
    expect(deliveryAddressKey(address(1, { coordinates: { lat: 19.14, long: 72.81 } }))).not.toBe(before);
    expect(deliveryAddressKey(address(1, { label: "Mom's" }))).toBe(before);
    expect(deliveryAddressKey(null)).toBe("");
  });

  it("names the row's state", () => {
    expect(deliveryAddressState(false, false, false, null)).toBe("signed_out");
    expect(deliveryAddressState(true, true, false, null)).toBe("loading");
    expect(deliveryAddressState(true, false, false, address(1))).toBe("ready");
    expect(deliveryAddressState(true, false, false, null)).toBe("none");
    // A list that failed is not an empty one.
    expect(deliveryAddressState(true, false, true, null)).toBe("error");
  });
});
