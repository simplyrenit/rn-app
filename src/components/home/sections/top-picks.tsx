import useHome from "@/backend/useHome";
import React from "react";
import { ProductRail } from "./product-rail";
import { useRailData } from "./use-rail-data";

export function TopPicks() {
  const { fetchTopPicks } = useHome();
  const { products, loading, error, reload } = useRailData(fetchTopPicks);

  return (
    <ProductRail
      railId="recent"
      title="Top picks to explore"
      products={products}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyBody="New listings will show up here."
    />
  );
}
