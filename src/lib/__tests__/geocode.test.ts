import { describe, expect, it, jest } from "@jest/globals";
import { joinLocality, placeFromGoogle } from "../geocode";

jest.mock("@/lib/config", () => ({ GOOGLE_MAP_API_KEY: "test-key" }));

const component = (long_name: string, ...types: string[]) => ({ long_name, types });

describe("joinLocality", () => {
  it("joins the two halves", () => {
    expect(joinLocality(["Thane West", "Thane"])).toBe("Thane West, Thane");
  });

  it("gives one half, or the same name twice, once", () => {
    expect(joinLocality([null, "Thane"])).toBe("Thane");
    expect(joinLocality(["Thane", "Thane"])).toBe("Thane");
  });

  it("is null when there is nothing to name", () => {
    expect(joinLocality([null, undefined, ""])).toBeNull();
  });
});

describe("placeFromGoogle", () => {
  it("names the sub-locality and the city, never the street", () => {
    const place = placeFromGoogle([
      {
        formatted_address: "Lodha Amara, Kolshet Road, Thane West, Thane, Maharashtra 400607",
        address_components: [
          component("Lodha Amara", "premise"),
          component("Kolshet Road", "route"),
          component("Thane West", "sublocality_level_1", "sublocality", "political"),
          component("Thane", "locality", "political"),
          component("Maharashtra", "administrative_area_level_1", "political"),
        ],
      },
    ]);

    expect(place.locality).toBe("Thane West, Thane");
    expect(place.address).toBe("Lodha Amara, Kolshet Road, Thane West, Thane, Maharashtra 400607");
  });

  it("looks past a first result that has no locality in it", () => {
    const place = placeFromGoogle([
      { formatted_address: "7XQ4+2R Thane", address_components: [component("7XQ4+2R", "plus_code")] },
      {
        address_components: [
          component("Kolshet", "neighborhood"),
          component("Thane", "locality"),
        ],
      },
    ]);

    expect(place.locality).toBe("Kolshet, Thane");
  });

  it("falls back to the district when there is no city", () => {
    const place = placeFromGoogle([
      { address_components: [component("Raigad", "administrative_area_level_2")] },
    ]);

    expect(place.locality).toBe("Raigad");
  });

  it("names nothing from an answer with no usable part", () => {
    expect(placeFromGoogle([{ address_components: [component("India", "country")] }])).toEqual({
      locality: null,
      address: null,
    });
  });
});
