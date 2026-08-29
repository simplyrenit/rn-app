
import { Button, StaticContainer, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { useTypedNavigation, ProductImage, RouteProps } from "@/lib/types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { styled } from "nativewind";
import React, { useRef, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  CameraIcon,
  ChevronRightIcon,
  PhotoIcon,
  PlusIcon,
  XMarkIcon,
} from "react-native-heroicons/outline";
import { toast } from "@/lib/toast";
import { ink, radius } from "@/lib/design-tokens";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const StyledBottomView = styled(BottomSheetView);
const MAX_IMAGES = 5;

export default function EditProductImages() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditProductImages">>();

  const { images, name, coverImage } = route.params;

  const { theme } = useGlobalContext();
  const isDark = theme === "dark";

  // const [isBottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ProductImage[]>(
    images.map((image) => ({ image, file_type: "image/jpeg" }))
  );

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const onPress = () => {
    // saveDetails({ images: selectedImages });
    navigation.navigate("EditCoverImage", {
      images: selectedImages.map((img) => img.image),
      name: name,
      coverImage,
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

    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map((asset) => ({
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

    if (!result.canceled && result.assets?.length) {
      const [asset] = result.assets;
      setSelectedImages((prevImages) =>
        [
          ...prevImages,
          {
            image: asset.uri,
            file_type: asset.type || "image/jpeg",
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
        width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
        marginBottom: 24,
        position: "relative",
      }}
    >
      <Image
        source={{ uri: item.image }}
        style={{
          width: "100%",
          height: hp(20),
          borderRadius: radius.input,
        }}
      />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close"
        style={{
          position: "absolute",
          top: 5,
          right: 5,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: radius.card,
          padding: 2,
        }}
        onPress={() => removeImage(index)}
      >
        <XMarkIcon size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
        width: isFullWidth ? "100%" : wp("41.5%") > 163 ? 163 : wp("41.5%"),
        height: hp(20),
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
      <View className="px-3 flex-row items-center py-4">
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          className="w-[10%]"
        >
          <ArrowLeftIcon size={20} color={ink.text(isDark)} />
        </TouchableOpacity>
        <View className="w-[80%]">
          <View className=" items-center justify-center">
            <Text fontSize="text-lg" fontWeight="font-bold">
              Edit Product Images
            </Text>
          </View>
        </View>
        <View className="w-[10%]"></View>
      </View>

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
              <Text tone="body"
                fontWeight="font-bold"
                style={{ color: "#FFFFFF" }}
              >
                Next
              </Text>
              <ChevronRightIcon
                size={16}
                color={allFieldsFilled ? "#FFFFFF" : ink.dim(false)}
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
                height: hp("20%"),
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
                height: hp("20%"),
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
