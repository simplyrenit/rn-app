import { useGlobalContext } from "@/context/global-context";
import {
  DEFAULT_DISCOVERY_COORDINATES,
  getDiscoveryCoordinates,
} from "@/lib/location";
import { useCallback, useEffect, useState } from "react";
import type { RailProduct } from "./product-rail";

interface Coordinates {
  lat: number;
  long: number;
}

/**
 * Shared fetch/refresh state for the home rails.
 *
 * The three sections used to carry three copies of this — one of which swallowed
 * its error entirely (`} catch (error) {}`), which is why "Popular near you" and
 * "Recently added" rendered as headings over nothing whenever the request failed.
 */
export function useRailData(
  fetcher: (lat: number, long: number) => Promise<{ results: RailProduct[] }>
) {
  const { isAuthenticated } = useGlobalContext();
  const [products, setProducts] = useState<RailProduct[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetcher(coordinates.lat, coordinates.long);
      setProducts(data?.results ?? []);
    } catch (caught) {
      setError(true);
      setProducts([]);
    } finally {
      setLoading(false);
    }
    // `fetcher` is rebuilt on every render by the hook that supplies it, so it
    // is deliberately not a dependency; coordinates and auth are what matter.
  }, [coordinates.lat, coordinates.long]);

  useEffect(() => {
    void load();
  }, [load, isAuthenticated]);

  return { products, loading, error, reload: load };
}
