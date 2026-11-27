import { Text } from "@/components/core";
import { FieldShell } from "@/components/core/field";
import { usePressFeedback } from "@/components/core/use-press-feedback";
import { CategoryIcon, categoryDisplayName } from "@/lib/category-icons";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, density, fontFamily, space } from "@/lib/design-tokens";
import { indexTaxonomy, searchIndex } from "@/lib/taxonomy-search";
import { useTheme } from "@/lib/theme";
import { Subcategory } from "@/lib/types";
import { Image } from "expo-image";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ChevronLeftIcon, MagnifyingGlassIcon } from "react-native-heroicons/outline";
// The frames draw the row's chevron at the mini weight (20pt box, a 6×10pt
// glyph); the outline one this used draws half as tall again.
import { ChevronRightIcon, XCircleIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";
import { BottomSheetFlatList, BottomSheetTextInput } from "@gorhom/bottom-sheet";

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
 * Row geometry follows the 2.1 kit List row (56pt, a 24pt glyph, 12 to the
 * label) rather than the spacing scale; every category picker renders from here — the
 * listing flow's sheet, the edit flow, the request form and the search filter
 * sheet — so it is one edit if the design changes.
 *
 * The parent level can also search every sub-category at once (ENG-29): v2 has
 * well over a hundred of them under 16 parents, too many to find by drilling
 * in and guessing.
 */

/**
 * What a row needs. `Category` carries `subcategories` on top of this and
 * `Subcategory` does not; nothing drawn here depends on the difference, so both
 * satisfy it.
 */
export interface TaxonomyItem {
  title: string;
  slug?: string;
  dark_icon: string | null;
  light_icon: string | null;
  subcategories?: Subcategory[];
}

/**
 * A search result's identity, and what `busyTitle` names while it saves. The
 * child title alone is not unique: every v2 parent has an "Other".
 */
export function taxonomyPathKey(parentTitle: string, childTitle: string) {
  return `${parentTitle} › ${childTitle}`;
}

/**
 * Row geometry: the 2.1 kit List row numbers (2073:14364), as the category
 * sheet draws them (2096:24835, 2096:25059): a 56pt row (16 above and below a
 * 24pt line) on the 24pt gutter, a 24pt glyph, 12 to a 16/24 label, and a 24pt
 * mini chevron right-aligned to the gutter. The row is not rebuilt on `ListRow`:
 * it keeps a busy spinner, a disabled state, the API's own artwork and the
 * search result's "child, in parent" label, which `ListRow` has no room for.
 */
const ICON = 24;
/** Space between the glyph and its label. */
const ICON_GAP = 12;
/** The search field's magnifier and clear glyphs (2096:24835: 20pt). */
const FIELD_ICON = 20;
/**
 * The branch link above a child list (2096:25059 "Back to parents"): a 20pt
 * back chevron, 8, then the parent's name in 14/20 SemiBold, 12 above and 4
 * below, so the row is 36 high, then 8 to the list. No hairline.
 */
const CONTEXT_ICON = 20;
const CONTEXT_GAP = 8;
const CONTEXT_PAD = { paddingTop: 12, paddingBottom: 4 } as const;
const CONTEXT_TO_LIST = 8;
/** Search field to the list under it (2096:24835: 12). */
const SEARCH_TO_LIST = 12;

interface RowProps<T extends TaxonomyItem> {
  item: T;
  onSelect: (item: T) => void;
  /** This row's selection is in flight. */
  busy: boolean;
  /** Some row's selection is in flight, so no row may be tapped. */
  disabled: boolean;
  preferRemoteIcon: boolean;
  /** Set for a search result, which reads "Parent › Child" by the parent's glyph. */
  parent?: TaxonomyItem;
  /** No leading glyph: the label starts on the gutter. */
  hideIcon?: boolean;
}

function TaxonomyRow<T extends TaxonomyItem>({
  item,
  onSelect,
  busy,
  disabled,
  preferRemoteIcon,
  parent,
  hideIcon = false,
}: RowProps<T>) {
  const { color, isDark } = useTheme();
  const feedback = usePressFeedback({ disabled });

  const remoteIcon = preferRemoteIcon
    ? isDark
      ? item.dark_icon
      : item.light_icon
    : null;
  const isSvg = remoteIcon?.slice(-3).toLowerCase() === "svg";
  const name = categoryDisplayName(item.title, item.slug);
  const parentName = parent ? categoryDisplayName(parent.title, parent.slug) : null;

  return (
    <TouchableOpacity
      style={[
        {
          minHeight: density.row,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: ICON_GAP,
        },
        feedback.pressStyle,
      ]}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      // The dip comes from the shared press treatment; TouchableOpacity's own
      // fade would double it.
      activeOpacity={1}
      disabled={disabled}
      accessibilityRole="button"
      // "›" is read out literally; say where the result lives instead.
      accessibilityLabel={parentName ? `${name}, in ${parentName}` : undefined}
      accessibilityState={{ disabled, busy }}
      onPress={() => onSelect(item)}
    >
      {hideIcon ? null : (
        // A fixed box, so a wide glyph (the car) and a narrow one (the phone)
        // start their labels on the same pixel, as the frames do.
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
            <CategoryIcon
              name={(parent ?? item).title}
              slug={(parent ?? item).slug}
              size={ICON}
              color={color.text}
            />
          )}
        </View>
      )}
      <Text fontSize="text-md" lineHeight={24} style={{ flex: 1 }}>
        {parentName ? `${parentName} › ${name}` : name}
      </Text>

      {/* The spinner sits in the chevron's box, so the label does not move when it appears. */}
      <View style={{ width: ICON, alignItems: "center" }}>
        {busy ? (
          <ActivityIndicator size="small" color={color.brandText} />
        ) : (
          <ChevronRightIcon size={ICON} color={color.text} />
        )}
      </View>
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
  /**
   * Set at the parent level to show the search field. Choosing a result must
   * select what drilling into `parent` and choosing `child` selects — and never
   * deselect, since a result row shows no current-selection mark; while it
   * saves, `busyTitle` is `taxonomyPathKey(parent.title, child.title)`.
   */
  onSearchSelect?: (parent: T, child: Subcategory) => void;
  /** Draw the rows without their glyph: a child list, whose parent's glyph would only repeat (REVIEW b1-01). */
  hideIcon?: boolean;
}

export function TaxonomyList<T extends TaxonomyItem>({
  items,
  onSelect,
  contextLabel,
  onContextPress,
  busyTitle = null,
  preferRemoteIcon = true,
  inBottomSheet = false,
  onSearchSelect,
  hideIcon = false,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  // Same props either way; only the scrollable differs. On iOS a plain
  // TextInput in a sheet does not lift the sheet over the keyboard; the sheet's
  // own one does. Android already resizes the window for the keyboard
  // (adjustResize), so the sheet's input made room twice: the results shrank to
  // a sliver behind the footer, and the sheet stayed raised after the keyboard
  // closed. The plain one behaves there, as the Price tab's inputs show.
  const List = (inBottomSheet ? BottomSheetFlatList : FlatList) as typeof FlatList;
  const SearchInput = (
    inBottomSheet && Platform.OS === "ios" ? BottomSheetTextInput : TextInput
  ) as typeof TextInput;

  // Keyed on whether search is on, not on the callback: callers pass an inline
  // arrow, and the index should only rebuild when the tree does.
  const searchable = Boolean(onSearchSelect);
  const index = useMemo(
    () => (searchable ? indexTaxonomy<Subcategory, T>(items ?? [], categoryDisplayName) : []),
    [searchable, items]
  );
  const searching = searchable && query.trim() !== "";
  const results = useMemo(
    () => (searching ? searchIndex(index, query) : []),
    [searching, index, query]
  );

  const contextRow = contextLabel ? (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: CONTEXT_GAP,
        ...CONTEXT_PAD,
        marginBottom: CONTEXT_TO_LIST,
        paddingHorizontal: SCREEN_GUTTER,
      }}
    >
      {onContextPress ? (
        <ChevronLeftIcon size={CONTEXT_ICON} color={color.text} strokeWidth={1.5} />
      ) : null}
      <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} numberOfLines={1}>
        {contextLabel}
      </Text>
    </View>
  ) : null;

  const searchField = onSearchSelect ? (
    <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SEARCH_TO_LIST }}>
      <FieldShell focused={searchFocused}>
        <MagnifyingGlassIcon size={FIELD_ICON} color={color.textBody} strokeWidth={1.5} />
        <SearchInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search all categories"
          placeholderTextColor={color.placeholder}
          accessibilityLabel="Search all categories"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={{ flex: 1, fontSize: 16, fontFamily: fontFamily.regular, color: color.text }}
        />
        {/* Ours, not `clearButtonMode`: that one is iOS-only, and on Android
            the only way back to the parent list was backspacing the query. */}
        {query ? (
          <TouchableOpacity
            onPress={() => setQuery("")}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            // A 20pt glyph; the slop brings the target to the 44pt minimum.
            hitSlop={(MIN_TOUCH_TARGET - FIELD_ICON) / 2}
          >
            <XCircleIcon size={FIELD_ICON} color={color.textBody} />
          </TouchableOpacity>
        ) : null}
      </FieldShell>
    </View>
  ) : null;

  const listStyle = {
    paddingHorizontal: SCREEN_GUTTER,
    // Clear the floating bottom tab bar so the last row is fully visible
    // and scrollable. iOS only: Android's tab bar does not overlap the
    // list.
    paddingBottom: insets.bottom,
  };

  if (searching) {
    return (
      <>
        {searchField}
        <List
          data={results}
          renderItem={({ item: { parent, child } }) => {
            const key = taxonomyPathKey(parent.title, child.title);
            return (
              <TaxonomyRow
                item={child}
                parent={parent}
                onSelect={() => onSearchSelect?.(parent, child)}
                busy={busyTitle === key}
                disabled={busyTitle !== null}
                preferRemoteIcon={false}
              />
            );
          }}
          keyExtractor={({ parent, child }) => taxonomyPathKey(parent.title, child.title)}
          ListEmptyComponent={
            <Text tone="body" style={{ paddingVertical: space.md }} accessibilityLiveRegion="polite">
              No category matches “{query.trim()}”.
            </Text>
          }
          // A tap on a result must land while the keyboard is still up.
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={listStyle}
          showsVerticalScrollIndicator={false}
        />
      </>
    );
  }

  return (
    <>
      {searchField}
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
            hideIcon={hideIcon}
          />
        )}
        keyExtractor={(item) => item.title}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={listStyle}
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}
