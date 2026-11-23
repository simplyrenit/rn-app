import { LoginOptions, TermsAndPolicy } from "@/components/auth";
import { NonScrollableContainer, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { useRoute } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Carousel from "pinar";
import { CarouselItem } from "../lib/types";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

const carouselData: CarouselItem[] = [
  {
    title: "Rent anything",
    description: "Rent in or rent out just about anything you desire!",
    lightImage: require("../../assets/auth/rent-anything-light.png"),
    darkImage: require("../../assets/auth/rent-anything-dark.png"),
  },
  {
    title: "Rent anywhere",
    description:
      "We connect you with what you desire and is right under your nose!",
    lightImage: require("../../assets/auth/rent-anywhere-light.png"),
    darkImage: require("../../assets/auth/rent-anywhere-dark.png"),
  },
  {
    title: "Rent anytime",
    description:
      "Book in a few taps, then pick it up or get it delivered to your door.",
    lightImage: require("../../assets/auth/rent-anytime-light.png"),
    darkImage: require("../../assets/auth/rent-anytime-dark.png"),
  },
];

// 02 Welcome (2089:15349 / 15444 / 15529), in pt under the status bar. The slide is
// top-aligned: art 8 down, at most 390×326 (the light PNGs are that node at 3x), then the
// 20/28 title 8 below, the 16/24 body 8 below that. The dots (8, 4 apart) and the sign-in
// block are bottom-anchored: dots 44 above the providers, the block ending 30 above the
// screen's bottom edge (844 − 814), into the home-indicator strip as the frame draws it.
// Kept on review (not max(30, insets.bottom)): the 34pt iOS inset would move the block 4pt off the
// frame; Android here is not edge-to-edge, so its nav bar cannot cover the Terms links.
// The art sizes are maximums: on a 667pt SE or at a large font the art shrinks instead.
const ART_TOP = 8;
const ART_HEIGHT = 326;
const TEXT_GAP = 8;
const DOT = 8;
const DOT_GAP = 4;
const DOTS_TO_BUTTONS = 44;
const BOTTOM = 30;

type WelcomeDesign = { slide: number };

export default function OnboardingScreen(): JSX.Element {
  const { theme } = useGlobalContext();
  const { color } = useTheme();
  const isDarkMode = theme === "dark";
  // Dev-only design seed (ENG-428 plan §1): fixes the slide and stops autoplay for a frame diff.
  const route = useRoute();
  const design = __DEV__ ? (route.params as { design?: WelcomeDesign } | undefined)?.design : undefined;
  const [currentIndex, setCurrentIndex] = useState(design?.slide ?? 0);
  // Read per render, not once at module load: a frozen launch-time width left
  // the slides the wrong size after a split-screen or display-size change.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // The carousel is sized to whatever vertical space is left once the dots, login
  // buttons and terms have taken theirs, rather than a fixed share of the screen
  // that overflowed onto the buttons on shorter devices.
  const [carouselHeight, setCarouselHeight] = useState(
    Math.round(windowHeight * 0.55)
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NonScrollableContainer>
        <View
          style={{ flex: 1, overflow: "hidden" }}
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            if (h > 0 && h !== carouselHeight) setCarouselHeight(h);
          }}
        >
          <Carousel
            loop
            index={design?.slide ?? 0}
            autoplay={!design}
            height={carouselHeight}
            width={windowWidth}
            showsDots={false}
            autoplayInterval={3000}
            renderPrev={() => <></>}
            renderNext={() => <></>}
            onIndexChanged={(params) => setCurrentIndex(params.index)}
          >
            {carouselData.map((item, index) => (
              <View
                key={index}
                style={{ height: carouselHeight, width: "100%", paddingTop: ART_TOP }}
              >
                <Image
                  source={isDarkMode ? item.darkImage : item.lightImage}
                  // Shrinks rather than overflows, so the title and copy always fit.
                  style={{ width: "100%", height: ART_HEIGHT, flexShrink: 1 }}
                  contentFit="contain"
                />
                <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: TEXT_GAP, gap: TEXT_GAP }}>
                  <Text fontSize="text-lg" fontWeight="font-bold" lineHeight={28} style={{ textAlign: "center" }}>
                    {item.title}
                  </Text>
                  <Text fontSize="text-md" lineHeight={24} tone="body" style={{ textAlign: "center" }}>
                    {item.description}
                  </Text>
                </View>
              </View>
            ))}
          </Carousel>
        </View>

        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: DOT_GAP, marginBottom: DOTS_TO_BUTTONS }}
        >
          {carouselData.map((_, index) => (
            <View
              key={index}
              style={{
                width: DOT,
                height: DOT,
                borderRadius: DOT / 2,
                backgroundColor: index === currentIndex ? color.brand : color.line,
              }}
            />
          ))}
        </View>

        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: BOTTOM, gap: 16 }}>
          <LoginOptions isDarkMode={isDarkMode} />
          <TermsAndPolicy />
        </View>
      </NonScrollableContainer>
    </GestureHandlerRootView>
  );
}
