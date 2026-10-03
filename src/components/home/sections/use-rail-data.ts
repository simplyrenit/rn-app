import { useGlobalContext } from "@/context/global-context";
import {
  DEFAULT_DISCOVERY_COORDINATES,
  getDiscoveryCoordinates,
} from "@/lib/location";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RailProduct } from "./product-rail";

interface Coordinates {
  lat: number;
  long: number;
}

/**
 * Shared fetch/refresh state for the home rails, and for the category
 * landing's "Near you" grid (ENG-77), which wants the same near-the-user
 * coordinates and the same loading/error/retry contract.
 *
 * The three sections used to carry three copies of this — one of which swallowed
 * its error entirely (`} catch (error) {}`), which is why "Popular near you" and
 * "Recently added" rendered as headings over nothing whenever the request failed.
 *
 * `key` names what the fetcher asks for when that can change under a mounted
 * screen — the landing's category slug. A new key reloads; the Home rails pass
 * none, so they still reload only on coordinates and auth.
 */
export function useRailData<T = RailProduct>(
  fetcher: (lat: number, long: number) => Promise<{ results: T[] }>,
  key?: string
) {
  const { isAuthenticated } = useGlobalContext();
  const [products, setProducts] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates>(
    DEFAULT_DISCOVERY_COORDINATES
  );

  useEffect(() => {
    void getDiscoveryCoordinates().then((location) => {
      if (location) setCoordinates(location);
    });
  }, []);

  // Only the latest request may write. The first one goes out on the default
  // coordinates and the next on the customer's, and with a key a request for the
  // previous category can still be in flight; whichever answered last used to
  // win, which could put the wrong place's or the wrong category's listings up.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    setError(false);
    try {
      const data = await fetcher(coordinates.lat, coordinates.long);
      if (request !== latestRequest.current) return;
      setProducts(data?.results ?? []);
    } catch (caught) {
      if (request !== latestRequest.current) return;
      setError(true);
      setProducts([]);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
    // `fetcher` is rebuilt on every render by the hook that supplies it, so it
    // is deliberately not a dependency; coordinates, the key and auth are what
    // matter.
  }, [coordinates.lat, coordinates.long, key]);

  useEffect(() => {
    void load();
  }, [load, isAuthenticated]);

  return { products, loading, error, reload: load };
}
