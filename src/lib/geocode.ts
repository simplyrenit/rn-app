import { GOOGLE_MAP_API_KEY } from "@/lib/config";
import axios from "axios";

/** What a point is called: "Locality, City" for the public, and the full address line. */
export interface NamedPlace {
  locality: string | null;
  address: string | null;
}

interface GoogleComponent {
  long_name: string;
  types: string[];
}

export interface GoogleGeocodeResult {
  formatted_address?: string;
  address_components?: GoogleComponent[];
}

/** "Thane West, Thane" from its two halves; one half, or the same name twice, is given once. */
export function joinLocality(parts: (string | null | undefined)[]): string | null {
  const named = parts.filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index
  );
  return named.length ? named.join(", ") : null;
}

/**
 * The locality and address in a Geocoding API answer. Results come most
 * specific first, so the first component of each kind is the one for this
 * point. Never the route or the premise: the locality is public.
 */
export function placeFromGoogle(results: GoogleGeocodeResult[]): NamedPlace {
  const components = results.flatMap((result) => result.address_components ?? []);
  const first = (...types: string[]) => {
    for (const type of types) {
      const found = components.find((component) => component.types.includes(type));
      if (found) return found.long_name;
    }
    return null;
  };
  return {
    locality: joinLocality([
      first("sublocality_level_1", "sublocality", "neighborhood"),
      first("locality", "administrative_area_level_3", "administrative_area_level_2"),
    ]),
    address: results[0]?.formatted_address || null,
  };
}

/**
 * Name a point through Google's Geocoding web API. The fallback for when the
 * phone's own geocoder cannot answer — on Android it refuses outright without
 * location permission, which left a user who had denied it unable to name, and
 * so to save, any spot they picked by hand. Resolves null on any failure.
 */
export async function googleReverseGeocode(lat: number, long: number): Promise<NamedPlace | null> {
  try {
    // Plain axios, not the app's instance: that one adds the user's token.
    const response = await axios.get<{ status?: string; results?: GoogleGeocodeResult[] }>(
      "https://maps.googleapis.com/maps/api/geocode/json",
      { params: { latlng: `${lat},${long}`, key: GOOGLE_MAP_API_KEY }, timeout: 8000 }
    );
    if (response.data?.status !== "OK" || !response.data.results?.length) return null;
    return placeFromGoogle(response.data.results);
  } catch {
    return null;
  }
}
