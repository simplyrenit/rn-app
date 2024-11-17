import { LoginOptions, TermsAndPolicy } from "@/components/auth";
import { StaticContainer, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useState } from "react";
import { Dimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Carousel from "react-native-reanimated-carousel";
import { CarouselItem } from "../lib/types";

const StyledView = styled(View);
const StyledImage = styled(Image);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const carouselData: CarouselItem[] = [
  {
    title: "Rent Anything",
    description: "Rent in or rent out just about anything you desire!",
    lightImage: require("../../assets/auth/rent-anything-light.png"),
    darkImage: require("../../assets/auth/rent-anything-dark.png"),
  },
  {
    title: "Rent Anywhere",
    description:
      "We connect you with what you desire and is right under your nose!",
    lightImage: require("../../assets/auth/rent-anywhere-light.png"),
    darkImage: require("../../assets/auth/rent-anywhere-dark.png"),
  },
  {
    title: "Rent Anytime",
    description:
      "The chat feature let's you talk to the owner for all things product!",
    lightImage: require("../../assets/auth/rent-anytime-light.png"),
    darkImage: require("../../assets/auth/rent-anytime-dark.png"),
  },
];

export default function OnboardingScreen(): JSX.Element {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const [currentPage, setCurrentPage] = useState(0);

  const renderItem = ({ item }: { item: CarouselItem }) => (
    <StyledView className="items-center justify-center w-full border border-transparent">
      <StyledImage
        source={isDarkMode ? item.darkImage : item.lightImage}
        className="w-full h-3/4"
        contentFit="contain"
      />
      <Text fontSize="text-2xl" fontWeight="font-bold" className="mt-4">
        {item.title}
      </Text>
      <Text fontSize="text-base" className="text-center mt-2 px-2">
        {item.description}
      </Text>
    </StyledView>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StaticContainer width={100}>
        <StyledView className="flex-1">
          <Carousel
            loop
            width={SCREEN_WIDTH * 1}
            height={SCREEN_HEIGHT * 0.65}
            data={carouselData}
            renderItem={renderItem}
            onSnapToItem={(index) => setCurrentPage(index)}
            mode="parallax"
            modeConfig={{
              parallaxScrollingScale: 0.9,
              parallaxScrollingOffset: 50,
            }}
            autoPlay={true}
            autoPlayInterval={5000}
          />
          <StyledView className="flex-row justify-center mt-4 mb-8">
            {carouselData.map((_, index) => (
              <StyledView
                key={index}
                className={`w-16 h-1 mx-1 ${
                  index === currentPage ? "bg-[#4B46B4]" : "bg-gray-300"
                }`}
              />
            ))}
          </StyledView>

          <LoginOptions isDarkMode={isDarkMode} />
          <TermsAndPolicy />
        </StyledView>
      </StaticContainer>
    </GestureHandlerRootView>
  );
}
