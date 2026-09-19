import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PostProductHeader } from "@/components/post/header";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { useProductContext } from "@/context/product-context";
import { categoryDisplayName } from "@/lib/category-icons";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { View } from "react-native";

/**
 * Step 2 of the listing flow. The list is shared with the edit screen; this
 * adapter owns only what a chosen subcategory means to the flow.
 */
export default function PostSubCategories() {
  const route = useRoute<RouteProps<"PostSubCategories">>();
  const navigation = useTypedNavigation();
  const { saveDetails } = useProductContext();

  const { category, subcategories } = route.params;

  const onSelect = (subcategory: Subcategory) => {
    saveDetails({ subcategory });
    navigation.navigate("AboutProduct");
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <PostProductHeader
          heading="Choose a subcategory"
          step={2}
          showBackArrow
        />

        {/* The frame names the branch on its own ("Electronics"), because the
            chevron beside it already says what the row does. It read
            "In Electronics" when it was a caption with no control. */}
        <TaxonomyList
          items={subcategories}
          onSelect={onSelect}
          contextLabel={categoryDisplayName(category)}
          onContextPress={() => navigation.goBack()}
        />
      </View>
    </NonScrollableContainer>
  );
}
