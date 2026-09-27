import { Button, IconButton, Text, useButtonLabelColor } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, ink, radius } from "@/lib/design-tokens";
import { ProductImage } from "@/lib/types";
import { toast } from "@/lib/toast";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { styled } from "nativewind";
import React, { useRef, useState } from "react";
import { FlatList, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CameraIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { ChevronRightIcon } from "react-native-heroicons/mini";

const StyledBottomView = styled(BottomSheetView);
const MAX_IMAGES = 5;

/**
 * The empty state, measured off Figma `1:13650`: one dashed box on the 24pt
 * gutter, 160pt tall at the field radius, a plus centred in it, and 40pt of
 * air between the progress bar and its top edge. It was a box whose height was
 * 20% of the window — so it grew on a tall phone and shrank on a short one —
 * and a full-width disabled button where the frame draws bare text.
 */
const UPLOAD_BOX_HEIGHT = 160;
const UPLOAD_TOP_INSET = 24;
/**
 * The frame's plus draws 18.5pt wide. Heroicons' `PlusIcon` reaches that at
 * 28, not at the 24 this used — the glyph's own stroke is part of its width.
 */
const UPLOAD_GLYPH = 28;
/** The frame leaves 20pt under the Next row before the chrome below it. */
const SUBMIT_BOTTOM_GAP = 20;
/**
 * The frame sets 6pt between "Next" and its chevron. The 4/8 spacing scale has
 * no 6, and 8 measured 2pt wide of the frame, so the measured value wins here.
 */
const SUBMIT_LABEL_GAP = 6;

/**
 * The Next label + chevron rendered *inside* the submit `Button`. It has to be
 * its own component, not inline JSX in `ProductImageGrid`: `useButtonLabelColor`
 * reads the colour `Button` provides to its actual React descendants, and this
 * component only becomes one of those once it's passed as `Button`'s children —
 * calling the hook up in `ProductImageGrid` itself would read the context from
 * above the `Button`, not inside it, and silently fall back to the un-disabled
 * default.
 */
function SubmitLabel() {
  const color = useButtonLabelColor();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SUBMIT_LABEL_GAP,
      }}
    >
      <Text fontWeight="font-bold" style={{ color }}>
        Next
      </Text>
      <ChevronRightIcon size={16} color={color} />
    </View>
  );
}

interface ProductImageGridProps {
  /** Pre-populates the grid — the edit flow opens on the product's current images. */
  initialImages?: ProductImage[];
  /** The screen's own header: `PostProductHeader` for post, `EditStepHeader` for edit. */
  header: React.ReactNode;
  /**
   * Called with the final selection when the customer presses Next. The two
   * screens differ in what happens after — one writes to `ProductContext` and
   * pushes the wizard forward, the other threads the selection through route
   * params to the edit-cover screen — so that stays with the caller.
   */
  onSubmit: (images: ProductImage[]) => void;
}

/**
 * Grid picker for `edit-product-images` (profile edit flow). It was shared
 * with the old create wizard's `product-images`, removed in ENG-10. The two screens were 90% identical implementations of
 * the same grid, add-tile and gallery/camera bottom sheet; only the header and
 * what happens on submit differ, and both of those stay in the caller.
 */
export function ProductImageGrid({
  initialImages = [],
  header,
  onSubmit,
}: ProductImageGridProps) {
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const [selectedImages, setSelectedImages] = useState<ProductImage[]>(initialImages);
  const { width: winW, height: winH } = useWindowDimensions();
  // NonScrollableContainer excludes the bottom edge from its own SafeAreaView
  // (it reserves that space for the keyboard instead), so nothing between here
  // and the physical bottom of the screen accounts for the home indicator on
  // notched devices. The submit button is pinned right above it.
  const insets = useSafeAreaInsets();

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const handleSubmit = () => {
    if (selectedImages.length === 0) return;
    onSubmit(selectedImages);
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Photo library access is needed to choose an image");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - selectedImages.length,
    });

    // One twin guarded `result.assets` with `?? []` before reading `.length`;
    // the other read `.length` straight off it. ImagePicker types `assets` as
    // possibly undefined even when `canceled` is false, so the guarded version
    // wins here.
    const assets = result.assets ?? [];
    if (!result.canceled && assets.length > 0) {
      const newImages = assets.map((asset) => ({
        image: asset.uri,
        file_type: asset.type || "image/jpeg",
      }));
      setSelectedImages((prevImages) =>
        [...prevImages, ...newImages].slice(0, MAX_IMAGES)
      );
    }
    bottomSheetRef.current?.close();
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      toast.error("Camera access is needed to take a photo");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    const assets = result.assets ?? [];
    if (!result.canceled && assets.length > 0) {
      setSelectedImages((prevImages) =>
        [
          ...prevImages,
          { image: assets[0].uri, file_type: assets[0].type || "image/jpeg" },
        ].slice(0, MAX_IMAGES)
      );
    }
    bottomSheetRef.current?.close();
  };

  const removeImage = (index: number) => {
    setSelectedImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const allFieldsFilled = selectedImages.length > 0;

  const renderImageItem = ({
    item,
    index,
  }: {
    item: ProductImage;
    index: number;
  }) => (
    <View
      style={{
        width: Math.min(winW * 0.415, 163),
        marginBottom: 24,
        position: "relative",
      }}
    >
      <Image
        source={{ uri: item.image }}
        style={{
          width: "100%",
          height: winH * 0.2,
          borderRadius: radius.input,
        }}
      />
      <IconButton
        accessibilityLabel="Remove image"
        size={32}
        scrim
        style={{ position: "absolute", top: 5, right: 5 }}
        onPress={() => removeImage(index)}
      >
        {/* The scrim sits over a photo, so this wants `onPhoto`, not the text
            colour it was borrowing before (same #FFFFFF value, correct token). */}
        <XMarkIcon size={20} color={ink.onPhoto()} />
      </IconButton>
    </View>
  );

  const renderAddButton = (isFullWidth: boolean = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Add"
      onPress={() => bottomSheetRef.current?.present()}
      style={{
        borderStyle: "dashed",
        // Interactive control border: `inputLine`, not `line` — see the
        // design-tokens' own note on why a hairline fails as a control edge.
        // The original hardcoded the light theme's `line` regardless of the
        // active theme; this now tracks the theme as intended.
        borderColor: ink.inputLine(isDark),
        borderWidth: 1,
        width: isFullWidth ? "100%" : Math.min(winW * 0.415, 163),
        height: isFullWidth ? UPLOAD_BOX_HEIGHT : winH * 0.2,
        borderRadius: radius.input,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
      }}
    >
      {/* Was borrowing an inverted `line` token as an icon colour; `dim` is the
          token this app already uses for a secondary icon on a plain surface
          (see the InformationCircleIcon two screens over in cover-image-picker). */}
      <PlusIcon
        size={isFullWidth ? UPLOAD_GLYPH : 24}
        color={ink.dim(isDark)}
      />
    </TouchableOpacity>
  );

  return (
    <NonScrollableContainer>
      {header}

      <View className="px-gutter flex-1 ">
        <View
          className="flex-1"
          style={{
            paddingTop: selectedImages.length === 0 ? UPLOAD_TOP_INSET : 0,
          }}
        >
          {selectedImages.length === 0 ? (
            renderAddButton(true)
          ) : (
            <FlatList
              data={[
                ...selectedImages,
                ...(selectedImages.length < MAX_IMAGES ? ["add_button"] : []),
              ]}
              renderItem={({ item, index }) =>
                item === "add_button"
                  ? renderAddButton()
                  : renderImageItem({ item: item as ProductImage, index })
              }
              keyExtractor={(item, index) => index.toString()}
              numColumns={2}
              columnWrapperStyle={{
                justifyContent: "space-between",
              }}
            />
          )}
        </View>
        <View style={{ paddingTop: 8, paddingBottom: SUBMIT_BOTTOM_GAP + insets.bottom }}>
          {allFieldsFilled ? (
            <Button
              className="w-full items-center"
              onPress={handleSubmit}
            >
              <SubmitLabel />
            </Button>
          ) : (
            // The frame draws the empty state's Next as bare tertiary text with
            // a mini chevron and no fill — the same treatment Feedback & Review
            // and Write a review already use for an incomplete form.
            <View
              accessible
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              accessibilityLabel="Next"
              style={{
                height: MIN_TOUCH_TARGET,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: SUBMIT_LABEL_GAP,
              }}
            >
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                style={{ color: ink.dim(isDark) }}
              >
                Next
              </Text>
              <ChevronRightIcon size={20} color={ink.dim(isDark)} />
            </View>
          )}
        </View>
      </View>

      <CustomBottomSheetModal snapPoints={["40%"]} ref={bottomSheetRef} isDark={isDark}>
        <StyledBottomView className="w-full px-gutter py-2 flex flex-col justify-start flex-1">
          <View className="py-4 flex-row items-center justify-between space-x-5">
            <TouchableOpacity
              onPress={pickImageFromGallery}
              className=" flex-1 space-y-4"
              style={{
                borderStyle: "dashed",
                borderColor: ink.inputLine(isDark),
                borderWidth: 1,
                height: winH * 0.2,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhotoIcon size={24} color={ink.dim(isDark)} />
              <Text
                className={`${isDark ? "text-muted-dark" : "text-muted-light"} text-center`}
              >
                Choose from gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={takePhoto}
              className="space-y-4 flex-1"
              style={{
                borderStyle: "dashed",
                borderColor: ink.inputLine(isDark),
                borderWidth: 1,
                height: winH * 0.2,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CameraIcon size={24} color={ink.dim(isDark)} />
              <Text
                className={`${isDark ? "text-muted-dark" : "text-muted-light"} text-center`}
              >
                Take a photo
              </Text>
            </TouchableOpacity>
          </View>
        </StyledBottomView>
      </CustomBottomSheetModal>
    </NonScrollableContainer>
  );
}
