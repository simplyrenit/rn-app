import { describe, expect, it } from "@jest/globals";
import { SavedAddress } from "../addresses";
import {
  addressRowCopy,
  areaOf,
  cardDeliveryLine,
  deliverCountLine,
  deliveryLineText,
  deliveryReason,
  nobodyDeliversCopy,
  productHowLine,
  splitByDelivery,
} from "../delivery";

const delivers = { shop: { delivers: true } };
const home: SavedAddress = {
  id: 4,
  address: "Yari Road, Versova, Andheri West, Mumbai 400061",
  address_line_1: "Flat 12",
  address_line_2: "",
  locality: "Versova, Mumbai",
  address_type: "home",
  label: "",
  coordinates: { lat: 19.13, long: 72.81 },
  is_default: true,
  postal_code: "400061",
};

const line = (...args: Parameters<typeof cardDeliveryLine>) => {
  const l = cardDeliveryLine(...args);
  return l && deliveryLineText(l);
};

describe("cardDeliveryLine", () => {
  it("says the fee when the shop delivers to the chosen address", () => {
    const l = cardDeliveryLine({ ...delivers, delivery: { to_me: true, fee: "110.00", km: "1.2" } }, "5.0 km away");
    expect(l).toEqual({ km: "1.2 km", word: "Delivery", fee: "₹110" });
    expect(deliveryLineText(l!)).toBe("1.2 km · Delivery ₹110");
  });

  it("says self pickup when it doesn't, with the km from the address, never the phone's", () => {
    expect(line({ ...delivers, delivery: { to_me: false, fee: null, km: "0.9" } }, "5.0 km away")).toBe(
      "0.9 km · Self pickup"
    );
    expect(line({ ...delivers, delivery: { to_me: false, fee: null, km: null } }, "5.0 km away")).toBe("Self pickup");
  });

  it("with no address chosen, says delivery is available from the phone's distance", () => {
    expect(line({ ...delivers, delivery: null }, "1.2 km away")).toBe("1.2 km away · Delivery available");
    expect(line(delivers, null)).toBe("Delivery available");
  });

  it("keeps the card's own line for a listing that is never delivered", () => {
    expect(cardDeliveryLine({ shop: { delivers: false } }, "1.2 km away")).toBeNull();
    expect(cardDeliveryLine({ ...delivers, not_delivered: true }, "1.2 km away")).toBeNull();
    expect(cardDeliveryLine({}, null)).toBeNull();
  });
});

describe("splitByDelivery and the count line", () => {
  const a = { name: "a", delivery: { to_me: true, fee: "110.00", km: "1.2" } };
  const b = { name: "b", delivery: { to_me: false, fee: null, km: "0.9" } };
  const c = { name: "c", delivery: null };

  it("puts only the listings that deliver to the address on the delivery side", () => {
    expect(splitByDelivery([a, b, c])).toEqual({ deliver: [a], pickup: [b, c] });
  });

  it("counts both sides, and leaves out an empty pickup side", () => {
    expect(deliverCountLine(4, 3)).toEqual({ shown: "Showing 4 that deliver", more: "3 more for self pickup" });
    expect(deliverCountLine(4, 0)).toEqual({ shown: "Showing 4 that deliver", more: null });
  });
});

describe("nobodyDeliversCopy", () => {
  const pickup = (owner: string, km: string | null) => ({
    owner: { username: owner },
    delivery: { to_me: false, fee: null, km },
  });

  it("counts shops, not listings, and names the closest from the address", () => {
    expect(
      nobodyDeliversCopy("air coolers", "Versova", [pickup("a", "2.4"), pickup("a", "0.9"), pickup("b", "3.1")])
    ).toEqual({
      title: "No one delivers air coolers to Versova yet",
      body: "2 shops nearby have them for self pickup. The closest is 0.9 km away.",
    });
  });

  it("says one shop as one, and drops the closest when no km is known", () => {
    expect(nobodyDeliversCopy("drills", "400061", [pickup("a", null)]).body).toBe(
      "1 shop nearby has them for self pickup."
    );
    expect(nobodyDeliversCopy("", "", []).title).toBe("No one delivers these to this address yet");
  });
});

describe("productHowLine", () => {
  it("answers for the chosen address", () => {
    expect(productHowLine({ ...delivers, delivery: { to_me: true, fee: "110.00", km: "1.2" } }, "Home")).toBe(
      "Self pickup or delivery to Home ₹110"
    );
    expect(productHowLine({ ...delivers, delivery: { to_me: false, fee: null, km: "1.2" } }, "Home")).toBe(
      "Self pickup · doesn't deliver to Home"
    );
  });

  it("is null, keeping today's line, with no answer, no address or no delivery at all", () => {
    expect(productHowLine({ ...delivers, delivery: null }, "Home")).toBeNull();
    expect(productHowLine({ ...delivers, delivery: { to_me: true, fee: "1", km: null } }, null)).toBeNull();
    expect(productHowLine({ shop: { delivers: false }, delivery: { to_me: false, fee: null, km: null } }, "Home")).toBeNull();
  });
});

describe("deliveryReason (BK-02)", () => {
  const off = { status: "too_far", reason: "area_off" as const, distance_km: "3.2" };

  it("names the area and its PIN, else the PIN alone", () => {
    expect(deliveryReason({ ...off, area: { pin: "400061", name: "Vesava" } }, "SoundBox Rentals", "5.0")).toBe(
      "SoundBox Rentals doesn't deliver to Vesava (400061). You can pick it up 3.2 km away, or use another address."
    );
    expect(deliveryReason({ ...off, area: { pin: "400061", name: "" } }, "SoundBox Rentals", "5.0")).toBe(
      "SoundBox Rentals doesn't deliver to 400061. You can pick it up 3.2 km away, or use another address."
    );
  });

  it("says the shop's limit when it is the distance, from an older server too", () => {
    const far = { status: "too_far", distance_km: "8.4" };
    expect(deliveryReason({ ...far, reason: "distance" }, "SoundBox Rentals", "5.0")).toBe(
      "SoundBox Rentals delivers up to 5 km. This address is 8.4 km away."
    );
    expect(deliveryReason(far, "SoundBox Rentals", "7.5")).toBe(
      "SoundBox Rentals delivers up to 7.5 km. This address is 8.4 km away."
    );
  });

  it("says pickup only, and never reads an unknown status as a yes", () => {
    expect(deliveryReason({ status: "not_offered", distance_km: null }, "SoundBox Rentals", null)).toBe(
      "SoundBox Rentals only offers self pickup."
    );
    expect(deliveryReason({ status: "paused", distance_km: null }, "SoundBox Rentals", null)).toBe(
      "SoundBox Rentals can't deliver to this address. You can pick it up, or use another address."
    );
  });
});

describe("the address row (D12)", () => {
  it("has a line for each state", () => {
    expect(addressRowCopy("signed_out", null)).toEqual({ text: "Sign in to see who delivers to you", action: "Sign in" });
    expect(addressRowCopy("none", null)).toEqual({ text: "Add your address to see who delivers", action: "Add" });
    expect(addressRowCopy("ready", home)).toEqual({ text: "Delivering to Home · Versova", action: "Change" });
    expect(addressRowCopy("loading", null)).toBeNull();
    expect(addressRowCopy("error", null)).toBeNull();
  });

  it("names the area by the locality's first part, else the PIN", () => {
    expect(areaOf(home)).toBe("Versova");
    expect(areaOf({ locality: "", postal_code: "400061" })).toBe("400061");
  });
});
