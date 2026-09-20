import { darkColors } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { NavigationContext } from "@react-navigation/native";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ArrowLeftIcon } from "react-native-heroicons/outline";
import { IconButton } from "./icon-button";

interface Props {
  /** Defaults to popping the current screen. */
  onPress?: () => void;
  /** Override only when "Go back" would be wrong — e.g. "Close". */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Glyph size. The hit area stays 44pt regardless. */
  size?: number;
  /** Set when the control floats over photography rather than a surface. */
  onPhoto?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const GLYPH_SIZE = 24;

/**
 * The back affordance, in one place.
 *
 * Thirty-three of the app's forty back buttons were a bare `TouchableOpacity`
 * wrapping a 20–26pt arrow with no `hitSlop`, so the thing a customer taps most
 * often on every pushed screen was roughly half Apple's 44pt floor — and the
 * treatment drifted screen to screen. This delegates to `IconButton`, which
 * makes the shortfall up in hit area, so the arrow can stay visually light.
 */
export function BackButton({
  onPress,
  accessibilityLabel = "Go back",
  accessibilityHint = "Returns to the previous screen",
  size = GLYPH_SIZE,
  onPhoto = false,
  disabled = false,
  style,
}: Props) {
  // Read from the context rather than `useNavigation`, which throws outside a
  // navigator: a bottom sheet renders in a portal above the container, and the
  // chat sheets pass their own `onPress`, so they never need it.
  const navigation = React.useContext(NavigationContext);
  const { color } = useTheme();

  return (
    <IconButton
      onPress={onPress ?? (() => navigation?.goBack())}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      scrim={onPhoto}
      // Over a photo the chip is the visible control, so it takes the compact
      // 40pt diameter the hero already uses; on a surface the touchable fills
      // its own 44pt box.
      size={onPhoto ? 40 : undefined}
      style={style}
    >
      {/* White on the scrim chip, which is dark in both themes. */}
      <ArrowLeftIcon size={size} color={onPhoto ? darkColors.text : color.text} />
    </IconButton>
  );
}
