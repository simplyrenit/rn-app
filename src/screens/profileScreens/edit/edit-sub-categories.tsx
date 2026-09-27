import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { categoryDisplayName } from "@/lib/category-icons";
import { categoryPayload } from "@/lib/list-flow/payload";
import { toast } from "@/lib/toast";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { View } from "react-native";

/**
 * The PATCH that re-files a product, shared with the category screen's search
 * so a search result saves exactly as picking the row here does.
 */
export function useSaveSubcategory(name: string) {
  const navigation = useTypedNavigation();
  const { updateMyProductDetails } = useProfile();
  // Which row is saving. `useProfile`'s own `loading` is shared by every call
  // the hook exposes, so it cannot say *which* subcategory is in flight.
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (category: string, subcategory: Subcategory, busyKey = subcategory.title) => {
    if (saving) return;
    setSaving(busyKey);

    try {
      await updateMyProductDetails(name, {
        category: categoryPayload({
          id: subcategory.id,
          parent: category,
          title: subcategory.title,
        }),
      });

      toast.success("Your product was updated!");
      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Failed to update product details:", error);
      // Selecting a row is the whole screen; a failure that only reached the
      // console left the customer tapping a row that appeared to do nothing.
      toast.error("We could not change the category. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  return { save, saving };
}

/**
 * Re-filing an existing product under a different subcategory. The list is
 * shared with step 2 of the listing flow; this adapter owns the PATCH.
 */
export default function EditSubCategories() {
  const route = useRoute<RouteProps<"EditSubCategories">>();
  const navigation = useTypedNavigation();
  const { name, category, subcategories } = route.params;
  const { save, saving } = useSaveSubcategory(name);

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <EditStepHeader title="Edit Sub Category" />

        <TaxonomyList
          items={subcategories}
          onSelect={(subcategory) => save(category, subcategory)}
          contextLabel={categoryDisplayName(category)}
          onContextPress={() => navigation.goBack()}
          busyTitle={saving}
        />
      </View>
    </NonScrollableContainer>
  );
}
