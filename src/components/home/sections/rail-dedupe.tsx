import React, { createContext, useCallback, useContext, useMemo, useRef } from "react";

/**
 * Stops the home screen showing the same listing three times.
 *
 * "Top experiences", "Popular near you" and "Recently added" are three
 * different rankings over one catalogue, so with a small catalogue they return
 * the same items in a shuffled order. To a customer that does not read as three
 * rankings — it reads as a broken app showing one thing three times.
 *
 * Rails claim their products in render order. A rail only draws what no earlier
 * rail has already drawn, and a rail left with nothing draws nothing at all
 * rather than stranding a heading over empty space.
 */

interface RailDedupe {
  claim: (railId: string, names: string[]) => string[];
}

const Context = createContext<RailDedupe | null>(null);

export function RailDedupeProvider({ children }: { children: React.ReactNode }) {
  // Which rail claimed each product. Keyed by product so a re-render of the
  // same rail keeps its own items instead of surrendering them to a later one.
  const owner = useRef(new Map<string, string>());

  const claim = useCallback((railId: string, names: string[]) => {
    return names.filter((name) => {
      const current = owner.current.get(name);
      if (current === undefined) {
        owner.current.set(name, railId);
        return true;
      }
      return current === railId;
    });
  }, []);

  const value = useMemo(() => ({ claim }), [claim]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Returns the subset of `names` this rail is allowed to draw. */
export function useRailClaim(railId: string, names: string[]): string[] {
  const context = useContext(Context);
  if (!context) return names;
  return context.claim(railId, names);
}
