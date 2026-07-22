import { LoginOptions, TermsAndPolicy } from "@/components/auth";
import { StaticContainer, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useState } from "react";
import { Dimensions, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Carousel from "pinar";
import { CarouselItem } from "../lib/types";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
      "The chat feature lets you talk to the owner for all things product!",
    lightImage: require("../../assets/auth/rent-anytime-light.png"),
    darkImage: require("../../assets/auth/rent-anytime-dark.png"),
  },
];

export default function OnboardingScreen(): JSX.Element {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";
  const progress = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const AnimatedStyledView = Animated.createAnimatedComponent(StyledView);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StaticContainer width={100}>
        <StyledView className="flex-1" style={{ height: SCREEN_HEIGHT*0.6 }}>
          <Carousel
            loop
            autoplay
            height={SCREEN_HEIGHT * 0.6}
            width={SCREEN_WIDTH}
            showsDots={false}
            autoplayInterval={3000}
            renderPrev={() => <></>}
            renderNext={() => <></>}
            renderDot={() => (
              <View className="w-2 h-2 mt-5 bg-gray-300 rounded-lg mx-0.5 -translate-y-8" />
            )}
            renderActiveDot={() => (
              <View className="w-2 h-2 mt-5 bg-brand-blue rounded-lg mx-0.5 -translate-y-8" />
            )}
            onIndexChanged={(params) => setCurrentIndex(params.index)}
          >
            {carouselData.map((item, index) => (
              <StyledView
                key={index}
                className="items-center justify-center w-full border border-transparent"
              >
                <StyledImage
                  source={isDarkMode ? item.darkImage : item.lightImage}
                  className="w-full"
                  style={{ height: SCREEN_HEIGHT * 0.5 }}
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
            ))}
          </Carousel>
        </StyledView>
          <View className="flex-row justify-center items-center mt-2">
            {carouselData.map((data, index) => (
              index === currentIndex ? <View key={index} className="w-2 h-2 mt-5 bg-brand-blue rounded-lg mx-0.5 -translate-y-8" />
                : <View key={index} className="w-2 h-2 mt-5 bg-gray-300 rounded-lg mx-0.5 -translate-y-8" />
            ))}
          </View>

          <LoginOptions isDarkMode={isDarkMode} />
          <TermsAndPolicy />
      </StaticContainer>
    </GestureHandlerRootView>
  );
}
