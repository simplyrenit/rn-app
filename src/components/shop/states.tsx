import { EmptyState, Skeleton } from "@/components/core";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";
import { AdjustmentsHorizontalIcon, ExclamationCircleIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** The kit Top bar every owner screen draws above this state. */
const TOP_BAR = 56;

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
  const insets = useSafeAreaInsets();
  const notOwner = apiError(error)?.code === "not_owner";

  // 2096:26578 / 26620 centre the Empty state on the whole screen (y 422 of 844), not on the space under the top
  // bar: the bottom padding matches the chrome above. Both draw the kit Primary action (no other filled button here)
  // and a black glyph on the lavender disc, the error one too (no pink `error` disc).
  return (
    <View style={{ flex: 1, justifyContent: "center", paddingBottom: insets.top + TOP_BAR }}>
      {notOwner ? (
        <EmptyState
          icon={<AdjustmentsHorizontalIcon size={32} color={color.text} />}
          title="Rental settings are for owners"
          body="List your first item and your hours, delivery and Open switch will be here."
          actionLabel="List an item"
          actionTone="primary"
          onAction={() => navigation.navigate("ListAddPhotos")}
        />
      ) : (
        <EmptyState
          icon={<ExclamationCircleIcon size={32} color={color.text} />}
          title="Couldn't load your settings"
          body="Check your connection and try again."
          actionLabel="Try again"
          actionTone="primary"
          onAction={onRetry}
        />
      )}
    </View>
  );
}
