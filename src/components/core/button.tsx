import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { tapFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React, { createContext, useContext } from "react";
import {
  ActivityIndicator,
  GestureResponderEvent,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Text } from "./text";
import { usePressFeedback } from "./use-press-feedback";

type ButtonVariant = "primary" | "outline" | "warning" | "ghost";
type ButtonSize = "default" | "compact";

/**
 * The foreground colour a live `Button` has already resolved for its own
 * label — theme, variant and (crucially) disabled state all folded in. Custom
 * `children` read it via `useButtonLabelColor` instead of re-deriving the same
 * three inputs at the call site, which is how the disabled-label colour ended
 * up wrong in more than one place at once: every call site was allowed to
 * invent its own answer.
 */
const ButtonForegroundContext = createContext<string | null>(null);

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
  onPressIn,
  onPressOut,
  accessibilityLabel,
  ...props
}: Props) {
  const { color, isDark } = useTheme();
  const isBlocked = Boolean(disabled) || loading;
  const feedback = usePressFeedback({ disabled: isBlocked });

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
  //
  // `warning` cannot share `primary`'s `onBrand` label: `danger` is a deep red
  // on light (#B3261E) and a light salmon on dark (#EB6F62). White clears AA
  // on the first (6.6:1) and fails it on the second (3.0:1). There is no
  // `onDanger` token yet — design-tokens.ts is frozen this phase — so this
  // derives the label from the two tokens that already exist: dark canvas
  // reads at 6.3:1 on the salmon fill, which is the same derivation
  // `unavailability-editor.tsx` already uses for the calendar's danger marks,
  // now shared here instead of staying a second, undiscoverable answer to the
  // same problem.
  const labelColor = isBlocked
    ? color.textDim
    : variant === "warning"
    ? isDark
      ? color.canvas
      : color.onBrand
    : variant === "primary"
    ? color.onBrand
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
      style={[container, style, feedback.pressStyle]}
      // Chained rather than replaced, so a call site that needs its own
      // press-in handler does not silently lose the shared feedback.
      onPressIn={(event) => {
        feedback.onPressIn();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        feedback.onPressOut();
        onPressOut?.(event);
      }}
      disabled={isBlocked}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked, busy: loading }}
      accessibilityLabel={
        accessibilityLabel ?? (isTextChild ? String(children) : undefined)
      }
      // The dip is ours now, from `usePressFeedback`; TouchableOpacity's own
      // fade would double it. A caller can still override via props.
      activeOpacity={1}
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
        <ButtonForegroundContext.Provider value={labelColor}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {children}
          </View>
        </ButtonForegroundContext.Provider>
      )}
    </TouchableOpacity>
  );
}

/**
 * Colour a caller should use for content it renders inside a `Button` — an
 * icon beside the label, a custom spinner, anything that isn't the plain-text
 * child `Button` already colours itself.
 *
 * Called from inside a live `Button`'s children, this reads the exact colour
 * that `Button` already resolved for its own label, so it is automatically
 * right for the current theme, variant *and* disabled state without the
 * caller re-deriving any of the three. That was the actual bug this fixes:
 * every non-text `Button` child that hand-picked its own colour handled
 * `disabled` differently (or not at all), so a disabled CTA's icon could stay
 * full-strength while its label vanished, or vice versa.
 *
 * Called with no `Button` above it in the tree, it falls back to the same
 * variant-only defaults it always returned, for the few call sites that use
 * it as a standalone lookup (e.g. to colour something that sits beside a
 * `Button` rather than inside one). That path cannot know about `disabled`,
 * so it does not attempt to.
 */
export function useButtonLabelColor(variant: ButtonVariant = "primary") {
  const { color, isDark } = useTheme();
  const fromButton = useContext(ButtonForegroundContext);
  if (fromButton !== null) return fromButton;
  if (variant === "warning") return isDark ? color.canvas : color.onBrand;
  return variant === "primary" ? color.onBrand : color.text;
}
