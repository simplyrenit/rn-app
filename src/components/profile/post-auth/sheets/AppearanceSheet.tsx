import { SheetHeader, Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/outline";
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

// Sheet · Appearance (2096:28163): the kit Sheet header (21 grabber, drawn by the modal, + 44 title row + 8), then
// three 56 rows (label at x24, the selected one SemiBold with an outline check 20 at x346) and no rules. 21 + 52 + 168
// = 241; the frame's 42 home strip is the safe-area inset, added where it is used.
const ROW_HEIGHT = 56;
const SHEET_HEIGHT = 241;

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
        <SheetHeader
          title="Appearance"
          grabber={false}
          onClose={() => bottomSheetModalRef.current?.dismiss()}
        />

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
              <Text fontSize="text-md" fontWeight={selected ? "font-semibold" : "font-medium"}>
                {option.label}
              </Text>
              {selected && <CheckIcon size={20} color={color.brandText} strokeWidth={1.5} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </CustomBottomSheetModal>
  );
};

export default AppearanceSheet;
