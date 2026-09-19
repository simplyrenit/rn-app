import useSaved from "@/backend/useSaved";
import { Card, ProductCardSkeleton, Text } from "@/components/core";
import { EmptyState } from "@/components/core/empty-state";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useRailClaim } from "./rail-dedupe";
import React from "react";
import { ScrollView, View } from "react-native";

// Measured off the Figma Home frame: 163pt cards (the photo is 176 tall, so the
// tile's 163:176 ratio holds) with a 16pt gap, under a heading that sits 24pt
// above them. Each section carries 16pt above and below, which is what makes
// 16pt after the category rail and 32pt between two rails.
const CARD_WIDTH = 163;
const GAP = 16;
const SECTION_PADDING = 16;
const HEADING_GAP = 24;

export interface RailProduct {
  name: string;
  title: string;
  location: string;
  rate: string;
  cover_image: string | null;
}

interface Props {
  /** Stable id used to claim products against the other rails. */
  railId: string;
  title: string;
  products: RailProduct[];
  loading: boolean;
  /** Non-null when the fetch failed. Drives the retry state. */
  error: boolean;
  onRetry: () => void;
  /** Shown when the request succeeded but there is nothing nearby. */
  emptyBody: string;
}

/**
 * One horizontal product rail, used by all three home sections.
 *
 * The behaviour that matters is the last three props. Each section previously
 * swallowed its fetch error and rendered no empty state, so a failed request and
 * an empty one both produced a bold heading over blank space — the app silently
 * promising content it could not deliver on its primary discovery surface.
 */
export function ProductRail({
  railId,
  title,
  products,
  loading,
  error,
  onRetry,
  emptyBody,
}: Props) {
  const { favorites } = useSaved();

  // Three rankings over one small catalogue return the same items, so without
  // this the home screen showed the identical pair of listings under three
  // different headings.
  const allowed = new Set(
    useRailClaim(
      railId,
      products.map((item) => item.name)
    )
  );
  const visible = products.filter((item) => allowed.has(item.name));

  if (!loading && !error && visible.length === 0) {
    // Nothing to show and nothing wrong: drop the section rather than leave a
    // heading stranded over an empty rail.
    return null;
  }

  return (
    <View style={{ paddingVertical: SECTION_PADDING }}>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          marginBottom: HEADING_GAP,
        }}
      >
        <Text accessibilityRole="header" fontSize="text-base" fontWeight="font-bold">
          {title}
        </Text>
      </View>

      {loading ? (
        <View
          style={{
            flexDirection: "row",
            gap: GAP,
            paddingHorizontal: SCREEN_GUTTER,
          }}
        >
          {[0, 1, 2].map((key) => (
            <ProductCardSkeleton key={key} width={CARD_WIDTH} />
          ))}
        </View>
      ) : error ? (
        <EmptyState
          compact
          variant="error"
          title="Couldn’t load this"
          body="Check your connection and try again."
          actionLabel="Retry"
          onAction={onRetry}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_GUTTER,
            gap: GAP,
          }}
        >
          {visible.map((item) => (
            <View key={item.name} style={{ width: CARD_WIDTH }}>
              <Card
                id={item.name}
                image={item.cover_image ?? null}
                title={item.title}
                location={item.location}
                price={item.rate}
                isFavorite={favorites.some((fav) => fav.name === item.name)}
                tile
              />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
