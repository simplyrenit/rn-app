import type { LocationValue } from "@/lib/list-flow/types";

export const ADDRESS_TYPES = ["home", "work", "other"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

/** One row of `GET /api/my/addresses/` (ENG-25 §4). */
export interface SavedAddress {
  id: number;
  /** The display address the map gave. */
  address: string;
  /** Flat, house number or building. */
  address_line_1: string;
  /** Landmark. */
  address_line_2: string;
  /** "Locality, City" — the same string a listing stores in `location`. */
  locality: string;
  address_type: AddressType;
  /** A custom name. The server keeps it only when the type is `other`. */
  label: string;
  coordinates: { lat: number; long: number };
  is_default: boolean;
}

/** What create and update send. The server owns `id`, and the default when it is left out. */
export type AddressPayload = Omit<SavedAddress, "id" | "is_default" | "label"> & {
  label?: string;
  is_default?: boolean;
};

/**
 * What the address picker hands back: a saved address, or a one-off spot from
 * the map (no `saved`, empty lines).
 */
export interface PickedAddress {
  lat: number;
  long: number;
  locality: string;
  addressLine1: string;
  addressLine2: string;
  saved?: SavedAddress;
}

/** The server allows 20 per user (D18). */
export const MAX_ADDRESSES = 20;

/** "Home", "Work", or the custom name of an Other address. */
export function addressTitle(a: Pick<SavedAddress, "address_type" | "label">): string {
  if (a.address_type === "home") return "Home";
  if (a.address_type === "work") return "Work";
  return a.label || "Other";
}

/**
 * The one-line address a list row shows. Locality first: the row truncates,
 * and flat-first cut off the area ("…12B, Andh…"), the part an owner tells
 * two addresses apart by.
 */
export function addressLine(
  a: Pick<SavedAddress, "address_line_1" | "address_line_2" | "locality">
): string {
  return [a.locality, flatAndLandmark(a)].filter(Boolean).join(" · ");
}

/**
 * Flat and landmark as one line: what a listing stores as `full_address`. The
 * one place this is spelled, because `fullAddressForNewPin` recognises a saved
 * address's text by comparing against exactly this.
 */
export function flatAndLandmark(a: Pick<SavedAddress, "address_line_1" | "address_line_2">): string {
  return [a.address_line_1, a.address_line_2].filter(Boolean).join(", ");
}

/** A saved address as the listing draft holds a pickup location. */
export function toLocationValue(a: SavedAddress): LocationValue {
  return {
    locality: a.locality,
    fullAddress: flatAndLandmark(a),
    lat: a.coordinates.lat,
    long: a.coordinates.long,
  };
}

/**
 * The flat/landmark text to keep when the pickup pin moves to a point that is
 * not a saved address. Text that came from a saved address describes that
 * place and must not follow a different pin; text the owner typed stays.
 */
export function fullAddressForNewPin(
  current: string,
  saved: Pick<SavedAddress, "address_line_1" | "address_line_2">[]
): string {
  return saved.some((a) => flatAndLandmark(a) === current) ? "" : current;
}

/** Saved coordinates come back through a float round trip; ~0.1 m is "the same point". */
const samePoint = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * The saved address that sits at this point, if one does. Two can share a pin
 * (a Home and a neighbour's flat in one building); `flat`, the flat line in
 * use, picks between them. Without it, or without a match, the first one.
 */
export function addressAtPoint<
  T extends Pick<SavedAddress, "coordinates" | "address_line_1" | "address_line_2">,
>(list: T[], point: { lat: number; long: number }, flat?: string): T | undefined {
  const here = list.filter(
    (a) => samePoint(a.coordinates.lat, point.lat) && samePoint(a.coordinates.long, point.long)
  );
  return here.find((a) => flatAndLandmark(a) === flat) ?? here[0];
}

// ponytail: one fixed radius for "the same place". A second address in the
// next building cannot be saved from the Review offer (Profile still can);
// make it a choice in the offer if owners ask for that.
const SAME_PLACE_METRES = 50;

/** A saved address within a few doors of this point: GPS never repeats exactly. */
export function addressNear<T extends Pick<SavedAddress, "coordinates">>(
  list: T[],
  point: { lat: number; long: number }
): T | undefined {
  // Flat-earth metres: exact enough at this scale.
  const east = Math.cos((point.lat * Math.PI) / 180) * 111_320;
  return list.find(
    (a) =>
      Math.hypot(
        (a.coordinates.lat - point.lat) * 111_320,
        (a.coordinates.long - point.long) * east
      ) <= SAME_PLACE_METRES
  );
}

/**
 * Whether the Review offer's address can be saved against this list: there is
 * room, the place is not saved already, and a Home or Work is not taken.
 * "Already" is by distance, not by the exact point: an owner who saved "use
 * current location" on every listing collected an address every few metres.
 */
export function canSaveOffered(
  saved: Pick<SavedAddress, "id" | "address_type" | "coordinates">[],
  offered: Pick<AddressPayload, "address_type" | "coordinates">
): boolean {
  return (
    saved.length < MAX_ADDRESSES &&
    !addressNear(saved, offered.coordinates) &&
    (offered.address_type === "other" || !takenTypes(saved).has(offered.address_type))
  );
}

/**
 * Whether Review offers to save the pickup spot. Only once there is a flat
 * line: Profile will not save an address without one, and neither should this.
 */
export function showsSaveOffer(
  location: Pick<LocationValue, "lat" | "long" | "fullAddress"> | null,
  addresses: Pick<SavedAddress, "coordinates">[],
  addressesKnown: boolean
): boolean {
  return (
    location !== null &&
    addressesKnown &&
    addresses.length < MAX_ADDRESSES &&
    Boolean(location.fullAddress.trim()) &&
    !addressNear(addresses, location)
  );
}

/**
 * The flat/landmark text a listing's pickup takes when it moves to `picked`.
 * A saved address brings its own, and a map spot that lands exactly on a
 * saved address is that address. Any other spot keeps what the owner typed
 * for a one-off spot, and drops text written for a saved address, edited for
 * this listing or not: one address's flat number must not follow the pin.
 */
export function flatForPickedSpot(
  current: Pick<LocationValue, "lat" | "long" | "fullAddress"> | null | undefined,
  picked: { lat: number; long: number; saved?: SavedAddress },
  addresses: SavedAddress[]
): string {
  const saved = picked.saved ?? addressAtPoint(addresses, picked);
  if (saved) return flatAndLandmark(saved);
  if (!current || addressAtPoint(addresses, current)) return "";
  return fullAddressForNewPin(current.fullAddress, addresses);
}

/**
 * The address the Review screen's "Save this address" offer creates. Review
 * has one free-text field for flat, building and landmark, so all of it goes
 * into line 1, cut to the column's 255 characters.
 */
export function inlineOfferPayload(location: LocationValue, type: AddressType): AddressPayload {
  return {
    address: location.locality,
    address_line_1: location.fullAddress.trim().slice(0, 255),
    address_line_2: "",
    locality: location.locality,
    coordinates: { lat: location.lat, long: location.long },
    address_type: type,
  };
}

/**
 * Home and Work are one each per user. `exceptId` is the address being edited:
 * its own type is not "taken" from its point of view.
 */
export function takenTypes(
  list: Pick<SavedAddress, "id" | "address_type">[],
  exceptId?: number
): Set<"home" | "work"> {
  const taken = new Set<"home" | "work">();
  for (const a of list) {
    if (a.id !== exceptId && a.address_type !== "other") taken.add(a.address_type);
  }
  return taken;
}
