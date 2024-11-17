import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";

interface AppearanceSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
}

export const CurrencySheet: React.FC<AppearanceSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
}) => {
  return (
    <CustomBottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={["40%"]}
      isDark={isDarkMode}
    >
      <View className="flex items-center my-4">
        <Text fontSize="text-xl" fontWeight="font-bold">
          Currency
        </Text>
      </View>
      <View className="p-4">
        <TouchableOpacity
          className="flex-row justify-between pb-3"
          onPress={() => {}}
        >
          <View className="flex-row items-center">
            <Text>{getUnicodeFlagIcon("IN")}</Text>
            <Text fontSize="text-md" fontWeight="font-bold" className="ml-2">
              Indian Rupee
            </Text>
          </View>
          <CheckIcon size={24} color="#635BE8" />
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={() => {}}
        >
          <View className="flex-row items-center">
            <Text>{getUnicodeFlagIcon("US")}</Text>
            <Text fontSize="text-md" fontWeight="font-bold" className="ml-2">
              US Dollar
            </Text>
          </View>
        </TouchableOpacity>

        {/* <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={() => {}}
        >
          <Text fontSize="text-base">Light Mode</Text>
          {/* {theme === "light" && <CheckIcon size={24} color="#635BE8" />} 
        </TouchableOpacity> */}
      </View>
    </CustomBottomSheetModal>
  );
};
