import { Button, StaticContainer, Text } from "@/components/core";
import { PostProductHeader } from "@/components/post/header";
import { useGlobalContext } from "@/context/global-context";
import { useProductContext } from "@/context/product-context";
import { ProductImage, RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import { ImageEditor } from "@tahsinz21366/expo-crop-image"; // Correctly importing ImageEditor
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { styled } from "nativewind";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";

const StyledView = styled(View);
const StyledTouchableOpacity = styled(TouchableOpacity);

export default function ChooseCoverImage() {
  const navigation = useTypedNavigation();
  const route = useRoute<RouteProps<"ChooseCoverImage">>();
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const { images } = route.params;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<ProductImage | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { saveDetails } = useProductContext();

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

  const onPress = () => {
    saveDetails({ coverImage: croppedImage });
    navigation.navigate("ProductAvailability");
  };

  const renderImages = () => {
    return images.map((image, index) => (
      <StyledTouchableOpacity
        key={index}
        onPress={() => selectImage(image)}
        className={`w-40 h-40 mb-2.5 mr-3 relative rounded-lg overflow-hidden ${
          selectedImage === image ? "border-2 border-[#435be8]" : ""
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
    <StaticContainer width={100}>
      <StyledView className="px-3 flex-row items-center">
        <StyledTouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-[10%]"
        >
          <ArrowLeftIcon size={24} color={isDark ? "#ffffff" : "#000000"} />
        </StyledTouchableOpacity>
        <StyledView className="w-[80%]">
          <PostProductHeader heading="Choose a cover image" percentage={50} />
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
                className={`${
                  isDark ? "text-[#FFFFFF80]" : "text-[#00000080]"
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
            <Text
              fontWeight="font-bold"
              className={`mr-1 ${
                croppedImage ? "text-white" : "text-gray-500"
              }`}
            >
              Next
            </Text>
            <View className="mt-1">
              <ChevronRightIcon
                size={16}
                color={croppedImage ? "#ffffff" : "#888888"}
              />
            </View>
          </View>
        </Button>
      </View>
    </StaticContainer>
  );
}

const styles = StyleSheet.create({
  lottie: {
    resizeMode: "cover",
    transform: [{ scale: 2.3 }],
  },
});
