import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { TaxonomyList } from "@/components/post/taxonomy-list";
import { toast } from "@/lib/toast";
import { RouteProps, Subcategory, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { View } from "react-native";

/**
 * Re-filing an existing product under a different subcategory. The list is
 * shared with step 2 of the listing flow; this adapter owns the PATCH.
 */
export default function EditSubCategories() {
  const route = useRoute<RouteProps<"EditSubCategories">>();
  const navigation = useTypedNavigation();
  const { name, category, subcategories } = route.params;
  const { updateMyProductDetails } = useProfile();
  // Which row is saving. `useProfile`'s own `loading` is shared by every call
  // the hook exposes, so it cannot say *which* subcategory is in flight.
  const [savingTitle, setSavingTitle] = useState<string | null>(null);

  const onSelect = async (subcategory: Subcategory) => {
    if (savingTitle) return;
    setSavingTitle(subcategory.title);

    try {
      await updateMyProductDetails(name, {
        category: {
          parent: category,
          title: subcategory.title,
        },
      });

      toast.success("Your product was updated!");
      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Failed to update product details:", error);
      // Selecting a row is the whole screen; a failure that only reached the
      // console left the customer tapping a row that appeared to do nothing.
      toast.error("We could not change the category. Please try again.");
    } finally {
      setSavingTitle(null);
    }
  };

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1 }}>
        <EditStepHeader title="Edit Sub Category" />

        <TaxonomyList
          items={subcategories}
          onSelect={onSelect}
          contextLabel={`In ${category}`}
          busyTitle={savingTitle}
        />
      </View>
    </NonScrollableContainer>
  );
}
