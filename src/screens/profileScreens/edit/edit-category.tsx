import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { useGlobalContext } from "@/context/global-context";
import { Category, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { View } from "react-native";

/**
 * The parent half of the taxonomy, for a product that already exists. Choosing
 * here pushes the subcategory screen; nothing is saved until that one saves it.
 */
export default function EditCategory() {
  const { categories } = useGlobalContext();
  const navigation = useTypedNavigation();

  const route = useRoute<RouteProps<"EditCategory">>();
  const { name } = route.params;

  const onSelect = (cat: Category) => {
    navigation.navigate("EditSubCategories", {
      name,
      category: cat.title,
      subcategories: cat.subcategories,
    });
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <EditStepHeader title="Edit Category" />

        <TaxonomyList
          items={categories}
          onSelect={onSelect}
          // The icon column was reserved and left empty here, while the same
          // taxonomy carried photographs on Home and identical cubes in the
          // listing flow. One glyph family, everywhere.
          preferRemoteIcon={false}
        />
      </View>
    </NonScrollableContainer>
  );
}
