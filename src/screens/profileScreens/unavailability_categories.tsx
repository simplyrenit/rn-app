import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Text } from "@/components/core";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { Category, useTypedNavigation } from "@/lib/types";
import React from "react";
import { View } from "react-native";

/**
 * Step one of the "Request an item" form. The same category list as the listing
 * wizard and the edit flow, so it inherits their row, glyph and header
 * measurements; this screen only owns where a tap goes.
 */
export default function UnavailabilityCategories() {
  const { categories } = useGlobalContext();
  const router = useTypedNavigation();

  const onPress = (cat: Category) => {
    router.navigate("UnavailabilitySubCat", {
      category: cat.title,
      subcategories: cat.subcategories,
    });
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <EditStepHeader title="Request an item" />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12 }}>
          <Text fontSize="text-base" fontWeight="font-bold">
            Choose a category
          </Text>
        </View>

        <TaxonomyList items={categories} onSelect={onPress} preferRemoteIcon={false} />
      </View>
    </NonScrollableContainer>
  );
}
