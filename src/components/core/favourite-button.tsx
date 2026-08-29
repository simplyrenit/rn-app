import useSaved from "@/backend/useSaved";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, darkColors } from "@/lib/design-tokens";
import { tapFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { HeartIcon as HeartOutline } from "react-native-heroicons/outline";
import { HeartIcon as HeartSolid } from "react-native-heroicons/solid";
import { IconButton } from "./icon-button";

const GLYPH_SIZE = 18;

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

  // Over a photo the chip behind the glyph is always dark, so the heart takes
  // the dark-theme values in both app themes; off a photo it follows the theme.
  const activeColor = onPhoto ? darkColors.danger : color.danger;
  const inactiveColor = onPhoto ? "#FFFFFF" : color.textBody;

  return (
    <IconButton
      onPress={handlePress}
      haptic={false}
      // The chip is the visible size; IconButton makes the 44pt hit area up in
      // hitSlop, so a small chip is still a full target.
      size={onPhoto ? photoSize : MIN_TOUCH_TARGET}
      scrim={onPhoto}
      accessibilityLabel={
        active
          ? `Remove ${title ?? "this item"} from saved`
          : `Save ${title ?? "this item"}`
      }
      accessibilityHint="Adds or removes this listing from your Saved tab"
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Glyph
          size={GLYPH_SIZE}
          color={active ? activeColor : inactiveColor}
          strokeWidth={active ? 0 : 2}
        />
      </Animated.View>
    </IconButton>
  );
}
