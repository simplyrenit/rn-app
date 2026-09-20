import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppearanceSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
}

// The frame's wording and order: the device setting first, then dark, then light.
const OPTIONS = [
  { value: "device", label: "Use my device settings" },
  { value: "dark", label: "Dark mode" },
  { value: "light", label: "Light mode" },
] as const;

// Measured off the Figma sheet: a 44pt header holding a centred 18pt title, then
// three 56pt rows (24 side padding, 16 above and below), with no rules between
// them. 44 + 3 x 56 = 212, plus the 37pt grabber row; the safe-area inset is added
// where it is used, because the frame draws the home indicator outside the sheet.
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 56;
const SHEET_HEIGHT = 249;

const AppearanceSheet: React.FC<AppearanceSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
}) => {
  const { themePreference, setTheme } = useGlobalContext();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <CustomBottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={[SHEET_HEIGHT + insets.bottom]}
      frame
      isDark={isDarkMode}
    >
      <View>
        <View
          style={{
            height: HEADER_HEIGHT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            accessibilityRole="header"
            fontSize="text-base"
            fontWeight="font-bold"
          >
            Appearance
          </Text>
        </View>

        {OPTIONS.map((option) => {
          const selected = themePreference === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              // The frame's 56pt row: comfortably over the 44pt floor, in a sheet
              // whose whole job is three choices. No rules between rows.
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                minHeight: ROW_HEIGHT,
                paddingHorizontal: SCREEN_GUTTER,
              }}
              onPress={() => {
                selectionFeedback();
                setTheme(option.value);
              }}
            >
              <Text fontSize="text-md" fontWeight="font-bold">
                {option.label}
              </Text>
              {selected && <CheckIcon size={20} color={color.brandText} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </CustomBottomSheetModal>
  );
};

export default AppearanceSheet;
