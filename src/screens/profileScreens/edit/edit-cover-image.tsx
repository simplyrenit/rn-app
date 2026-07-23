import { useProfile } from "@/backend/profile";
import { Button, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { useGlobalContext } from "@/context/global-context";
import { ProductImage, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { ImageEditor } from "@tahsinz21366/expo-crop-image"; // Correctly importing ImageEditor
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { styled } from "nativewind";
import React, { useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import {
  ArrowLeftIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";
import * as Progress from "react-native-progress";
import Toast from "react-native-toast-message";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);
const { height } = Dimensions.get("window");

export default function EditCoverImage() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"EditCoverImage">>();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const { images, name, coverImage } = route.params;
  const [selectedImage, setSelectedImage] = useState<string | null>(coverImage);
  const [croppedImage, setCroppedImage] = useState<ProductImage | null>({ image: coverImage, file_type: "image/jpeg" });
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { updateProductImages, loading } = useProfile();

  const selectImage = (image: string) => {
    setSelectedImage(image);
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setTimeout(() => {
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

  const onPress = async () => {
    if (croppedImage && images) {
      try {
        const response = await updateProductImages(name, {
          images: images.map((img) => ({
            image: img,
            file_type: "image/jpeg",
          })),
          cover_image: croppedImage,
        });

        Toast.show({
          type: "customToast",
          position: "bottom",
          text1: "Your product was updated!",
          text2: "success",
        });

        navigation.navigate("editProduct", { id: name });
      } catch (error) {
        console.error("Error updating product images:", error);
      }
    } else {
      console.warn("Please select and crop an image before proceeding.");
    }
  };

  const renderImages = () => {
    return images.map((image, index) => (
      <StyledTouchableOpacity
        key={index}
        onPress={() => selectImage(image)}
        className={`w-40 h-40 mb-2.5 mr-3 relative rounded-lg overflow-hidden ${selectedImage === image ? "border-2 border-[#435be8]" : ""
          }`}
      >
        <Image source={{ uri: image }} className="w-40 h-40" />
        {selectedImage === image && (
          <StyledView className="absolute inset-0 bg-[#435be880] h-40 w-40 justify-center items-center">
            {/* <CheckIcon size={24} color="#FFFFFF" /> */}
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
    ));
  };

  return (
    <NonScrollableContainer height={height > 700 ? 105 : 100}>
      <StyledView className="px-3 flex-row items-center py-4">
        <StyledTouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-[10%]"
        >
          <ArrowLeftIcon size={20} color={isDark ? "#ffffff" : "#000000"} />
        </StyledTouchableOpacity>
        <StyledView className="w-[80%]">
          <View className="items-center justify-center">
            <Text fontSize="text-lg" fontWeight="font-bold">
              Edit Cover Image
            </Text>
          </View>
        </StyledView>
        <StyledView className="w-[10%]" />
      </StyledView>
      <ScrollView ref={scrollViewRef} className="px-3  flex-1">
        <ScrollView
          horizontal
          contentContainerStyle={{
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          {renderImages()}
        </ScrollView>

        {isEditing && selectedImage && (
          <ImageEditor
            isVisible={isEditing}
            imageUri={selectedImage}
            // @ts-ignore
            onCropComplete={onCropComplete}
            onEditingCancel={onEditingCancel}
            onEditingComplete={(selectedImage) => {
              onCropComplete(selectedImage.uri);
            }}
            fixedAspectRatio={1 / 1.09}
          />
        )}

        <Text fontSize="text-md" fontWeight="font-bold" className="mt-3">
          Crop Image
        </Text>
        <StyledView className="mt-5">
          {croppedImage ? (
            <>
              <Image
                source={{ uri: croppedImage.image }}
                className="w-44 h-44 self-center rounded-lg mb-2.5"
              />
            </>
          ) : (
            <View
              className="w-full h-48 rounded-lg mb-2.5 justify-center items-center"
              style={{
                borderStyle: "dashed",
                borderColor: "#C4C4C4",
                borderWidth: 1,
              }}
            >
              <Text
                className={`${isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"
                  }`}
              >
                Select an image to crop
              </Text>
            </View>
          )}
          <View className="flex-row items-center space-x-2">
            <InformationCircleIcon
              size={16}
              color={isDark ? "#FFFFFF80" : "#00000080"}
            />
            <Text
              fontSize="text-sm"
              className={`${isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"}`}
            >
              Drag image to crop to your liking
            </Text>
          </View>
        </StyledView>
      </ScrollView>
      <View className="pb-2 px-3">
        <Button
          onPress={onPress}
          disabled={!croppedImage}
          className="w-full items-center justify-between "
        >
          <View className="flex-row items-center justify-between">
            {loading ? (
              <Progress.CircleSnail color={"white"} size={22} />
            ) : (
              <Text
                fontWeight="font-bold"
                className={`mr-1 ${croppedImage ? "text-white" : "text-gray-500"
                  }`}
              >
                Update Product
              </Text>
            )}
          </View>
        </Button>
      </View>
    </NonScrollableContainer>
  );
}

const styles = StyleSheet.create({
  lottie: {
    resizeMode: "cover",
    transform: [{ scale: 2.3 }],
  },
});
