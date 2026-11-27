import useSaved from "@/backend/useSaved";
import { Card, ProductCardSkeleton, SectionHeader } from "@/components/core";
import { EmptyState } from "@/components/core/empty-state";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useRailClaim } from "./rail-dedupe";
import React from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import type { Plan } from "@/lib/plans";

// The 2.1 Home frame (2083:15120 "Rail · …"): each rail is 32 above its
// heading, 12 from the heading to the cards, and the 248-high kit Listing cards
// 162 wide and 16 apart, with nothing below (the next rail's 32 is the gap).
//
// The rail starts at the left gutter and runs off the right edge: on the 390pt
// frame that is gutter + card + gap + card + gap, with a 10pt sliver of the
// third card showing. A fixed 162 cut the second card off at 360dp and showed
// a third of the next card at 440pt, so the width is derived from the window
// the same way: 162 at 390, 147 at 360, 187 at 440.
const GAP = 16;
const PEEK = 10;
const SECTION_TOP = 32;
const HEADING_GAP = 12;

export interface RailProduct {
  name: string;
  title: string;
  location: string;
  rate: string;
  /** ENG-281: the card shows the smallest plan. Absent from an older server. */
  plans?: Plan[];
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
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.floor((windowWidth - SCREEN_GUTTER - 2 * GAP - PEEK) / 2);

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
    <View style={{ paddingTop: SECTION_TOP }}>
      <View style={{ marginBottom: HEADING_GAP }}>
        <SectionHeader title={title} flush />
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
            <ProductCardSkeleton key={key} width={cardWidth} />
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
            <View key={item.name} style={{ width: cardWidth }}>
              <Card
                id={item.name}
                image={item.cover_image ?? null}
                title={item.title}
                location={item.location}
                price={item.rate}
                plans={item.plans}
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
