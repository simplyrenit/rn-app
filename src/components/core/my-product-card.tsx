import { useGlobalContext } from "@/context/global-context";
import { ItemCard, useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import {
  InformationCircleIcon,
  PencilSquareIcon,
} from "react-native-heroicons/outline";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Text } from "./text";

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
};

export function MyProductCard({
  image,
  title,
  location,
  price,
  id,
  isDarkMode,
  moderationLabels = [],
}: ItemCard) {
  const router = useTypedNavigation();
  const { theme } = useGlobalContext();

  const truncatedname = truncateText(title ? title : "", 22);
  const truncatedLocation = truncateText(location ? location : "", 30);

  const isModerated = moderationLabels?.length > 0;

  return (
    <View className="py-2">
      <View className="justify-center">
        <View className="rounded-xl overflow-hidden mb-4 ">
          <View
            className="item-center justify-center"
            style={{
              width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
            }}
          >
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
            {isModerated && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
                  height: wp("44.5%"),
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 8,
                }}
              >
                <InformationCircleIcon size={24} color="red" />
                <Text fontWeight="font-bold" className="text-red-500 mt-3">
                  Product Flagged
                </Text>
              </View>
            )}
          </View>
          <View className="mt-2">
            <Text fontWeight="font-bold" className="mb-1">
              {truncatedname}
            </Text>
            <Text
              className={`mb-1 ${
                isDarkMode ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
              }`}
            >
              {truncatedLocation}
            </Text>
            <View className="flex flex-row items-center">
              <Text fontSize="text-base" fontWeight="font-bold">
                ₹{Number(price).toFixed(0)}
              </Text>
              <Text
                className={`ml-1 ${
                  isDarkMode ? "text-[#FFFFFF80]" : "text-[#00000080]"
                }`}
              >
                per day
              </Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        id={id}
        onPress={() => router.navigate("editProduct", { id: id })}
        style={{
          width: wp("41.5%") > 163 ? 163 : wp("41.5%"),
        }}
        className={`${
          theme === "dark"
            ? "bg-[#1A1A1A] border-[#292929]"
            : "bg-white border-[#e6e6e6]"
        } flex-row justify-center items-center border rounded-2xl py-3 px-6`}
      >
        <View className="mr-2">
          <PencilSquareIcon size={22} color={isDarkMode ? "white" : "black"} />
        </View>
        <Text fontSize="text-sm" fontWeight="font-bold">
          Edit
        </Text>
      </TouchableOpacity>
    </View>
  );
}
