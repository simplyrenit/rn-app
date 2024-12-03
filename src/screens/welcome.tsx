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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

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
  const currentPage = useSharedValue(0);

  const AnimatedStyledView = Animated.createAnimatedComponent(StyledView);

  const renderItem = ({ item }: { item: CarouselItem }) => (
    <StyledView className="items-center justify-center w-full border border-transparent">
      <StyledImage
        source={isDarkMode ? item.darkImage : item.lightImage}
        className="w-full h-3/4"
        contentFit="contain"
      />
      <Text
        fontSize="text-2xl"
        fontWeight="font-bold"
        className="mt-4"
      >
        {item.title}
      </Text>
      <Text
        fontSize="text-base"
        className="text-center mt-2 px-2"
      >
        {item.description}
      </Text>
    </StyledView>
  );

  const dotAnimatedStyle = (index: number) =>
    useAnimatedStyle(() => ({
      width: 64,
      height: 4,
      marginHorizontal: 4,
      backgroundColor: withSpring(
        currentPage.value === index
          ? isDarkMode
            ? "#4B46B4"
            : "#4B46B4" // Active color for both themes
          : isDarkMode
          ? "#374151"
          : "#D1D5DB", // Inactive color based on theme
        {
          mass: 1,
          damping: 15,
          stiffness: 130,
          overshootClamping: false,
          restDisplacementThreshold: 0.001,
          restSpeedThreshold: 0.001,
        }
      ),
      borderRadius: 2, // Adding rounded corners
    }));

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
            onSnapToItem={(index) => {
              currentPage.value = index;
            }}
            mode="parallax"
            modeConfig={{
              parallaxScrollingScale: 0.9,
              parallaxScrollingOffset: 50,
            }}
            autoPlay={true}
            autoPlayInterval={4000}
          />
          <StyledView className="flex-row justify-center mt-4 mb-8">
            {carouselData.map((_, index) => (
              <AnimatedStyledView
                key={index}
                style={dotAnimatedStyle(index)}
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
