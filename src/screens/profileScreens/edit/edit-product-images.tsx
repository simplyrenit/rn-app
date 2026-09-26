import { EditStepHeader } from "@/components/post/edit-step-header";
import { ProductImageGrid } from "@/components/post/product-image-grid";
import { ProductImage, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";

export default function EditProductImages() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditProductImages">>();
  const { images, name, coverImage } = route.params;

  // The selection is threaded to the next screen via route params, since this
  // edits one field of an already-published listing rather than a draft.
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
