import { useGlobalContext } from "@/context/global-context";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { RocketLaunchIcon } from "react-native-heroicons/solid";
import { Text } from "../core";
import { ChevronRightIcon } from "react-native-heroicons/outline";
import { useTypedNavigation } from "@/lib/types";

export function Disclaimer({ mb }: { mb?: number }) {
  const { theme } = useGlobalContext();
  const router = useTypedNavigation();

  const onPress = () => {
    router.navigate("unavailabilityFormCategories");
  };

  return (
    <View
      className={`border ${theme === "dark"
          ? "bg-[#201E4D] border-[#363280]"
          : "bg-[#EDEDFC] border-[#CAC8F7] "
      } rounded-xl p-4 shadow-sm mt-8 mb-24`}
      style={mb !== undefined ? { marginBottom: mb } : undefined}
    >
      <View className="flex-row items-start mb-1">
        <View
          className={`border ${theme === "dark"
              ? "bg-black border-[#292929]"
              : "bg-white border-[#E6E6E6]"
            } p-2 rounded-lg mr-2`}
        >
          <RocketLaunchIcon
            size={24}
            color={theme === "dark" ? "white" : "#635be8"}
          />
        </View>

        <View className="flex w-full space-y-1">
          <Text
            fontSize="text-base"
            fontWeight="font-bold"
          >
            Don't see what you need?
          </Text>
          <View className="mt-1 mb-2 w-[80%]">
            <Text
              fontSize="text-md"
              className={`${theme === "dark" ? "text-[#FFFFFFB2]" : "text-[#000000B2]"
                }`}
            >
              Request a product & we'll do our best to get it on Renit for you!
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={onPress}
        className="bg-brand-blue py-3 px-4 rounded-lg flex-row items-center justify-center"
      >
        {/* <View className="flex-row items-center"> */}
        <Text
          fontWeight="font-bold"
          className="text-white mr-1 -translate-y-[1px]"
        >
          Unavailability form
        </Text>
        {/* <View className="flex-row items-center bg-red-500"> */}
        <ChevronRightIcon
          size={16}
          // strokeWidth={3}
          color="white"
        />
        {/* </View> */}
        {/* </View> */}
      </TouchableOpacity>
    </View>
  );
}
