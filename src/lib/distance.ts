import {
  DiscoveryCoordinates,
  getDiscoveryCoordinates,
} from "@/lib/location";
import { useEffect, useState } from "react";

/**
 * "How far away is it?" is the first question in peer-to-peer rental, and the
 * app never answered it: the location section was a city-scale map with a bare
 * dot, product cards carried no location at all, and a whole home rail was
 * headed "Popular near you" without ever saying how near.
 */

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm(
  from: { lat: number; long: number },
  to: { lat: number; long: number }
): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.long - from.long);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Beyond this, saying how far away something is tells the customer nothing
 * useful — you are not going to collect a drill 13,000 km away, and printing
 * the number makes the app look broken rather than informative. Better to say
 * nothing than to say something absurd.
 */
const MAX_USEFUL_KM = 300;

/**
 * Distance as a person would say it. Precision is deliberately coarse — a
 * listing's coordinates are approximate and "2.4 km" implies an accuracy the
 * data does not have.
 */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || !Number.isFinite(km)) return null;
  if (km > MAX_USEFUL_KM) return null;
  if (km < 1) return "Under 1 km away";
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

const isUsable = (c?: { lat?: number; long?: number } | null) =>
  Boolean(c && Number.isFinite(c.lat) && Number.isFinite(c.long) && (c.lat || c.long));

/**
 * The viewer's discovery coordinates, resolved once. Returns null while it is
 * still resolving or when location is unavailable, so callers render nothing
 * rather than a wrong number.
 */
export function useViewerCoordinates(): DiscoveryCoordinates | null {
  const [coords, setCoords] = useState<DiscoveryCoordinates | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getDiscoveryCoordinates().then((value) => {
      if (!cancelled && isUsable(value)) setCoords(value as DiscoveryCoordinates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return coords;
}

/** Formatted distance from the viewer to a target, or null if not knowable. */
export function useDistanceTo(
  target?: { lat?: number; long?: number } | null
): string | null {
  const viewer = useViewerCoordinates();
  if (!viewer || !isUsable(target)) return null;
  return formatDistance(
    distanceKm(viewer, { lat: target!.lat!, long: target!.long! })
  );
}
