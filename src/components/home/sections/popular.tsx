import useHome from "@/backend/useHome";
import React from "react";
import { ProductRail } from "./product-rail";
import { useRailData } from "./use-rail-data";

export function Popular() {
  const { fetchPopularProductsNearYou } = useHome();
  const { products, loading, error, reload } = useRailData(
    fetchPopularProductsNearYou
  );

  return (
    <ProductRail
      railId="popular"
      title="Popular near you"
      products={products}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyBody="Nothing popular nearby just yet."
    />
  );
}
