import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";

interface AppearanceSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
}

const OPTIONS = [
  { value: "device", label: "Match my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

const AppearanceSheet: React.FC<AppearanceSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
}) => {
  const { themePreference, setTheme } = useGlobalContext();
  const { color } = useTheme();

  return (
    <CustomBottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={["34%"]}
      isDark={isDarkMode}
    >
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 24 }}>
        <Text
          accessibilityRole="header"
          fontSize="text-lg"
          fontWeight="font-bold"
          style={{ marginBottom: 12 }}
        >
          Appearance
        </Text>

        {OPTIONS.map((option, index) => {
          const selected = themePreference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              // Rows were 36pt tall and 33pt apart — the tightest targets in
              // the app, in a sheet whose whole job is three choices.
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                minHeight: MIN_TOUCH_TARGET + 8,
                borderBottomWidth: index === OPTIONS.length - 1 ? 0 : 1,
                borderBottomColor: color.line,
              }}
              onPress={() => {
                selectionFeedback();
                setTheme(option.value);
              }}
            >
              <Text fontSize="text-md">{option.label}</Text>
              {selected && <CheckIcon size={20} color={color.brandText} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </CustomBottomSheetModal>
  );
};

export default AppearanceSheet;
