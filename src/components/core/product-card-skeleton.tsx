import { radius } from "@/lib/design-tokens";
import React from "react";
import { View } from "react-native";
import Skeleton from "./skeleton";

/**
 * Placeholder for a product tile. It mirrors Card's own aspect ratio and text
 * rhythm rather than guessing a fixed height, so the layout does not shift when
 * the real content arrives.
 */
export function ProductCardSkeleton({ width }: { width?: number | string }) {
  return (
    <View style={{ width: (width as any) ?? "100%", gap: 8 }}>
      <View style={{ width: "100%", aspectRatio: 41.5 / 44.5 }}>
        <Skeleton width="100%" height="100%" borderRadius={radius.card} />
      </View>
      <View style={{ gap: 6 }}>
        <Skeleton width="85%" height={14} borderRadius={4} />
        <Skeleton width="55%" height={12} borderRadius={4} />
        <Skeleton width="40%" height={14} borderRadius={4} />
      </View>
    </View>
  );
}
