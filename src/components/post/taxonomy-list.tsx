import { Text } from "@/components/core";
import { usePressFeedback } from "@/components/core/use-press-feedback";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER, density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronLeftIcon } from "react-native-heroicons/outline";
// The frames draw the row's chevron at the mini weight (20pt box, a 6×10pt
// glyph); the outline one this used draws half as tall again.
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";

/**
 * The taxonomy picker, in one place.
 *
 * Four screens drew this list — the Post tab, the listing flow's subcategory
 * step, and the two edit-flow twins — and they disagreed on every part of it:
 * one resolved a remote SVG and fell back to a glyph, one passed `uri: ""` to
 * an `<Image>` when the API had no icon (a 20×20 hole), one normalised the
 * display name and one printed the raw API string, and only two of them drew a
 * chevron on a row that pushes a screen.
 *
 * Row geometry follows the Figma frame (56pt minimum, an 8pt icon gap) rather
 * than the spacing scale; all four callers render from here, so it is one edit
 * if the design changes.
 */

/**
 * What a row needs. `Category` carries `subcategories` on top of this and
 * `Subcategory` does not; nothing drawn here depends on the difference, so both
 * satisfy it.
 */
export interface TaxonomyItem {
  title: string;
  dark_icon: string | null;
  light_icon: string | null;
}

/**
 * Row geometry, measured off the Figma frames `1:13231` (category) and
 * `1:13333` (sub-category): a 56pt row on the 24pt gutter, a 20pt glyph, 8pt
 * to a 16pt label, and a 20pt chevron right-aligned to the gutter. The glyph
 * was 22pt with 20pt of space after it, which put every label 12pt right of
 * the frame.
 */
const ICON = 20;
/** Space between the glyph and its label. */
const ICON_GAP = 8;
/** The branch row above the list: a 24pt back chevron, then a 14pt bold name. */
const CONTEXT_ICON = 24;
/**
 * 4, not the 8 the list rows use: the branch chevron is a 24pt glyph where a
 * row's is 20, and the frame lines the branch name up with the row labels
 * below it rather than with the glyph's own trailing edge.
 */
const CONTEXT_GAP = 4;
/**
 * The frames set every row in this list at 56pt — the list rows reach it as
 * `py-4` around a 24pt line, the branch row has to be told.
 */
const ROW_HEIGHT = 56;

interface RowProps<T extends TaxonomyItem> {
  item: T;
  onSelect: (item: T) => void;
  /** This row's selection is in flight. */
  busy: boolean;
  /** Some row's selection is in flight, so no row may be tapped. */
  disabled: boolean;
  preferRemoteIcon: boolean;
}

function TaxonomyRow<T extends TaxonomyItem>({
  item,
  onSelect,
  busy,
  disabled,
  preferRemoteIcon,
}: RowProps<T>) {
  const { color, isDark } = useTheme();
  const feedback = usePressFeedback({ disabled });

  const remoteIcon = preferRemoteIcon
    ? isDark
      ? item.dark_icon
      : item.light_icon
    : null;
  const isSvg = remoteIcon?.slice(-3).toLowerCase() === "svg";

  return (
    <TouchableOpacity
      className="flex-row justify-between items-center py-4"
      style={[{ minHeight: density.row }, feedback.pressStyle]}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      // The dip comes from the shared press treatment; TouchableOpacity's own
      // fade would double it.
      activeOpacity={1}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      onPress={() => onSelect(item)}
    >
      <View
        className="flex-row items-center"
        style={{ flex: 1, gap: ICON_GAP }}
      >
        {/* A fixed box, so a wide glyph (the car) and a narrow one (the phone)
            start their labels on the same pixel, as the frames do. */}
        <View style={{ width: ICON, alignItems: "center" }}>
          {remoteIcon ? (
            isSvg ? (
              <SvgUri width={ICON} height={ICON} uri={remoteIcon} />
            ) : (
              <Image
                source={{ uri: remoteIcon }}
                style={{ width: ICON, height: ICON }}
              />
            )
          ) : (
            <CategoryIcon name={item.title} size={ICON} color={color.textBody} />
          )}
        </View>
        {/* 16pt, not 18: the label measures 12pt cap on the frames, which is
            where the 56pt row height comes from (py-4 around a 24pt line). */}
        <Text fontSize="text-md" style={{ flex: 1 }}>
          {categoryDisplayName(item.title)}
        </Text>
      </View>

      {busy ? (
        <ActivityIndicator size="small" color={color.brandText} />
      ) : (
        <ChevronRightIcon size={ICON} color={color.text} />
      )}
    </TouchableOpacity>
  );
}

interface Props<T extends TaxonomyItem> {
  items?: T[];
  onSelect: (item: T) => void;
  /**
   * The branch the customer is already inside. The frame draws it as a 56pt
   * row above the list — a back chevron, the branch name in 14 bold, a
   * full-bleed hairline under it — so the label and the way out of the branch
   * are one control rather than two differently-shaped ones.
   */
  contextLabel?: string;
  /**
   * What the branch row's chevron does. Omit and the row draws as a static
   * label, which is what a caller with no branch to return to wants.
   */
  onContextPress?: () => void;
  /**
   * Title of the row whose selection is being saved. Shows a spinner on that
   * row and blocks the rest, so a slow PATCH cannot be fired twice.
   */
  busyTitle?: string | null;
  /**
   * Set false where the screen has deliberately chosen the bundled glyph over
   * the API's artwork.
   */
  preferRemoteIcon?: boolean;
  /**
   * Set when the list is inside a @gorhom bottom sheet. A plain FlatList there
   * loses its scroll to the sheet's own pan gesture on Android; the sheet's
   * scrollable hands the gesture over properly. Screens leave this off.
   */
  inBottomSheet?: boolean;
}

export function TaxonomyList<T extends TaxonomyItem>({
  items,
  onSelect,
  contextLabel,
  onContextPress,
  busyTitle = null,
  preferRemoteIcon = true,
  inBottomSheet = false,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();

  // Same props either way; only the scrollable differs.
  const List = (inBottomSheet ? BottomSheetFlatList : FlatList) as typeof FlatList;

  const contextRow = contextLabel ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: CONTEXT_GAP,
        minHeight: ROW_HEIGHT,
        paddingHorizontal: SCREEN_GUTTER,
        borderBottomWidth: 1,
        borderBottomColor: color.line,
      }}
    >
      {onContextPress ? (
        <ChevronLeftIcon size={CONTEXT_ICON} color={color.text} />
      ) : null}
      <Text fontSize="text-sm" fontWeight="font-bold" numberOfLines={1}>
        {contextLabel}
      </Text>
    </View>
  ) : null;

  return (
    <>
      {contextRow && onContextPress ? (
        <TouchableOpacity
          onPress={onContextPress}
          accessibilityRole="button"
          accessibilityLabel={`Back to ${contextLabel}`}
        >
          {contextRow}
        </TouchableOpacity>
      ) : (
        contextRow
      )}

      <List
        data={items}
        renderItem={({ item }) => (
          <TaxonomyRow
            item={item}
            onSelect={onSelect}
            busy={busyTitle === item.title}
            disabled={busyTitle !== null}
            preferRemoteIcon={preferRemoteIcon}
          />
        )}
        keyExtractor={(item) => item.title}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          // Clear the floating bottom tab bar so the last row is fully visible
          // and scrollable. iOS only: Android's tab bar does not overlap the
          // list.
          paddingBottom: insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}
