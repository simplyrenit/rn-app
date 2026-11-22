import useSaved from "@/backend/useSaved";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, darkColors } from "@/lib/design-tokens";
import { tapFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import { HeartIcon as HeartOutline } from "react-native-heroicons/outline";
import { HeartIcon as HeartSolid } from "react-native-heroicons/solid";
import { IconButton } from "./icon-button";

const GLYPH_SIZE = 18;
const TILE_GLYPH_SIZE = 24;
const INK_GLYPH_SIZE = 20;
const INK_STROKE = 1.5;

/**
 * The kit Listing card's heart backing (figma/00 2073:14326, review #32): a
 * 32pt disc of #FFFFFFEB with a 0/1 blur-3 shadow of #0000002E, inset 6 from
 * the photo's corner, under a black 1.5 outline heart. It sits on a photo, so
 * like `onPhoto` it is the same in both themes: white disc, black heart.
 */
const TILE_DISC_SIZE = 32;
const TILE_DISC_FILL = "rgba(255,255,255,0.92)";
const TILE_HEART_INK = "#000000";
const TILE_DISC_SHADOW = Platform.select({
  // Figma's blur 3 is about an iOS shadowRadius of 1.5, as in `fieldShadow`.
  ios: { shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 1.5, shadowOffset: { width: 0, height: 1 } },
  android: { elevation: 1 },
});

interface Props {
  /** Product name — this API's identifier for a listing. */
  id: string;
  isFavorite: boolean;
  /** Draw the translucent chip behind the glyph. On when it floats over a photo. */
  onPhoto?: boolean;
  title?: string;
  /**
   * Chip diameter when drawn over a photo. The hero's back button is 40pt and
   * its favourite was 30pt with a different edge treatment, so two adjacent
   * floating controls on the same image did not look like a pair.
   */
  photoSize?: number;
  /**
   * The kit Listing card's heart: a 44pt box in the photo's corner holding a
   * 32pt white disc and a 24pt black outline. Every product card uses it; the
   * PDP hero keeps the chip or `ink`.
   */
  tile?: boolean;
  /**
   * The Product Details hero's heart: an outline in the primary text colour at
   * the design's 20pt and 1.5 stroke, sitting in a bordered circle the caller
   * draws. Off a photo only; the saved state keeps its danger red.
   */
  ink?: boolean;
}

/**
 * The favourite heart.
 *
 * Both states are the same size and sit in the same place. The version this
 * replaces swapped a 21pt outline for a Lottie scaled 2.3×, so the control
 * visibly jumped and changed shape as you toggled it. Here the only thing that
 * changes is fill and colour, with a short spring for confirmation.
 *
 * The chip behind the glyph is not decoration: without it a white stroke over a
 * white product photo disappears, which is exactly how this control rendered in
 * search results.
 */
export function FavouriteButton({
  id,
  isFavorite,
  onPhoto = true,
  title,
  photoSize = 30,
  tile = false,
  ink = false,
}: Props) {
  const { isAuthenticated } = useGlobalContext();
  const { saveFavorite, deleteFavorite } = useSaved();
  const { color } = useTheme();

  // Mirrors the (already optimistic) query cache so the icon can spring the
  // instant it is tapped rather than after the mutation settles.
  const [pending, setPending] = useState<boolean | null>(null);
  const active = pending ?? isFavorite;

  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setPending(null);
  }, [isFavorite]);

  const bump = () => {
    scale.setValue(0.82);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 220,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    if (!isAuthenticated) {
      toast.info("Sign in to save this", {
        message: "Your saved items follow you across devices.",
        haptic: false,
      });
      return;
    }

    const next = !active;
    setPending(next);
    bump();
    tapFeedback();

    try {
      if (next) {
        await saveFavorite(id);
      } else {
        await deleteFavorite(id);
      }
    } catch (error) {
      // The cache rolls itself back in useSaved; say so rather than logging to
      // a console the customer will never see.
      setPending(null);
      toast.error(
        next ? "Couldn’t save that" : "Couldn’t remove that",
        { message: "Check your connection and try again." }
      );
    }
  };

  const Glyph = active ? HeartSolid : HeartOutline;

  // Over a photo the heart takes the dark-theme values in both app themes, as
  // the PDP's dark chip needs; off a photo it follows the theme. The card's
  // white disc keeps that saved red on purpose (review #32 changed only the
  // unsaved look), and its unsaved outline is black.
  const activeColor = onPhoto ? darkColors.danger : color.danger;
  const inactiveColor = tile ? TILE_HEART_INK : onPhoto ? color.onPhoto : ink ? color.text : color.textBody;

  const glyph = (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Glyph
        size={tile ? TILE_GLYPH_SIZE : ink ? INK_GLYPH_SIZE : GLYPH_SIZE}
        color={active ? activeColor : inactiveColor}
        strokeWidth={active ? 0 : tile || ink ? INK_STROKE : 2}
      />
    </Animated.View>
  );

  return (
    <IconButton
      onPress={handlePress}
      haptic={false}
      // The chip is the visible size; IconButton makes the 44pt hit area up in
      // hitSlop, so a small chip is still a full target.
      size={tile ? MIN_TOUCH_TARGET : onPhoto ? photoSize : MIN_TOUCH_TARGET}
      scrim={onPhoto && !tile}
      accessibilityLabel={
        active
          ? `Remove ${title ?? "this item"} from saved`
          : `Save ${title ?? "this item"}`
      }
      accessibilityHint="Adds or removes this listing from your Saved tab"
    >
      {tile ? (
        // The disc is a child, not IconButton's scrim: the hit area stays 44
        // while the visible backing is the kit's 32.
        <View
          style={[
            {
              width: TILE_DISC_SIZE,
              height: TILE_DISC_SIZE,
              borderRadius: TILE_DISC_SIZE / 2,
              backgroundColor: TILE_DISC_FILL,
              alignItems: "center",
              justifyContent: "center",
            },
            TILE_DISC_SHADOW,
          ]}
        >
          {glyph}
        </View>
      ) : (
        glyph
      )}
    </IconButton>
  );
}
