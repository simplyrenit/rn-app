import useHome from "@/backend/useHome";
import React from "react";
import { ProductRail } from "./product-rail";
import { useRailData } from "./use-rail-data";

export function RecentlyAdded() {
  const { fetchTopPicks } = useHome();
  const { products, loading, error, reload } = useRailData(fetchTopPicks);

  return (
    <ProductRail
      railId="recent"
      title="Recently added"
      products={products}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyBody="New listings will show up here."
    />
  );
}
