import { LightIcon } from "@/icons/logo";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { Text } from "../core";

// Measured off the Figma topbar: a 48pt box (12 + 24 + 12) with a 12pt radius,
// which is one point off `radius.input` — the design draws this field a little
// rounder than a form input, so it keeps its own number.
const SEARCH_HEIGHT = 48;
const SEARCH_RADIUS = 12;

// The mark is drawn in a 20pt slot, as in the design. The glyph fills only the
// middle of its 256 viewBox, so the SVG is rendered a little larger than the slot
// and centred in it: at 32 the glyph is ~20pt tall, filling the design's slot. The
// extra stroke weight matches the bolder purple mark in the onboarding art, where
// the plain outline would read as a hairline at this size.
const LOGO_SLOT = 20;
const LOGO_RENDER_SIZE = 32;
const LOGO_THICKEN = 4;

/**
 * The Renit mark. The Figma file draws a purple ring here in every frame — a
 * broken placeholder for the logo component, not the brand mark — so the app's
 * own logo is used instead, in the brand purple the onboarding art draws it in.
 */
function Mark() {
  const { color } = useTheme();
  // `LightIcon` and `DarkIcon` are the same art with different default colours;
  // the colour is passed explicitly, so one component serves both themes.
  return (
    <View
      style={{
        width: LOGO_SLOT,
        height: LOGO_SLOT,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LightIcon
        size={LOGO_RENDER_SIZE}
        color={color.brand}
        thicken={LOGO_THICKEN}
      />
    </View>
  );
}

/**
 * The home search field.
 *
 * Restored to the design's "Search on [logo] Renit", centred, with the
 * magnifier in its own 44pt box at the leading edge. An earlier pass swapped
 * this for a left-aligned "Search for anything to rent" because the brand name
 * read twice; the design is the source of truth here, so the lockup is back.
 */
export function SearchBar() {
  const { color, fieldShadow } = useTheme();
  const router = useTypedNavigation();

  return (
    <TouchableOpacity
      accessibilityRole="search"
      accessibilityLabel="Search Renit"
      accessibilityHint="Opens search for items, location and dates"
      activeOpacity={0.8}
      onPress={() => router.navigate("Search")}
      style={{
        height: SEARCH_HEIGHT,
        marginHorizontal: SCREEN_GUTTER,
        paddingHorizontal: 4,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: SEARCH_RADIUS,
        backgroundColor: color.surface,
        // All four sides. The design uses the hairline tone here, not the
        // stronger control-edge tone, in both themes.
        borderWidth: 1,
        borderColor: color.line,
        ...fieldShadow,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 1,
          top: 1,
          width: MIN_TOUCH_TARGET,
          height: MIN_TOUCH_TARGET,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MagnifyingGlassIcon size={24} color={color.textBody} strokeWidth={2} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <Text fontSize="text-md" tone="body">
          Search on
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2.67 }}>
          <Mark />
          <Text fontSize="text-sm">Renit</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
