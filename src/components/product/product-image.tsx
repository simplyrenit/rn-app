import useSaved from "@/backend/useSaved";
import { useGlobalContext } from "@/context/global-context";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import { styled } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ArrowLeftIcon, HeartIcon as HI } from "react-native-heroicons/outline";
import Carousel from "react-native-reanimated-carousel";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Toast from "react-native-toast-message";
import { useMutation, useQueryClient } from "react-query";

const StyledView = styled(View);
const StyledButton = styled(TouchableOpacity);

interface Props {
  images: any[];
  mode?: string;
  name?: string;
  isFavorite?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// const HEART_ICON_SIZE = 24;
const HEART_ICON_SIZE = 17;

export function ProductImage({ images, mode, name, isFavorite: iF }: Props) {
  const { theme, authTokens, isAuthenticated } = useGlobalContext();
  const { saveFavorite, deleteFavorite } = useSaved();
  const isDarkMode = theme === "dark";
  const navigation = useNavigation();
  const [isFavorite, setIsFavorite] = useState(iF ?? false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const lottieRef = useRef<Lottie>(null);
  const queryClient = useQueryClient();

  const renderCarouselItem = ({ item }: { item: any }) => (
    <Image
      source={item}
      style={{ width: "100%", height: "100%" }}
      contentFit="contain"
    />
  );

  const saveFavoriteMutation = useMutation(saveFavorite, {
    onSuccess: () => {
      queryClient.invalidateQueries("favorites");
    },
  });

  const deleteFavoriteMutation = useMutation(deleteFavorite, {
    onSuccess: () => {
      queryClient.invalidateQueries("favorites");
    },
  });

  useEffect(() => {
    if (isFavorite) lottieRef.current?.play();
  }, [isFavorite]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      Toast.show({
        type: "customToast",
        position: "bottom",
        text1: "Sign in to Renit to favorite products",
        text2: "error",
      });
      return;
    }

    try {
      if (isFavorite) {
        await deleteFavoriteMutation.mutateAsync(name!);
      } else {
        await saveFavoriteMutation.mutateAsync(name!);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("Error handling favorite:", error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StyledView
        className={`h-full w-full p-6 ${isDarkMode ? "bg-black" : ""}`}
      >
        {mode === "post" ? (
          ""
        ) : (
          <StyledView className="flex flex-row items-center justify-between">
            <StyledButton
              style={styles.Shadow}
              onPress={() => navigation.goBack()}
              className={`p-3 border ${
                isDarkMode
                  ? "bg-[#1A1A1A] border-[#4e4e4e]"
                  : "bg-white border-[#f5f5f5]"
              } rounded-full`}
            >
              <ArrowLeftIcon
                size={wp("5%")}
                color={isDarkMode ? "#FFF" : "#000"}
              />
            </StyledButton>

            <StyledButton
              style={styles.Shadow}
              onPress={handleLike}
              className={`p-3 border ${
                isDarkMode
                  ? "bg-[#1A1A1A] border-[#4e4e4e]"
                  : "bg-white border-[#f5f5f5]"
              } rounded-full`}
            >
              <HI
                size={24}
                color={isFavorite ? "" : "white"}
                fill={isFavorite ? "#FF3B30" : "#1E1E1E70"}
              />
              {isFavorite && (
                <View
                  className="absolute top-2 bg-transparent left-2"
                  style={{ width: HEART_ICON_SIZE, height: HEART_ICON_SIZE }}
                >
                  <Lottie
                    ref={lottieRef}
                    // source={require("./like.json")}
                    source={require("../core/like.json")}
                    style={[
                      styles.lottie,
                      {
                        width: wp(8),
                        height: wp(8),
                      },
                    ]}
                    autoPlay={false}
                    loop={false}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={handleLike}
                    style={styles.invisibleFloatingBTN}
                  />
                </View>
              )}
            </StyledButton>
          </StyledView>
        )}

        <StyledView className="flex-1 items-center justify-center mt-3">
          <Carousel
            style={{
              alignItems: "center",
              height: "100%",
              justifyContent: "center",
            }}
            loop
            width={SCREEN_WIDTH + wp("10%")}
            height={SCREEN_WIDTH - hp("10%")}
            data={images}
            renderItem={renderCarouselItem}
            onSnapToItem={(index) => setCurrentIndex(index)}
            mode="parallax"
            modeConfig={{
              parallaxScrollingScale: 0.9,
              parallaxScrollingOffset: 50,
            }}
          />
          <StyledView className="flex-row justify-center mt-3">
            {images.map((_, index) => (
              <StyledView
                key={index}
                className={`w-10 h-1 rounded-lg ${
                  index === currentIndex
                    ? "bg-[#4B46B4]"
                    : isDarkMode
                    ? "bg-[#292929]"
                    : "bg-[#E6E6E6]"
                }`}
              />
            ))}
          </StyledView>
        </StyledView>
      </StyledView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  Shadow: {
    shadowColor: "#808080",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  lottie: {
    resizeMode: "cover",
    transform: [{ scale: 2.3 }],
  },
  invisibleFloatingBTN: {
    width: 20,
    height: 20,
    position: "absolute",
    left: 6,
    top: 5,
  },
});
