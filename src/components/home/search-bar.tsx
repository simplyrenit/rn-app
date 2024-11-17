import { useGlobalContext } from "@/context/global-context";
import { useTypedNavigation } from "@/lib/types";
import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { MagnifyingGlassIcon } from "react-native-heroicons/outline";
import { Text } from "../core";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { DarkIcon, LightIcon } from "@/icons/logo";

export function SearchBar() {
  const { theme } = useGlobalContext();
  const isDark = theme === "dark";
  const router = useTypedNavigation();

  const styles = StyleSheet.create({
    Shadow: {
      shadowColor: isDark ? "#0000001F" : "#808080",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.35,
      shadowRadius: 4,
      elevation: 5,
    },
  });

  return (
    <TouchableOpacity
      className={`flex flex-row border-t border-l border-r items-center shadow-lg ${
        theme === "dark"
          ? "bg-[#0F0F0F] border-b border-[#292929]"
          : "bg-white border-[#E6E6E6]"
      } rounded-xl p-2 mt-4 w-[90%] self-center mb-3`}
      style={[styles.Shadow, { height: wp(12.2) > 48 ? 48 : wp(12.2) }]}
      onPress={() => router.navigate("Search")}
    >
      <View className="w-[10%] h-full items-center justify-center">
        <MagnifyingGlassIcon
          size={24}
          color={theme === "dark" ? "#FFFFFFB2" : "#000000B2"}
          strokeWidth={2}
        />
      </View>
      <View className="w-[80%] flex flex-row items-center justify-center h-full">
        <Text
          fontSize="text-base"
          className={`${
            theme === "dark" ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
          }`}
        >
          Search on{" "}
        </Text>

        <View className="mx-1">
          {isDark ? (
            <DarkIcon size={24} color="#635be8" />
          ) : (
            <LightIcon size={24} color="#635be8" />
          )}
        </View>
        <Text
          fontSize="text-base"
          className={` 
            ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Renit
        </Text>
      </View>
      <View className="w-[10%] h-full items-center justify-center"></View>
    </TouchableOpacity>
  );
}
