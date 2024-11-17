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
  const { theme, setTheme } = useGlobalContext();

  return (
    <CustomBottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={["30%", "50%"]}
      isDark={isDarkMode}
    >
      <View className="flex items-center my-4">
        <Text fontSize="text-xl" fontWeight="font-bold">
          Appearance
        </Text>
      </View>
      <View className="p-4">
        <TouchableOpacity
          className="flex-row justify-between pb-3"
          onPress={() => setTheme("device")}
        >
          <Text fontSize="text-base">Use my device settings</Text>
          {theme === "device" && <CheckIcon size={24} color="#635BE8" />}
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={() => setTheme("dark")}
        >
          <Text fontSize="text-base">Dark mode</Text>
          {theme === "dark" && <CheckIcon size={24} color="#635BE8" />}
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={() => setTheme("light")}
        >
          <Text fontSize="text-base">Light Mode</Text>
          {theme === "light" && <CheckIcon size={24} color="#635BE8" />}
        </TouchableOpacity>
      </View>
    </CustomBottomSheetModal>
  );
};

export default AppearanceSheet;
