import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { CategoryValue } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import { Category } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useState } from "react";
import { View } from "react-native";

/**
 * The Review screen's category picker (§8.4): parent, then child, on the same
 * `TaxonomyList` the edit flow and the old wizard use, so the rows, icons and
 * display names match everywhere else a category is chosen.
 */
export const CategorySheet = forwardRef<
  BottomSheetModal,
  { categories: Category[]; onSelect: (value: CategoryValue) => void }
>(({ categories, onSelect }, ref) => {
  const { isDark } = useTheme();
  const [parent, setParent] = useState<Category | null>(null);

  return (
    <CustomBottomSheetModal
      ref={ref}
      isDark={isDark}
      snapPoints={["80%"]}
      frame
      scrollView={false}
      onDismiss={() => setParent(null)}
    >
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.sm }}>
          <Text role="sectionTitle" accessibilityRole="header">
            Choose a category
          </Text>
        </View>
        {parent ? (
          <TaxonomyList
            inBottomSheet
            items={parent.subcategories}
            contextLabel={categoryDisplayName(parent.title)}
            onContextPress={() => setParent(null)}
            onSelect={(child) => {
              onSelect({ parent: parent.title, title: child.title });
              setParent(null);
            }}
          />
        ) : (
          <TaxonomyList inBottomSheet items={categories} onSelect={(item) => setParent(item)} />
        )}
      </View>
    </CustomBottomSheetModal>
  );
});
