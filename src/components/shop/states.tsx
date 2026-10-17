import { EmptyState, Skeleton } from "@/components/core";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { BuildingStorefrontIcon, ExclamationTriangleIcon } from "react-native-heroicons/outline";

/** Placeholder blocks for an owner screen that is still loading its shop. */
export function ShopLoading({ label }: { label: string }) {
  return (
    <View
      style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, gap: space.md }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <Skeleton width="70%" height={32} borderRadius={radius.input} />
      <Skeleton width="100%" height={96} />
      <Skeleton width="100%" height={140} />
      <Skeleton width="100%" height={180} />
    </View>
  );
}

/**
 * An owner screen whose shop would not load. `403 not_owner` is not a fault: the
 * person has no listing yet, so there is no shop to set up.
 */
export function ShopLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { color } = useTheme();
  const navigation = useTypedNavigation();
  const notOwner = apiError(error)?.code === "not_owner";

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      {notOwner ? (
        <EmptyState
          icon={<BuildingStorefrontIcon size={28} color={color.brandText} />}
          title="Rental settings are for owners"
          body="List your first item and your hours, delivery and Open switch will be here."
          actionLabel="List an item"
          onAction={() => navigation.navigate("ListAddPhotos")}
        />
      ) : (
        <EmptyState
          variant="error"
          icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
          title="Couldn't load your settings"
          body="Check your connection and try again."
          actionLabel="Try again"
          onAction={onRetry}
        />
      )}
    </View>
  );
}
