import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { tapFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";

interface CheckBoxProps {
  checked: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * A 20pt box inside a 44pt target. The box used to be the whole control, which
 * put the app's consent checkbox 24pt under Apple's minimum.
 */
export const CheckBox: React.FC<CheckBoxProps> = ({
  checked,
  onPress,
  accessibilityLabel,
}) => {
  const { color } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? "Checkbox"}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{
        width: MIN_TOUCH_TARGET,
        height: MIN_TOUCH_TARGET,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: -12,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.button,
          borderWidth: 1.5,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: checked ? color.brand : "transparent",
          borderColor: checked ? color.brand : color.inputLine,
        }}
      >
        {checked && <CheckIcon size={15} color="#FFFFFF" />}
      </View>
    </TouchableOpacity>
  );
};
