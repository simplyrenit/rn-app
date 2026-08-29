import useHome from "@/backend/useHome";
import React from "react";
import { ProductRail } from "./product-rail";
import { useRailData } from "./use-rail-data";

export function Experiences() {
  const { fetchTopExperiences } = useHome();
  const { products, loading, error, reload } = useRailData(fetchTopExperiences);

  return (
    <ProductRail
      railId="experiences"
      title="Top experiences"
      products={products}
      loading={loading}
      error={error}
      onRetry={reload}
      emptyBody="Nothing here yet in your area."
    />
  );
}
