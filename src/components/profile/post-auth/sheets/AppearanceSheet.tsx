import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import React from "react";
import { View, TouchableOpacity } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

interface AppearanceSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
}

const AppearanceSheet: React.FC<AppearanceSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
}) => {
  const { theme, themePreference, setTheme } = useGlobalContext();

  // Debugging: Log the current themePreference
  console.log("Current themePreference:", themePreference);

  return (
    <CustomBottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={["30%", "50%"]}
      isDark={isDarkMode}
    >
      <View className="flex items-center my-4">
        <Text
          fontSize="text-xl"
          fontWeight="font-bold"
        >
          Appearance
        </Text>
      </View>
      <View className="p-4">
        <TouchableOpacity
          className="flex-row justify-between pb-3"
          onPress={() => {
            setTheme("device");
            console.log("Set theme to device");
          }}
        >
          <Text fontSize="text-base">Use my device settings</Text>
          {themePreference === "device" && (
            <CheckIcon
              size={24}
              color="#635BE8"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={() => {
            setTheme("dark");
            console.log("Set theme to dark");
          }}
        >
          <Text fontSize="text-base">Dark mode</Text>
          {themePreference === "dark" && (
            <CheckIcon
              size={24}
              color="#635BE8"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={() => {
            setTheme("light");
            console.log("Set theme to light");
          }}
        >
          <Text fontSize="text-base">Light Mode</Text>
          {themePreference === "light" && (
            <CheckIcon
              size={24}
              color="#635BE8"
            />
          )}
        </TouchableOpacity>
      </View>
    </CustomBottomSheetModal>
  );
};

export default AppearanceSheet;
