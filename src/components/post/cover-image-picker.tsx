import { Button, Text, useButtonLabelColor } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { ink } from "@/lib/design-tokens";
import { ProductImage } from "@/lib/types";
import { ImageEditor } from "@tahsinz21366/expo-crop-image";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { styled } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon, InformationCircleIcon } from "react-native-heroicons/outline";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

/**
 * The crop tool's fixed aspect ratio. This is expo-crop-image configuration,
 * not a layout value, so it does not belong on the design-token layer.
 */
const COVER_CROP_ASPECT_RATIO = 1 / 1.09;

/**
 * The submit label + optional chevron rendered *inside* the `Button`. Same
 * reason `product-image-grid.tsx`'s `SubmitLabel` is its own component:
 * `useButtonLabelColor` only resolves the disabled-aware colour `Button`
 * already computed when it's called from an actual descendant of that
 * `Button`, not from the parent that merely wrote the JSX.
 */
function SubmitLabel({
  label,
  showChevron,
}: {
  label: string;
  showChevron: boolean;
}) {
  const color = useButtonLabelColor();
  return (
    <View className="flex-row items-center justify-between">
      <Text fontWeight="font-bold" style={{ color }}>
        {label}
      </Text>
      {showChevron && <ChevronRightIcon size={16} color={color} />}
    </View>
  );
}

interface CoverImagePickerProps {
  /** The candidate images to choose a cover from — the set from the previous screen. */
  images: string[];
  /** Pre-fills the crop preview with the product's current cover (edit flow only). */
  initialCoverImage?: string;
  onSubmit: (coverImage: ProductImage) => void;
  submitLabel?: string;
  /**
   * Terminal actions ("Update Product") don't show a chevron — there is no
   * next step. Flow steps ("Next") do.
   */
  showSubmitChevron?: boolean;
  /**
   * Shows the Button's built-in spinner and — just as importantly — blocks a
   * second press while the network call it represents is in flight. The edit
   * screen used to swap its own label for a bare `ActivityIndicator` without
   * disabling the button, so a second tap during the upload could fire a
   * second `updateProductImages` call.
   */
  loading?: boolean;
}

/**
 * Cover-image picker shared by `choose-cover-image` (post flow) and
 * `edit-cover-image` (profile edit flow): the horizontal image strip, the
 * crop tool, the crop preview, and the submit control.
 *
 * The outer container and header stay with each screen — the post flow uses
 * `StaticContainer` + `PostProductHeader` (a wizard step), the edit flow uses
 * `NonScrollableContainer` + `EditStepHeader` (a single-field edit) — and
 * `onSubmit` stays with the caller, since one saves to `ProductContext` and
 * navigates while the other makes a network call.
 */
export function CoverImagePicker({
  images,
  initialCoverImage,
  onSubmit,
  submitLabel = "Next",
  showSubmitChevron = true,
  loading = false,
}: CoverImagePickerProps) {
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  // The previous screen can remove images from the selection (edit-product-images
  // lets the owner delete photos), but `initialCoverImage` is threaded through
  // route params from before that edit and isn't re-validated on the way in. If
  // it no longer names one of `images`, treating it as set would let the
  // customer submit an update pointing at a cover image that no longer exists
  // in the product's selection, without ever having picked one on this screen.
  const initialCoverIsValid = Boolean(
    initialCoverImage && images.includes(initialCoverImage)
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(
    initialCoverIsValid ? initialCoverImage! : null
  );
  const [croppedImage, setCroppedImage] = useState<ProductImage | null>(
    initialCoverIsValid
      ? { image: initialCoverImage!, file_type: "image/jpeg" }
      : null
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditing, setIsEditing] = useState(false);
  const editTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Guards the delayed `setIsEditing` below: without this, picking a second
  // thumbnail before the first's 1.5s timer fires queues a second timer, and
  // navigating away entirely (e.g. hitting the header's back arrow) fires
  // `setIsEditing` on a screen that's no longer mounted.
  useEffect(() => {
    return () => {
      if (editTimerRef.current) clearTimeout(editTimerRef.current);
    };
  }, []);

  const selectImage = (image: string) => {
    if (editTimerRef.current) clearTimeout(editTimerRef.current);
    setSelectedImage(image);
    scrollViewRef.current?.scrollToEnd({ animated: true });
    editTimerRef.current = setTimeout(() => {
      setIsEditing(true); // Enable editing when an image is selected
    }, 1500);
  };

  const onCropComplete = (uri: string) => {
    setCroppedImage({
      image: uri,
      file_type: "image/jpeg",
    });
    setIsEditing(false); // Disable editing after cropping
  };

  const onEditingCancel = () => {
    setIsEditing(false);
    setSelectedImage(null);
  };

  const handleSubmit = () => {
    if (!croppedImage) return;
    onSubmit(croppedImage);
  };

  return (
    <>
      <ScrollView ref={scrollViewRef} className="px-3 flex-1">
        <ScrollView
          horizontal
          contentContainerStyle={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          {images.map((image, index) => (
            <StyledTouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Confirm"
              key={index}
              onPress={() => selectImage(image)}
              className={`w-40 h-40 mb-2.5 mr-3 relative rounded-button overflow-hidden ${
                selectedImage === image ? "border-2 border-brand" : ""
              }`}
            >
              <Image source={{ uri: image }} className="w-40 h-40" />
              {selectedImage === image && (
                <StyledView className="absolute inset-0 bg-brand h-40 w-40 justify-center items-center">
                  <Lottie
                    source={require("./tick.json")}
                    style={[styles.lottie, { width: 40, height: 40 }]}
                    autoPlay={true}
                    loop={true}
                    resizeMode="cover"
                  />
                </StyledView>
              )}
            </StyledTouchableOpacity>
          ))}
        </ScrollView>

        {isEditing && selectedImage && (
          <ImageEditor
            isVisible={isEditing}
            imageUri={selectedImage}
            // @ts-ignore
            onCropComplete={onCropComplete}
            onEditingCancel={onEditingCancel}
            onEditingComplete={(selected) => {
              onCropComplete(selected.uri);
            }}
            fixedAspectRatio={COVER_CROP_ASPECT_RATIO}
          />
        )}

        <Text fontSize="text-md" fontWeight="font-bold" className="mt-5">
          Crop Image
        </Text>
        <StyledView className="mt-5">
          {croppedImage ? (
            <Image
              source={{ uri: croppedImage.image }}
              className="w-44 h-44 self-center rounded-button mb-2.5"
            />
          ) : (
            <View
              className="w-full h-48 rounded-button mb-2.5 justify-center items-center"
              style={{
                borderStyle: "dashed",
                borderColor: ink.inputLine(isDark),
                borderWidth: 1,
              }}
            >
              <Text className={`${isDark ? "text-subtle-dark" : "text-subtle-light"}`}>
                Select an image to crop
              </Text>
            </View>
          )}
          <View className="flex-row items-center space-x-2">
            <InformationCircleIcon size={16} color={ink.dim(isDark)} />
            <Text
              fontSize="text-sm"
              className={`${isDark ? "text-subtle-dark" : "text-subtle-light"}`}
            >
              Drag image to crop to your liking
            </Text>
          </View>
        </StyledView>
      </ScrollView>
      <View className="pb-2 px-3">
        <Button
          onPress={handleSubmit}
          disabled={!croppedImage}
          loading={loading}
          className="w-full items-center justify-between "
        >
          <SubmitLabel label={submitLabel} showChevron={showSubmitChevron} />
        </Button>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  lottie: {
    resizeMode: "cover",
    transform: [{ scale: 2.3 }],
  },
});
