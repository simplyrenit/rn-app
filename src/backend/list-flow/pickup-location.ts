import { MY_PRODUCTS_ENDPOINT } from "@/lib/config";
import { LocationValue } from "@/lib/list-flow/types";
import { getDiscoveryCoordinates } from "@/lib/location";
import axiosInstance from "@/lib/networkUtils";
import { BackendProduct } from "@/lib/types";
import * as Location from "expo-location";

/**
 * "Locality, City" for a point — what a renter sees and what the create
 * payload sends as `location` (§5.2). Never the street: the exact address is
 * only shared once a booking is confirmed.
 */
export async function localityFor(lat: number, long: number): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: long });
    if (!place) return null;
    const locality = place.district || place.subregion || place.name;
    const city = place.city || place.region;
    const parts = [locality, city].filter(
      (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index
    );
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

/** §8.5 step 2: the location of the owner's most recent listing. */
export async function lastListingLocation(): Promise<LocationValue | null> {
  try {
    const response = await axiosInstance.get<{ results?: BackendProduct[] }>(MY_PRODUCTS_ENDPOINT, {
      params: { page_size: 1 },
    });
    const product = response.data?.results?.[0];
    const coords = product?.coordinates;
    if (!product || !coords || (coords.lat === 0 && coords.long === 0)) return null;
    const locality = product.location || (await localityFor(coords.lat, coords.long));
    if (!locality) return null;
    return {
      locality,
      fullAddress: product.full_address ?? "",
      lat: coords.lat,
      long: coords.long,
    };
  } catch {
    return null;
  }
}

/**
 * §8.5 step 3: where the phone is, named. Flat and landmark are left for the
 * owner. Resolves null when permission is denied, so the row stays "Set
 * pickup location" and the picker opens empty.
 */
export async function gpsLocation(): Promise<LocationValue | null> {
  const coords = await getDiscoveryCoordinates();
  if (!coords) return null;
  const locality = await localityFor(coords.lat, coords.long);
  // A point we cannot name is no default: the owner picks one instead.
  if (!locality) return null;
  return { locality, fullAddress: "", lat: coords.lat, long: coords.long };
}

/** §8.5 in order (ENG-25's saved address slots in first once that API exists). */
export async function defaultPickupLocation(): Promise<LocationValue | null> {
  return (await lastListingLocation()) ?? (await gpsLocation());
}
