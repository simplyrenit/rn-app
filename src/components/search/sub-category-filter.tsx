import { categoryDisplayName } from "@/lib/category-icons";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon, ChevronLeftIcon } from "react-native-heroicons/outline";
import { Text } from "@/components/core";
import { Subcategory } from "@/lib/types";
import { FlatList } from "react-native-gesture-handler";
import { SCREEN_GUTTER, ink } from "@/lib/design-tokens";

interface SubCategoryFilterProps {
  selectedCategory: string;
  selectedSubCategory: string;
  onSelect: (subCategory: string) => void;
  onClose: () => void;
  isDark: boolean;
  subcategories: Subcategory[];
  isLoading: boolean;
  closeSheet: () => void;
}

// 2089:34929: a 48pt back row, then 48pt rows of the label alone (REVIEW b1-01:
// sub-categories repeat no icon), the chosen one brand SemiBold with a 20 check.
const ROW = 48;

const SubCategoryFilter: React.FC<SubCategoryFilterProps> = ({
  selectedCategory,
  selectedSubCategory,
  onSelect,
  onClose,
  isDark,
  subcategories,
}) => (
  <View style={{ flex: 1, paddingTop: 8, paddingHorizontal: SCREEN_GUTTER }}>
    {/* Pinned over the list, so the way back stays in reach on a long one. */}
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Back to categories, ${categoryDisplayName(selectedCategory)}`}
      onPress={onClose}
      style={{ minHeight: ROW, flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <ChevronLeftIcon size={20} strokeWidth={1.5} color={ink.text(isDark)} />
      <Text fontSize="text-md" fontWeight="font-semibold">
        {categoryDisplayName(selectedCategory)}
      </Text>
    </TouchableOpacity>
    <FlatList
      showsVerticalScrollIndicator={false}
      data={subcategories}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 16 }}
      keyExtractor={(item) => item.title}
      renderItem={({ item }) => {
        const selected = selectedSubCategory === item.title;
        return (
          <TouchableOpacity
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onSelect(item.title)}
            style={{ minHeight: ROW, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Text
              fontSize="text-md"
              fontWeight={selected ? "font-semibold" : "font-normal"}
              style={{ flex: 1, color: selected ? ink.brandText(isDark) : ink.text(isDark) }}
            >
              {categoryDisplayName(item.title)}
            </Text>
            {selected && <CheckIcon size={20} strokeWidth={1.5} color={ink.brandText(isDark)} />}
          </TouchableOpacity>
        );
      }}
    />
  </View>
);

export default SubCategoryFilter;
