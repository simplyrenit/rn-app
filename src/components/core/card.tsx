import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import Lottie from "lottie-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { HeartIcon as HI } from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Text } from "./text";
import { useGlobalContext } from "@/context/global-context";
import useSaved from "@/backend/useSaved";
import Toast from "react-native-toast-message";
import { useMutation, useQueryClient } from "react-query";

const HEART_ICON_SIZE = 17;

export function Card({
  image = null,
  title,
  location,
  price,
  id,
  isFavorite: checked,
  width,
  alignItems
}: ItemCard) {
  const [toggleLike, setToggleLike] = useState(checked);
  const queryClient = useQueryClient();
  const { saveFavorite, deleteFavorite } = useSaved();

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

  const router = useTypedNavigation();
  const { theme, authTokens, isAuthenticated } = useGlobalContext();
  const isDark = theme === "dark";
  const lottieRef = useRef<any>();

  useEffect(() => {
    if (toggleLike) lottieRef.current.play();
  }, [toggleLike]);

  useEffect(() => {
    setToggleLike(checked);
  }, [checked]);

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
      if (toggleLike) {
        await deleteFavoriteMutation.mutateAsync(id);
      } else {
        await saveFavoriteMutation.mutateAsync(id);
      }
      setToggleLike(!toggleLike);
    } catch (error) {
      console.error("Error handling favorite:", error);
    }
  };

  const truncateText = (text: string, maxWidth: number) => {
    const maxChars = Math.floor(maxWidth / 10); // Assuming average character width
    return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
  };

  const cardWidth = wp("41.5%") > 163 ? 163 : wp("41.5%");
  const truncatedName = truncateText(title || "Loading...", cardWidth);
  const truncatedLocation = truncateText(location || "Loading...", cardWidth);

  return (
    <TouchableOpacity
      id={id}
      onPress={() =>
        router.navigate("ProductDetail", { id, isFavorite: toggleLike })
      }
      style={{ width, alignItems }}
    >
      <View
        style={{
          width: cardWidth,
          borderRadius: 8,
        }}
        className="mb-4 mr-1"
      >
        <View className="relative">
          {image ? (
            <Image
              style={{
                width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
                height: wp("44.5%"),
                borderRadius: 8,
              }}
              source={{ uri: image }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
                height: wp("44.5%"),
                borderRadius: 8,
                backgroundColor: "#f0f0f0",
              }}
            />
          )}

          <View className="flex flex-row absolute top-1 items-center justify-end right-1 p-2 rounded-full">
            <TouchableOpacity onPress={handleLike}>
              <HI
                size={24}
                color={toggleLike ? "white" : "white"}
                fill={toggleLike ? "#FF3B30" : "#1E1E1E70"}
              />
            </TouchableOpacity>

            {toggleLike && (
              <View
                className="absolute bg-transparent left-3"
                style={{ width: HEART_ICON_SIZE, height: HEART_ICON_SIZE }}
              >
                <Lottie
                  ref={lottieRef}
                  source={require("./like.json")}
                  style={[
                    styles.lottie,
                    { width: HEART_ICON_SIZE, height: HEART_ICON_SIZE },
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
          </View>
        </View>
        <View className="mt-2">
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className="mb-1"
            fontWeight="font-bold"
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            className={`mb-1 ${
              isDark ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
            }`}
          >
            {location}
          </Text>
          <View className="flex flex-row items-center">
            <Text
              fontSize="text-base"
              fontWeight="font-bold"
            >
              ₹{Number(price).toFixed(0)}
            </Text>
            <Text className="text-gray-500 ml-1">per day</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  lottie: {
    resizeMode: "cover",
    transform: [{ scale: 2.3 }],
  },
  invisibleFloatingBTN: {
    width: 20,
    height: 20,
    position: "absolute",
    left: 7,
    top: 5,
  },
});
