import { StaticContainer } from "@/components/core";
import { CoverImagePicker } from "@/components/post/cover-image-picker";
import { PostProductHeader } from "@/components/post/header";
import { useProductContext } from "@/context/product-context";
import { ProductImage, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";

export default function ChooseCoverImage() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"ChooseCoverImage">>();
  const { images } = route.params;
  const { saveDetails } = useProductContext();

  const handleSubmit = (coverImage: ProductImage) => {
    saveDetails({ coverImage });
    navigation.navigate("ProductAvailability");
  };

  return (
    <StaticContainer width={100}>
      <PostProductHeader heading="Choose a cover image" step={5} showBackArrow />
      <CoverImagePicker images={images} onSubmit={handleSubmit} />
    </StaticContainer>
  );
}
