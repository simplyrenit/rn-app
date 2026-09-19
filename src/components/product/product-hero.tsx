import { FavouriteButton, IconButton } from "@/components/core";
import { ProductImage } from "@/components/product/product-image";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The hero's own vertical inset, and the gap between each of its three rows —
 * the frame uses one number for both (Figma 1:9120).
 */
const HERO_INSET = 16;
/** Controls row, 44pt — the design's circle is exactly the touch-target floor. */
const HERO_CONTROL = MIN_TOUCH_TARGET;
/** The photo's box. The frame's book is 270 tall; a listing photo is fitted into it. */
const HERO_IMAGE_HEIGHT = 270;
const INDICATOR_TRACK = 132;
const INDICATOR_HEIGHT = 4;
/**
 * 16 + 44 + 16 + 270 + 16 + 4 + 16 = 382, measured below the status bar. The
 * height is stated rather than summed so `space-between` reproduces the frame's
 * gaps even when a single-photo listing leaves the indicator slot empty.
 */
const HERO_HEIGHT = 382;

interface Props {
  images?: string[];
  coverImage?: string | null;
  /** Product name — this API's identifier for a listing. */
  productId: string;
  title?: string;
  isFavorite?: boolean;
}

/**
 * The product detail hero: back and favourite on the canvas, the whole photo
 * contained below them, and a segmented page indicator under that.
 *
 * It replaces a full-bleed square photograph that ran under the status bar with
 * its controls floating on a scrim. That treatment was deliberate, but it is
 * not what the design draws: the frame shows the product cut out on white with
 * nothing overlapping it, which is the layout a marketplace of single objects
 * actually wants — you see the whole thing, not a centre crop of it.
 */
export function ProductHero({
  images,
  coverImage,
  productId,
  title,
  isFavorite,
}: Props) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useTypedNavigation();
  const { width } = useWindowDimensions();
  const [gallery, setGallery] = useState({ index: 0, count: 0 });

  const contentWidth = width - SCREEN_GUTTER * 2;

  /**
   * Both controls: a 44pt disc of canvas inside a hairline. The centring
   * matters for the favourite, which wraps a control that is itself 44pt and
   * would otherwise start inside the border and hang off the far edge.
   */
  const circle = {
    width: HERO_CONTROL,
    height: HERO_CONTROL,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.controlLine,
    backgroundColor: color.controlFill,
    alignItems: "center",
    justifyContent: "center",
  } as const;

  return (
    <View
      style={{
        height: insets.top + HERO_HEIGHT,
        paddingTop: insets.top + HERO_INSET,
        paddingBottom: HERO_INSET,
        paddingHorizontal: SCREEN_GUTTER,
        alignItems: "center",
        justifyContent: "space-between",
        // The surface step, not the canvas: the dark frame lifts the hero one shade
        // above the page beneath it, and in light the two are the same white.
        backgroundColor: color.surface,
      }}
    >
      <View
        style={{
          width: "100%",
          height: HERO_CONTROL,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* The design draws heroicons' *mini* arrow — a filled 20pt glyph, not
            the outline `BackButton` uses on pushed screens — so this composes
            `IconButton` directly. It keeps the two things `BackButton` exists
            to guarantee: a 44pt target and a required label. */}
        <IconButton
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityHint="Returns to the previous screen"
          style={circle}
        >
          <ArrowLeftIcon size={20} color={color.text} />
        </IconButton>

        {/* `onPhoto` off: the heart now sits on the canvas, so it takes the
            theme's own ink rather than the white-on-scrim treatment. */}
        <View style={circle}>
          <FavouriteButton
            id={productId}
            isFavorite={Boolean(isFavorite)}
            onPhoto={false}
            ink
            title={title}
          />
        </View>
      </View>

      <ProductImage
        images={images}
        coverImage={coverImage}
        name={productId}
        contained
        frameWidth={contentWidth}
        frameHeight={HERO_IMAGE_HEIGHT}
        onGalleryStateChange={setGallery}
      />

      {/* The slot is always reserved, so the hero is 382 tall whether or not
          there is more than one photo to page through. */}
      <View style={{ height: INDICATOR_HEIGHT, justifyContent: "center" }}>
        {gallery.count > 1 ? (
          <PhotoIndicator index={gallery.index} count={gallery.count} />
        ) : null}
      </View>
    </View>
  );
}

/**
 * One track divided by the number of photos, with the segment for the current
 * page filled — the design's indicator, and a more honest one than a row of
 * dots once a listing has a dozen pictures.
 */
function PhotoIndicator({ index, count }: { index: number; count: number }) {
  const { color } = useTheme();
  const thumbWidth = INDICATOR_TRACK / count;

  return (
    <View
      // Position is already announced by each slide ("Photo 2 of 4"), so this
      // stays decoration rather than a second thing to swipe past.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: INDICATOR_TRACK,
        height: INDICATOR_HEIGHT,
        borderRadius: radius.full,
        backgroundColor: color.line,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: thumbWidth,
          height: "100%",
          borderRadius: radius.full,
          backgroundColor: color.brand,
          // Clamped: a photo that fails to load shrinks the gallery while the carousel
          // can still be parked on it, which would slide the thumb off the track.
          transform: [{ translateX: thumbWidth * Math.min(index, count - 1) }],
        }}
      />
    </View>
  );
}
