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
import { ink } from "@/lib/design-tokens";
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
      <StyledTouchableOpacity accessibilityRole="button" accessibilityLabel="Confirm"
        key={index}
        onPress={() => selectImage(image)}
        className={`w-40 h-40 mb-2.5 mr-3 relative rounded-button overflow-hidden ${selectedImage === image ? "border-2 border-brand" : ""
          }`}
      >
        <Image source={{ uri: image }} className="w-40 h-40" />
        {selectedImage === image && (
          <StyledView className="absolute inset-0 bg-brand h-40 w-40 justify-center items-center">
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
        <StyledTouchableOpacity accessibilityRole="button" accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          className="w-[10%]"
        >
          <ArrowLeftIcon size={24} color={ink.text(isDark)} />
        </StyledTouchableOpacity>
        <StyledView className="w-[80%]">
          <PostProductHeader heading="Choose a cover image" step={5} />
        </StyledView>
        <StyledView className="w-[10%]" />
      </StyledView>
      <ScrollView ref={scrollViewRef} className="px-0  flex-1">
        <ScrollView
          horizontal
          contentContainerStyle={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 12
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

        <Text fontSize="text-md" fontWeight="font-bold" className="mt-5 mx-4">
          Crop Image
        </Text>
        <StyledView className="mt-5 mx-4">
          {croppedImage ? (
            <>
              <Image
                source={{ uri: croppedImage.image }}
                className="w-44 h-44 self-center rounded-button mb-2.5"
              />
            </>
          ) : (
            <View
              className="w-full h-48 rounded-button mb-2.5 justify-center items-center"
              style={{
                borderStyle: "dashed",
                borderColor: ink.line(false),
                borderWidth: 1,
              }}
            >
              <Text
                className={`${isDark ? "text-subtle-dark" : "text-subtle-light"
                  }`}
              >
                Select an image to crop
              </Text>
            </View>
          )}
          <View className="flex-row items-center space-x-2">
            <InformationCircleIcon
              size={16}
              color={ink.dim(isDark)}
            />
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
          onPress={onPress}
          disabled={!croppedImage}
          className="w-full items-center justify-between "
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
              color={croppedImage ? "#FFFFFF" : ink.dim(false)}
            />
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
