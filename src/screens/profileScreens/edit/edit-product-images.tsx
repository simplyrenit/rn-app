import { EditStepHeader } from "@/components/post/edit-step-header";
import { ProductImageGrid } from "@/components/post/product-image-grid";
import { ProductImage, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";

export default function EditProductImages() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditProductImages">>();
  const { images, name, coverImage } = route.params;

  // Unlike the post flow, the edit flow doesn't write through `ProductContext`
  // — it threads the selection to the next screen via route params instead,
  // since it's editing one field of an already-published listing rather than
  // walking the create wizard.
  const handleSubmit = (selected: ProductImage[]) => {
    navigation.navigate("EditCoverImage", {
      images: selected.map((img) => img.image),
      name,
      coverImage,
    });
  };

  return (
    <ProductImageGrid
      initialImages={images.map((image) => ({ image, file_type: "image/jpeg" }))}
      header={<EditStepHeader title="Edit Product Images" />}
      onSubmit={handleSubmit}
    />
  );
}
