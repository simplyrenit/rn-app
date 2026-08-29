import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { Text } from "../core";

/**
 * A search field, not a centred button pretending to be one.
 *
 * The placeholder is left-aligned beside the magnifier the way a real field
 * reads. "Search on [Renit logo] Renit" said the brand name twice, broke the
 * text baseline with a glyph, and sat centred inside an 80% column against a
 * 10% spacer — so it was not even optically centred.
 */
export function SearchBar() {
  const { color, shadow } = useTheme();
  const router = useTypedNavigation();

  return (
    <TouchableOpacity
      accessibilityRole="search"
      accessibilityLabel="Search Renit"
      accessibilityHint="Opens search for items, location and dates"
      activeOpacity={0.8}
      onPress={() => router.navigate("Search")}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height: MIN_TOUCH_TARGET,
          marginHorizontal: SCREEN_GUTTER,
          paddingHorizontal: 14,
          borderRadius: radius.input,
          backgroundColor: color.surface,
          // A border on all four sides. The light theme declared only top, left
          // and right, so it rendered as a three-sided box.
          borderWidth: 1,
          borderColor: color.inputLine,
        },
        shadow,
      ]}
    >
      <MagnifyingGlassIcon size={20} color={color.textBody} strokeWidth={2} />
      <Text fontSize="text-md" style={{ color: color.placeholder }}>
        Search for anything to rent
      </Text>
    </TouchableOpacity>
  );
}
