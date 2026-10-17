import { useProfile } from "@/backend/profile";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { CoverImagePicker } from "@/components/post/cover-image-picker";
import { EditStepHeader } from "@/components/post/edit-step-header";
import { ProductImage, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { ListingAnswer, saveOutcome } from "@/lib/listing-edit";
import { toastSave } from "@/lib/save-toast";
import { toast } from "@/lib/toast";

export default function EditCoverImage() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditCoverImage">>();
  const { images, name, coverImage } = route.params;
  const { updateProductImages, loading } = useProfile();

  const handleSubmit = async (croppedImage: ProductImage) => {
    try {
      const response = await updateProductImages(name, {
        images: images.map((img) => ({
          image: img,
          file_type: "image/jpeg",
        })),
        cover_image: croppedImage,
      });

      // Every photo is uploaded again, so a save here is never the same photos: the opening values are for the earlier change.
      toastSave(
        saveOutcome({
          before: { images, cover_image: coverImage },
          sent: { images, cover_image: croppedImage },
          answer: response.data as unknown as ListingAnswer,
        })
      );
      navigation.navigate("editProduct", { id: name });
    } catch (error) {
      console.error("Error updating product images:", error);
      toast.error("We couldn't update your product. Please try again.");
    }
  };

  return (
    <NonScrollableContainer>
      <EditStepHeader title="Edit Cover Image" />
      <CoverImagePicker
        reserveBottomInset
        images={images}
        initialCoverImage={coverImage}
        onSubmit={handleSubmit}
        submitLabel="Update Product"
        showSubmitChevron={false}
        loading={loading}
      />
    </NonScrollableContainer>
  );
}
