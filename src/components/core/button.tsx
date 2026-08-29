import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { tapFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "./text";

type ButtonVariant = "primary" | "outline" | "warning" | "ghost";
type ButtonSize = "default" | "compact";

interface Props extends React.ComponentProps<typeof TouchableOpacity> {
  className?: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Shows a spinner beside the label and blocks further presses. Use this for
   * anything that makes a network call — an un-disabled button with a spinner
   * on it can still be double-tapped, which is how duplicate chats get created.
   */
  loading?: boolean;
  /** Suppress the light impact fired on press. */
  haptic?: boolean;
}

/**
 * The app's one button.
 *
 * Two things it deliberately does differently from the version it replaces:
 *
 *  - It only wraps `children` in a `<Text>` when they are text. Previously every
 *    child was wrapped, so an icon-plus-label button nested a `<View>` inside a
 *    `<Text>` and needed hand-tuned vertical offsets to sit on the baseline.
 *  - Its own colours are applied as style, not className, so a caller passing
 *    `className="bg-surface-light"` overrides the variant instead of producing a class
 *    string containing two backgrounds and hoping the right one wins.
 */
export function Button({
  children,
  className = "",
  style,
  variant = "primary",
  size = "default",
  disabled,
  loading = false,
  haptic = true,
  onPress,
  accessibilityLabel,
  ...props
}: Props) {
  const { color, isDark } = useTheme();
  const isBlocked = Boolean(disabled) || loading;

  const container: ViewStyle = (() => {
    const base: ViewStyle = {
      minHeight: size === "compact" ? 36 : MIN_TOUCH_TARGET,
      paddingHorizontal: 16,
      paddingVertical: size === "compact" ? 6 : 11,
      borderRadius: radius.button,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    };

    // One disabled treatment for the whole app: a neutral fill, never the brand
    // held at reduced opacity.
    //
    // The previous version composited the brand at 40% and left the label pure
    // white, which measured 1.82:1 — and, worse for the customer, still read as
    // a live button, so people tapped it and nothing happened. It also meant a
    // disabled button on a transparent parent let the page show straight
    // through it; that is what made the date picker's Confirm unreadable.
    if (isBlocked) {
      return {
        ...base,
        backgroundColor: color.surfaceRaised,
        borderWidth: 1,
        borderColor: color.line,
      };
    }

    switch (variant) {
      case "outline":
        return {
          ...base,
          backgroundColor: color.surface,
          borderWidth: 1,
          borderColor: color.inputLine,
        };
      case "warning":
        return { ...base, backgroundColor: color.danger };
      case "ghost":
        return { ...base, backgroundColor: "transparent" };
      case "primary":
      default:
        return { ...base, backgroundColor: color.brand };
    }
  })();

  // 4.53:1 on the light disabled fill, 4.12:1 on the dark one — and at 16pt
  // bold both clear the 3:1 large-text threshold comfortably.
  const labelColor = isBlocked
    ? color.textDim
    : variant === "primary" || variant === "warning"
    ? "#FFFFFF"
    : color.text;

  const handlePress = (event: GestureResponderEvent) => {
    if (isBlocked) return;
    if (haptic) tapFeedback();
    onPress?.(event);
  };

  const isTextChild =
    typeof children === "string" || typeof children === "number";

  return (
    <TouchableOpacity
      className={className}
      style={[container, style]}
      disabled={isBlocked}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      accessibilityLabel={
        accessibilityLabel ?? (isTextChild ? String(children) : undefined)
      }
      activeOpacity={0.85}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={labelColor}
          style={{ marginRight: 8 }}
        />
      )}
      {isTextChild ? (
        <Text
          fontWeight="font-bold"
          fontSize="text-md"
          style={{ color: labelColor, textAlign: "center" }}
        >
          {children}
        </Text>
      ) : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </View>
      )}
    </TouchableOpacity>
  );
}

/** Colour a caller should use for content it renders inside a Button. */
export function useButtonLabelColor(variant: ButtonVariant = "primary") {
  const { color } = useTheme();
  return variant === "primary" || variant === "warning" ? "#FFFFFF" : color.text;
}
