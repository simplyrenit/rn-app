import { describe, expect, it } from "@jest/globals";
import {
  SavedAddress,
  addressLine,
  addressTitle,
  fullAddressForNewPin,
  inlineOfferPayload,
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
  it("joins flat, landmark and locality", () => {
    expect(addressLine(address())).toBe("Flat 1203, Tower B, Near the clubhouse, Thane West, Thane");
  });

  it("skips the parts that are blank", () => {
    expect(addressLine(address({ address_line_2: "" }))).toBe("Flat 1203, Tower B, Thane West, Thane");
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
