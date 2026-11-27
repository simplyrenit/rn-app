import { SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { CategoryValue } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import { Category } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The sheet's height above the home indicator (2096:24835: 675 with its 21pt indicator strip). The device's own
 * inset is added, and the modal caps it under the status bar, so a 667pt phone does not overflow.
 */
const SHEET_HEIGHT = 654;
/** The note to the search field (parents) and to the back link (a child list), per 2096:24835 and 2096:25059. */
const NOTE_GAP_PARENTS = 12;
const NOTE_GAP_CHILDREN = 8;

/**
 * The Review screen's category picker (§8.4): parent, then child, on the same
 * `TaxonomyList` the edit flow and the old wizard use, so the rows, icons and
 * display names match everywhere else a category is chosen.
 */
export const CategorySheet = forwardRef<
  BottomSheetModal,
  {
    categories: Category[];
    onSelect: (value: CategoryValue) => void;
    /** A line under the title: what choosing will cost, when it costs something. */
    note?: string | null;
    /** Open on this parent's child list rather than the parents. Reset on dismiss, as a picked parent is. */
    initialParent?: Category | null;
  }
>(({ categories, onSelect, note, initialParent = null }, ref) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [parent, setParent] = useState<Category | null>(initialParent);
  // The categories may arrive after the sheet mounts, so the parent follows the prop rather than only seeding it.
  useEffect(() => {
    if (initialParent) setParent(initialParent);
  }, [initialParent]);

  return (
    <CustomBottomSheetModal
      ref={ref}
      isDark={isDark}
      snapPoints={[SHEET_HEIGHT + insets.bottom]}
      frame
      scrollView={false}
      onDismiss={() => setParent(null)}
    >
      <View style={{ flex: 1 }}>
        <SheetHeader title="Choose a category" grabber={false} />
        {note ? (
          <Text
            fontSize="text-sm"
            lineHeight={20}
            tone="body"
            style={{
              paddingHorizontal: SCREEN_GUTTER,
              marginBottom: parent ? NOTE_GAP_CHILDREN : NOTE_GAP_PARENTS,
            }}
          >
            {note}
          </Text>
        ) : null}
        {parent ? (
          <TaxonomyList
            inBottomSheet
            hideIcon
            items={parent.subcategories}
            contextLabel={categoryDisplayName(parent.title, parent.slug)}
            onContextPress={() => setParent(null)}
            onSelect={(child) => {
              onSelect({ id: child.id, parent: parent.title, title: child.title });
              setParent(null);
            }}
          />
        ) : (
          <TaxonomyList
            inBottomSheet
            items={categories}
            onSelect={(item) => setParent(item)}
            onSearchSelect={(match, child) =>
              onSelect({ id: child.id, parent: match.title, title: child.title })
            }
          />
        )}
      </View>
    </CustomBottomSheetModal>
  );
});
