import type { LocationValue } from "@/lib/list-flow/types";

export type AddressType = "home" | "work" | "other";

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

/** The one-line address a list row shows. */
export function addressLine(
  a: Pick<SavedAddress, "address_line_1" | "address_line_2" | "locality">
): string {
  return [a.address_line_1, a.address_line_2, a.locality].filter(Boolean).join(", ");
}

/** A saved address as the listing draft holds a pickup location. */
export function toLocationValue(a: SavedAddress): LocationValue {
  return {
    locality: a.locality,
    fullAddress: [a.address_line_1, a.address_line_2].filter(Boolean).join(", "),
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
  const fromSaved = saved.some(
    (a) => [a.address_line_1, a.address_line_2].filter(Boolean).join(", ") === current
  );
  return fromSaved ? "" : current;
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
