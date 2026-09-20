import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Text } from "@/components/core";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { categoryDisplayName } from "@/lib/category-icons";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { View } from "react-native";

/**
 * Step two of the "Request an item" form: the same sub-category list the listing
 * wizard and the edit flow use, with the branch row above it that goes back to
 * the category.
 */
export default function UnavailabilitySubCatScreen() {
  const route = useRoute<RouteProps<"UnavailabilitySubCat">>();
  const navigation = useTypedNavigation();

  // Destructure the category and subcategories from route params
  const { category, subcategories } = route.params;

  const onPress = (subcategory: Subcategory) => {
    navigation.navigate("unavailabilityFormInputs", {
      category,
      subcategory: subcategory.title,
    });
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <EditStepHeader title="Request an item" />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12 }}>
          <Text fontSize="text-base" fontWeight="font-bold">
            Choose a SubCategory
          </Text>
        </View>

        <TaxonomyList
          items={subcategories}
          onSelect={onPress}
          contextLabel={categoryDisplayName(category)}
          onContextPress={() => navigation.goBack()}
        />
      </View>
    </NonScrollableContainer>
  );
}
