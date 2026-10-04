import { describe, expect, it } from "@jest/globals";
import {
  MAX_ADDRESSES,
  SavedAddress,
  addressAtPoint,
  addressLine,
  addressTitle,
  canSaveOffered,
  flatForPickedSpot,
  fullAddressForNewPin,
  inlineOfferPayload,
  showsSaveOffer,
  takenTypes,
  toLocationValue,
} from "../addresses";

const address = (over: Partial<SavedAddress> = {}): SavedAddress => ({
  id: 1,
  address: "Lodha Amara, Kolshet Road, Thane West, Maharashtra 400607",
  address_line_1: "Flat 1203, Tower B",
  address_line_2: "Near the clubhouse",
  locality: "Thane West, Thane",
  address_type: "home",
  label: "",
  coordinates: { lat: 19.2437, long: 72.9781 },
  is_default: true,
  ...over,
});

describe("addressTitle", () => {
  it("names Home and Work by their type, whatever the label says", () => {
    expect(addressTitle(address({ address_type: "home", label: "ignored" }))).toBe("Home");
    expect(addressTitle(address({ address_type: "work" }))).toBe("Work");
  });

  it("uses an Other address's custom name, or 'Other' when it has none", () => {
    expect(addressTitle(address({ address_type: "other", label: "Mom's place" }))).toBe("Mom's place");
    expect(addressTitle(address({ address_type: "other", label: "" }))).toBe("Other");
  });
});

describe("addressLine", () => {
  it("puts the locality first, then flat and landmark", () => {
    expect(addressLine(address())).toBe("Thane West, Thane · Flat 1203, Tower B, Near the clubhouse");
  });

  it("skips the parts that are blank", () => {
    expect(addressLine(address({ address_line_2: "" }))).toBe("Thane West, Thane · Flat 1203, Tower B");
    expect(addressLine(address({ address_line_1: "", address_line_2: "" }))).toBe("Thane West, Thane");
    expect(addressLine(address({ locality: "" }))).toBe("Flat 1203, Tower B, Near the clubhouse");
    expect(addressLine(address({ address_line_1: "", address_line_2: "", locality: "" }))).toBe("");
  });
});

describe("toLocationValue", () => {
  it("carries the locality and coordinates, and joins both lines", () => {
    expect(toLocationValue(address())).toEqual({
      locality: "Thane West, Thane",
      fullAddress: "Flat 1203, Tower B, Near the clubhouse",
      lat: 19.2437,
      long: 72.9781,
    });
  });

  it("uses the one line there is", () => {
    expect(toLocationValue(address({ address_line_2: "" })).fullAddress).toBe("Flat 1203, Tower B");
    expect(toLocationValue(address({ address_line_1: "" })).fullAddress).toBe("Near the clubhouse");
  });

  it("is an empty full address when neither line is set", () => {
    expect(toLocationValue(address({ address_line_1: "", address_line_2: "" })).fullAddress).toBe("");
  });
});

describe("inlineOfferPayload", () => {
  const location = { locality: "Thane West, Thane", fullAddress: "  Flat 1203, near the clubhouse ", lat: 19.2, long: 72.9 };

  it("maps a draft location onto the address fields", () => {
    expect(inlineOfferPayload(location, "work")).toEqual({
      address: "Thane West, Thane",
      address_line_1: "Flat 1203, near the clubhouse",
      address_line_2: "",
      locality: "Thane West, Thane",
      coordinates: { lat: 19.2, long: 72.9 },
      address_type: "work",
    });
  });

  it("cuts line 1 to the column's 255 characters", () => {
    const payload = inlineOfferPayload({ ...location, fullAddress: "x".repeat(300) }, "home");
    expect(payload.address_line_1).toHaveLength(255);
  });
});

describe("fullAddressForNewPin", () => {
  const saved = [address(), address({ id: 2, address_type: "work", address_line_1: "4th floor, WeWork", address_line_2: "" })];

  it("drops text that is exactly a saved address's lines", () => {
    expect(fullAddressForNewPin(toLocationValue(saved[0]).fullAddress, saved)).toBe("");
    expect(fullAddressForNewPin("4th floor, WeWork", saved)).toBe("");
  });

  it("keeps what the owner typed, including an edited saved line", () => {
    expect(fullAddressForNewPin("Gate 2, ask for Ravi", saved)).toBe("Gate 2, ask for Ravi");
    expect(fullAddressForNewPin("Flat 1203, Tower B, Near the clubhouse, ring twice", saved)).toBe(
      "Flat 1203, Tower B, Near the clubhouse, ring twice"
    );
  });

  it("keeps the text when there are no saved addresses, and leaves empty text empty", () => {
    expect(fullAddressForNewPin("Flat 9", [])).toBe("Flat 9");
    expect(fullAddressForNewPin("", saved)).toBe("");
  });
});

describe("takenTypes", () => {
  const list = [
    address({ id: 1, address_type: "home" }),
    address({ id: 2, address_type: "other" }),
    address({ id: 3, address_type: "other" }),
  ];

  it("lists the Home and Work already saved, never Other", () => {
    expect([...takenTypes(list)]).toEqual(["home"]);
    expect([...takenTypes([...list, address({ id: 4, address_type: "work" })])].sort()).toEqual(["home", "work"]);
    expect(takenTypes([]).size).toBe(0);
  });

  it("ignores the address being edited", () => {
    expect(takenTypes(list, 1).size).toBe(0);
    expect([...takenTypes(list, 2)]).toEqual(["home"]);
  });
});

describe("addressAtPoint", () => {
  const home = address({ id: 1 });
  const work = address({ id: 2, address_type: "work", coordinates: { lat: 19.1176, long: 72.906 } });

  it("finds the saved address at a point, through a float round trip", () => {
    expect(addressAtPoint([home, work], { lat: 19.1176, long: 72.906 })?.id).toBe(2);
    expect(addressAtPoint([home, work], { lat: 19.2437 + 1e-9, long: 72.9781 })?.id).toBe(1);
  });

  it("tells two addresses on one pin apart by the flat line in use", () => {
    const neighbour = address({ id: 3, address_type: "other", address_line_1: "Flat 904, Tower B", address_line_2: "" });
    expect(addressAtPoint([home, neighbour], home.coordinates, "Flat 904, Tower B")?.id).toBe(3);
    // Edited for this listing, the text matches neither: the first one stands.
    expect(addressAtPoint([home, neighbour], home.coordinates, "Gate 2")?.id).toBe(1);
    expect(addressAtPoint([home, neighbour], home.coordinates)?.id).toBe(1);
  });

  it("finds nothing for a spot that is not saved", () => {
    expect(addressAtPoint([home, work], { lat: 19.2437, long: 72.9791 })).toBeUndefined();
    expect(addressAtPoint([], { lat: 19.2437, long: 72.9781 })).toBeUndefined();
  });
});

describe("canSaveOffered", () => {
  const elsewhere = { lat: 19.07, long: 72.87 };
  const home = address({ id: 1 });

  it("allows a first address, and a new spot beside others", () => {
    expect(canSaveOffered([], { address_type: "home", coordinates: elsewhere })).toBe(true);
    expect(canSaveOffered([home], { address_type: "work", coordinates: elsewhere })).toBe(true);
    expect(canSaveOffered([home], { address_type: "other", coordinates: elsewhere })).toBe(true);
  });

  it("refuses a second Home or Work", () => {
    expect(canSaveOffered([home], { address_type: "home", coordinates: elsewhere })).toBe(false);
  });

  it("refuses a spot that is already saved, whatever the type", () => {
    expect(canSaveOffered([home], { address_type: "other", coordinates: home.coordinates })).toBe(false);
  });

  it("refuses a spot a few metres from a saved one, and allows one down the road", () => {
    // About 11 m north of Home: the same place through GPS jitter.
    const jitter = { lat: home.coordinates.lat + 0.0001, long: home.coordinates.long };
    // About 220 m north: somewhere else.
    const downTheRoad = { lat: home.coordinates.lat + 0.002, long: home.coordinates.long };
    expect(canSaveOffered([home], { address_type: "other", coordinates: jitter })).toBe(false);
    expect(canSaveOffered([home], { address_type: "other", coordinates: downTheRoad })).toBe(true);
  });

  it("refuses when the list is full", () => {
    const full = Array.from({ length: MAX_ADDRESSES }, (_, i) =>
      address({ id: i + 1, address_type: "other", coordinates: { lat: 10 + i, long: 70 } })
    );
    expect(canSaveOffered(full, { address_type: "other", coordinates: elsewhere })).toBe(false);
  });
});

describe("showsSaveOffer", () => {
  const home = address({ id: 1 });
  const spot = { lat: 19.07, long: 72.87, fullAddress: "Flat 2, Sea View" };

  it("offers once a flat line is typed for a spot that is not saved", () => {
    expect(showsSaveOffer(spot, [home], true)).toBe(true);
    expect(showsSaveOffer(spot, [], true)).toBe(true);
  });

  it("waits for the flat line, and for the address list", () => {
    expect(showsSaveOffer({ ...spot, fullAddress: "  " }, [home], true)).toBe(false);
    expect(showsSaveOffer(spot, [home], false)).toBe(false);
    expect(showsSaveOffer(null, [home], true)).toBe(false);
  });

  it("does not offer a saved address, or a spot beside one", () => {
    expect(showsSaveOffer({ ...spot, ...home.coordinates }, [home], true)).toBe(false);
    expect(showsSaveOffer({ ...spot, lat: home.coordinates.lat + 0.0001, long: home.coordinates.long }, [home], true)).toBe(false);
  });
});

describe("flatForPickedSpot", () => {
  const home = address({ id: 1 });
  const atHome = { ...home.coordinates, fullAddress: "Flat 1203, Tower B, Near the clubhouse" };
  const elsewhere = { lat: 19.07, long: 72.87 };

  it("takes a picked saved address's own lines", () => {
    expect(flatForPickedSpot(null, { ...home.coordinates, saved: home }, [home])).toBe(
      "Flat 1203, Tower B, Near the clubhouse"
    );
  });

  it("treats a map spot that lands on a saved address as that address", () => {
    expect(flatForPickedSpot({ ...elsewhere, fullAddress: "typed" }, home.coordinates, [home])).toBe(
      "Flat 1203, Tower B, Near the clubhouse"
    );
  });

  it("leaves a saved address's text behind when the pin moves away, edited or not", () => {
    expect(flatForPickedSpot(atHome, elsewhere, [home])).toBe("");
    expect(flatForPickedSpot({ ...atHome, fullAddress: "Flat 1203, Tower B, gate 2" }, elsewhere, [home])).toBe("");
  });

  it("carries what the owner typed from one unsaved spot to another", () => {
    expect(flatForPickedSpot({ lat: 19.1, long: 72.9, fullAddress: "Flat 2, Sea View" }, elsewhere, [home])).toBe(
      "Flat 2, Sea View"
    );
    expect(flatForPickedSpot(null, elsewhere, [home])).toBe("");
  });
});
