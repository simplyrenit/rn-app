import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Location from "expo-location";
import { SavedAddress } from "@/lib/addresses";
import { googleReverseGeocode } from "@/lib/geocode";
import { getDiscoveryCoordinates } from "@/lib/location";
import axiosInstance from "@/lib/networkUtils";
import { defaultPickupLocation, localityFor, localityOfSaved } from "../pickup-location";

jest.mock("@/lib/config", () => ({
  MY_PRODUCTS_ENDPOINT: "https://api.test/my/products/",
  MY_ADDRESSES_ENDPOINT: "https://api.test/my/addresses/",
}));
jest.mock("@/lib/networkUtils", () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn() },
}));
jest.mock("@/lib/location", () => ({ getDiscoveryCoordinates: jest.fn() }));
jest.mock("@/lib/geocode", () => ({
  ...(jest.requireActual("@/lib/geocode") as object),
  googleReverseGeocode: jest.fn(),
}));
jest.mock("expo-location", () => ({ reverseGeocodeAsync: jest.fn() }));

const phoneGeocoder = Location.reverseGeocodeAsync as jest.MockedFunction<
  typeof Location.reverseGeocodeAsync
>;
const google = googleReverseGeocode as jest.MockedFunction<typeof googleReverseGeocode>;
const gps = getDiscoveryCoordinates as jest.MockedFunction<typeof getDiscoveryCoordinates>;
const api = axiosInstance as unknown as {
  get: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
  patch: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
};

const saved = (over: Partial<SavedAddress> = {}): SavedAddress => ({
  id: 7,
  address: "Lodha Amara, Kolshet Road, Thane West",
  address_line_1: "Flat 1203, Tower B",
  address_line_2: "Near the clubhouse",
  locality: "Thane West, Thane",
  address_type: "home",
  label: "",
  coordinates: { lat: 19.2437, long: 72.9781 },
  is_default: true,
  ...over,
});

const place = (district: string, city: string) =>
  [{ district, city }] as unknown as Location.LocationGeocodedAddress[];

beforeEach(() => {
  jest.clearAllMocks();
  google.mockResolvedValue(null);
  gps.mockResolvedValue(null as never);
  api.get.mockResolvedValue({ data: { results: [] } });
  api.patch.mockResolvedValue({ data: {} });
});

describe("localityFor", () => {
  it("uses the phone's geocoder when it answers", async () => {
    phoneGeocoder.mockResolvedValue(place("Thane West", "Thane"));

    expect(await localityFor(19.2, 72.9)).toBe("Thane West, Thane");
    expect(google).not.toHaveBeenCalled();
  });

  it("asks Google when the phone's geocoder throws (Android without location permission)", async () => {
    phoneGeocoder.mockRejectedValue(new Error("Not authorized to use location services"));
    google.mockResolvedValue({ locality: "Vashi, Navi Mumbai", address: "Sector 17, Vashi" });

    expect(await localityFor(19.07, 73.0)).toBe("Vashi, Navi Mumbai");
  });

  it("asks Google when the phone's geocoder has nothing for the point", async () => {
    phoneGeocoder.mockResolvedValue([]);
    google.mockResolvedValue({ locality: "Powai, Mumbai", address: null });

    expect(await localityFor(19.12, 72.9)).toBe("Powai, Mumbai");
  });

  it("is null when neither can name the point", async () => {
    phoneGeocoder.mockRejectedValue(new Error("boom"));

    expect(await localityFor(1, 1)).toBeNull();
  });
});

describe("localityOfSaved", () => {
  it("returns a stored locality without geocoding or writing", async () => {
    expect(await localityOfSaved(saved())).toBe("Thane West, Thane");
    expect(phoneGeocoder).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it("names a row that has none and writes it back", async () => {
    phoneGeocoder.mockResolvedValue(place("Thane West", "Thane"));

    expect(await localityOfSaved(saved({ locality: "" }))).toBe("Thane West, Thane");
    expect(api.patch).toHaveBeenCalledWith("https://api.test/my/addresses/7/", {
      locality: "Thane West, Thane",
    });
  });

  it("writes nothing when the point cannot be named", async () => {
    phoneGeocoder.mockResolvedValue([]);

    expect(await localityOfSaved(saved({ locality: "" }))).toBeNull();
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe("defaultPickupLocation", () => {
  it("puts the saved default first, without asking for the last listing or GPS", async () => {
    const location = await defaultPickupLocation(saved());

    expect(location).toEqual({
      locality: "Thane West, Thane",
      fullAddress: "Flat 1203, Tower B, Near the clubhouse",
      lat: 19.2437,
      long: 72.9781,
    });
    expect(api.get).not.toHaveBeenCalled();
    expect(gps).not.toHaveBeenCalled();
  });

  it("falls back to the last listing when there is no saved default", async () => {
    phoneGeocoder.mockResolvedValue(place("Powai", "Mumbai"));
    api.get.mockResolvedValue({
      data: {
        results: [
          { coordinates: { lat: 19.12, long: 72.9 }, location: "old", full_address: "Flat 4" },
        ],
      },
    });

    expect(await defaultPickupLocation(null)).toEqual({
      locality: "Powai, Mumbai",
      fullAddress: "Flat 4",
      lat: 19.12,
      long: 72.9,
    });
    expect(gps).not.toHaveBeenCalled();
  });

  it("falls back to GPS when there is no listing either", async () => {
    phoneGeocoder.mockResolvedValue(place("Vashi", "Navi Mumbai"));
    gps.mockResolvedValue({ lat: 19.07, long: 73.0 } as never);

    expect(await defaultPickupLocation()).toEqual({
      locality: "Vashi, Navi Mumbai",
      fullAddress: "",
      lat: 19.07,
      long: 73.0,
    });
  });

  it("passes over a saved default that cannot be named", async () => {
    phoneGeocoder.mockResolvedValue([]);

    expect(await defaultPickupLocation(saved({ locality: "" }))).toBeNull();
    expect(api.get).toHaveBeenCalled();
  });
});
