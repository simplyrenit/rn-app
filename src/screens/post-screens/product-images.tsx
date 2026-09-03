import { PostProductHeader } from "@/components/post/header";
import { ProductImageGrid } from "@/components/post/product-image-grid";
import { useProductContext } from "@/context/product-context";
import { ProductImage, useTypedNavigation } from "@/lib/types";
import React from "react";

export default function ProductImages() {
  const navigation = useTypedNavigation();
  const { saveDetails } = useProductContext();

  const handleSubmit = (images: ProductImage[]) => {
    saveDetails({ images });
    navigation.navigate("ChooseCoverImage", {
      images: images.map((img) => img.image),
    });
  };

  return (
    <ProductImageGrid
      header={<PostProductHeader heading="Show us how it looks" step={4} showBackArrow />}
      onSubmit={handleSubmit}
    />
  );
}
