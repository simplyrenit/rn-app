import { Text } from "@/components/core";
import { usePressFeedback } from "@/components/core/use-press-feedback";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER, density, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

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
 * Row geometry (`py-4`, `space-x-5`) is carried over verbatim rather than
 * re-derived from the spacing scale: the Post tab draws the parent half of this
 * same taxonomy and is owned elsewhere, so the two halves have to keep matching
 * until it adopts this component too.
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

/** Remote category artwork, as the API sizes it. */
const REMOTE_ICON = 20;
/** The bundled glyph, optically matched to the remote artwork above. */
const GLYPH = 22;

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
      <View className="flex-row items-center space-x-5">
        {remoteIcon ? (
          isSvg ? (
            <SvgUri width={REMOTE_ICON} height={REMOTE_ICON} uri={remoteIcon} />
          ) : (
            <Image
              source={{ uri: remoteIcon }}
              style={{ width: REMOTE_ICON, height: REMOTE_ICON }}
            />
          )
        ) : (
          <CategoryIcon name={item.title} size={GLYPH} color={color.textBody} />
        )}
        <Text fontSize="text-base">{categoryDisplayName(item.title)}</Text>
      </View>

      {busy ? (
        <ActivityIndicator size="small" color={color.brandText} />
      ) : (
        <ChevronRightIcon size={REMOTE_ICON} color={color.text} />
      )}
    </TouchableOpacity>
  );
}

interface Props<T extends TaxonomyItem> {
  items?: T[];
  onSelect: (item: T) => void;
  /**
   * The branch the customer is already inside, stated as context rather than as
   * a second, differently-shaped back control.
   */
  contextLabel?: string;
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
}

export function TaxonomyList<T extends TaxonomyItem>({
  items,
  onSelect,
  contextLabel,
  busyTitle = null,
  preferRemoteIcon = true,
}: Props<T>) {
  const insets = useSafeAreaInsets();

  return (
    <>
      {contextLabel ? (
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingBottom: space.md,
          }}
        >
          <Text fontSize="text-sm" tone="body">
            {contextLabel}
          </Text>
        </View>
      ) : null}

      <FlatList
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
