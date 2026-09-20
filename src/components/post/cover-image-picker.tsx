import { Button, Text, useButtonLabelColor } from "@/components/core";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { ProductImage } from "@/lib/types";
import { ImageEditor } from "@tahsinz21366/expo-crop-image";
import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { ChevronRightIcon, InformationCircleIcon } from "react-native-heroicons/outline";
import { CheckCircleIcon } from "react-native-heroicons/mini";

// Measured off the Figma Cover Image frame: content padded 24, two 159pt tiles 24
// apart at radius 16, a 2pt brand edge and a 40% brand wash on the chosen one, a
// 200pt crop preview at radius 16 on the hairline.
const TILE_GAP = 24;
const CROP_HEIGHT = 200;

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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
  /**
   * Reserve the home-indicator inset under the pinned submit control.
   *
   * Opt-in rather than automatic because the two callers sit in different
   * containers: the post flow's `StaticContainer` wraps a bare `SafeAreaView`
   * that has already reserved the bottom edge, while the edit flow's
   * `NonScrollableContainer` sets `edges={["top","left","right"]}` and so
   * reserves nothing there. Adding the inset unconditionally would double it
   * on the post flow. `ProductImageGrid` needs no such prop because it owns
   * its own container.
   */
  reserveBottomInset?: boolean;
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
  reserveBottomInset = false,
}: CoverImagePickerProps) {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const tileSize = Math.floor((windowWidth - 2 * SCREEN_GUTTER - TILE_GAP) / 2);
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
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SCREEN_GUTTER, gap: TILE_GAP }}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: TILE_GAP }}>
          {images.map((image, index) => {
            const selected = selectedImage === image;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  selected ? "Selected cover image" : "Use as the cover image"
                }
                accessibilityState={{ selected }}
                key={index}
                onPress={() => selectImage(image)}
                style={{
                  width: tileSize,
                  height: tileSize,
                  borderRadius: radius.card,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: image }}
                  style={{ width: tileSize, height: tileSize }}
                />
                {selected ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(99,91,232,0.4)",
                      borderWidth: 2,
                      borderColor: color.brand,
                      borderRadius: radius.card,
                    }}
                  >
                    <CheckCircleIcon size={32} color={color.onBrand} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

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

        <View style={{ gap: 16 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            Crop Image
          </Text>
          {croppedImage ? (
            <Image
              source={{ uri: croppedImage.image }}
              contentFit="cover"
              style={{
                width: "100%",
                height: CROP_HEIGHT,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: color.line,
              }}
            />
          ) : (
            <View
              style={{
                height: CROP_HEIGHT,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: color.line,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text fontSize="text-sm" tone="dim">
                Select an image to crop
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <InformationCircleIcon size={20} color={color.textDim} />
            <Text fontSize="text-sm" tone="dim">
              Drag image to crop to your liking
            </Text>
          </View>
        </View>
      </ScrollView>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: 16 + (reserveBottomInset ? insets.bottom : 0),
        }}
      >
        <Button
          onPress={handleSubmit}
          disabled={!croppedImage}
          loading={loading}
          className="w-full items-center"
        >
          <SubmitLabel label={submitLabel} showChevron={showSubmitChevron} />
        </Button>
      </View>
    </>
  );
}
