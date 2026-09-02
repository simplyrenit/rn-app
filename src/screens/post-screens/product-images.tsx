
import { Button, IconButton, StaticContainer, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { useTypedNavigation, ProductImage } from "@/lib/types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { styled } from "nativewind";
import React, { useRef, useState } from "react";
import { FlatList, TouchableOpacity, useWindowDimensions, View } from "react-native";
import {
  CameraIcon,
  ChevronRightIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { toast } from "@/lib/toast";
import { darkColors, ink, radius } from "@/lib/design-tokens";

const StyledBottomView = styled(BottomSheetView);
const MAX_IMAGES = 5;

export default function ProductImages() {
  const navigation = useTypedNavigation();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const { saveDetails } = useProductContext();
  // const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ProductImage[]>([]);
  const { width: winW, height: winH } = useWindowDimensions();

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const onPress = () => {
    if (selectedImages.length === 0) {
      return;
    }

    saveDetails({ images: selectedImages });
    navigation.navigate("ChooseCoverImage", {
      images: selectedImages.map((img) => img.image),
    });
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Photo library access is needed to choose an image");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - selectedImages.length,
    });

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

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    const assets = result.assets ?? [];
    if (!result.canceled && assets.length > 0) {
      setSelectedImages((prevImages) =>
        [
          ...prevImages,
          {
            image: assets[0].uri,
            file_type: assets[0].type || "image/jpeg",
          },
        ].slice(0, MAX_IMAGES)
      );
    }
    // setBottomSheetVisible(false);
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
          height: winH * 0.20,
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
        <XMarkIcon size={20} color={darkColors.text} />
      </IconButton>
    </View>
  );

  const renderAddButton = (isFullWidth: boolean = false) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add"
      onPress={() => {
        // setBottomSheetVisible(true);
        bottomSheetRef.current?.present();
      }}
      style={{
        borderStyle: "dashed",
        borderColor: ink.line(false),
        borderWidth: 1,
        width: isFullWidth ? "100%" : Math.min(winW * 0.415, 163),
        height: winH * 0.20,
        borderRadius: radius.input,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
      }}
    >
      <PlusIcon size={24} color={isDark ? ink.line(false) : ink.line(true)} />
    </TouchableOpacity>
  );

  return (
    <NonScrollableContainer>
      <PostProductHeader heading="Show us how it looks" step={4} showBackArrow />

      <View className="px-gutter flex-1 ">
        <View className="flex-1">
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
        <View className="py-2 ">
          <Button
            className="w-full items-center justify-between"
            disabled={!allFieldsFilled}
            onPress={onPress}
          >
            <View className="flex-row items-center justify-between">
              <Text tone="onBrand" fontWeight="font-bold">
                Next
              </Text>
              <ChevronRightIcon
                size={16}
                color={allFieldsFilled ? ink.onBrand() : ink.dim(false)}
              />
            </View>
          </Button>
        </View>
      </View>

      <CustomBottomSheetModal
        snapPoints={["40%"]}
        ref={bottomSheetRef}
        isDark={isDark}
      >
        <StyledBottomView className="w-full px-gutter py-2 flex flex-col justify-start flex-1">
          <View className="py-4 flex-row items-center justify-between space-x-5">
            <TouchableOpacity
              onPress={pickImageFromGallery}
              className=" flex-1 space-y-4"
              style={{
                borderStyle: "dashed",
                borderColor: ink.line(false),
                borderWidth: 1,
                height: winH * 0.20,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PhotoIcon size={24} color={isDark ? ink.line(false) : ink.line(true)} />
              <Text
                className={`${isDark ? "text-muted-dark" : "text-muted-light"
                  } text-center`}
              >
                Choose from gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={takePhoto}
              className="space-y-4 flex-1"
              style={{
                borderStyle: "dashed",
                borderColor: ink.line(false),
                borderWidth: 1,
                height: winH * 0.20,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CameraIcon size={24} color={isDark ? ink.line(false) : ink.line(true)} />
              <Text
                className={`${isDark ? "text-muted-dark" : "text-muted-light"
                  } text-center`}
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
