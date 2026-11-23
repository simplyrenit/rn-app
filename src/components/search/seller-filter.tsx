import { AppSwitch } from "@/components/core/switch";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { Pressable, View } from "react-native";
import { ShieldCheckIcon } from "react-native-heroicons/outline";
import { Text } from "../core";

interface Props {
  verifiedOnly: boolean;
  onToggle: (on: boolean) => void;
}

/**
 * The "Verified businesses only" switch (D-26, ENG-73). The whole row toggles it.
 * 2089:35398: a 24 outline shield, Medium 16/24 over 14/20 at 60%, the kit switch.
 */
export function SellerFilter({ verifiedOnly, onToggle }: Props) {
  const { color } = useTheme();
  const toggle = (on: boolean) => {
    selectionFeedback();
    onToggle(on);
  };

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: verifiedOnly }}
      accessibilityLabel="Verified businesses only"
      accessibilityHint="Only show listings from businesses Renit has verified"
      onPress={() => toggle(!verifiedOnly)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: MIN_TOUCH_TARGET,
        marginVertical: 16,
        marginHorizontal: SCREEN_GUTTER,
      }}
    >
      <ShieldCheckIcon size={24} strokeWidth={1.5} color={color.text} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-medium">
          Verified businesses only
        </Text>
        <Text fontSize="text-sm" tone="dim">
          Only show listings from businesses Renit has verified.
        </Text>
      </View>
      {/* The row is the control for screen readers; the switch is its picture. */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppSwitch
          value={verifiedOnly}
          onValueChange={toggle}
          trackColor={{ true: color.brand, false: color.line }}
          // iOS fills the off track from this, not from trackColor.false.
          ios_backgroundColor={color.line}
        />
      </View>
    </Pressable>
  );
}
