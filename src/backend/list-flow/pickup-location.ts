import { SavedAddress, toLocationValue } from "@/lib/addresses";
import { MY_ADDRESSES_ENDPOINT, MY_PRODUCTS_ENDPOINT } from "@/lib/config";
import { googleReverseGeocode, joinLocality } from "@/lib/geocode";
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
    const named =
      place &&
      joinLocality([place.district || place.subregion || place.name, place.city || place.region]);
    if (named) return named;
  } catch {
    // Android's geocoder throws without location permission, so a user who
    // denied it could pick a spot by hand and then never name it.
  }
  // The phone could not name the point; Google can, with or without permission.
  return (await googleReverseGeocode(lat, long))?.locality ?? null;
}

/**
 * A saved address's locality. A row from before the `locality` column existed
 * comes back blank; it is named here and written back, so the row is repaired
 * the first time it is read instead of being geocoded on every read.
 */
export async function localityOfSaved(saved: SavedAddress): Promise<string | null> {
  if (saved.locality) return saved.locality;
  const named = await localityFor(saved.coordinates.lat, saved.coordinates.long);
  if (named) {
    void axiosInstance
      .patch(`${MY_ADDRESSES_ENDPOINT}${saved.id}/`, { locality: named })
      .catch(() => {});
  }
  return named;
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
    // Named from the coordinates first: older listings stored a full street
    // address in `location`, and that must not be copied into a new public
    // listing. The stored string is only a fallback when geocoding fails.
    const locality = (await localityFor(coords.lat, coords.long)) || product.location;
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

/**
 * §8.5 in order: the owner's default saved address (ENG-25), then the last
 * listing, then GPS. The caller passes the default once the address query has
 * settled; null or nothing means there is none.
 */
export async function defaultPickupLocation(
  saved?: SavedAddress | null
): Promise<LocationValue | null> {
  if (saved) {
    // A blank locality (a row older than the column) would reach the listing
    // as an empty public `location`, so an address that cannot be named is
    // passed over.
    const locality = await localityOfSaved(saved);
    if (locality) return { ...toLocationValue(saved), locality };
  }
  return (await lastListingLocation()) ?? (await gpsLocation());
}
