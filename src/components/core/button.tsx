import {
  ColorTokens,
  MIN_TOUCH_TARGET,
  buttonShadow,
  radius,
} from "@/lib/design-tokens";
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

/**
 * The variant names predate the 2.1 kit and are kept so ~250 call sites still
 * compile; each now draws a kit button:
 *   primary → Primary, outline → Secondary (or tonal), ghost → Text,
 *   warning → Destructive (red label on a neutral button, never filled).
 */
export type ButtonVariant = "primary" | "outline" | "warning" | "ghost";
export type ButtonSize = "default" | "compact";
/**
 * `tonal` and `neutral` apply to `outline` only: the kit's #EDEDFC Secondary
 * with no edge, or the white Secondary with a #E6E6E6 edge and a black 14/20
 * label (the Home request card, 2083:15120; the sign-in and owner-profile
 * buttons). `brand` (default) and `muted` apply to `ghost` only: a purple link,
 * or the 70% black of the Confirm sheet's Cancel. Any other pairing is ignored.
 */
export type ButtonTone = "tonal" | "neutral" | "brand" | "muted";

interface ButtonLabelStyle {
  color: string;
  fontSize: "text-sm" | "text-md";
  fontWeight: "font-semibold" | "font-bold";
  lineHeight: number;
}

/**
 * Every number a `Button` draws, as plain data, from the 2.1 kit frames in
 * docs/renit-2.1-build/figma/00:
 *
 *  - Height is a `minHeight` with no vertical padding: a one-line label at the
 *    default text size draws exactly the kit's box — 52 default and 44 compact
 *    for every boxed variant, Destructive included — while a large accessibility
 *    text size or a two-line label grows the button instead of spilling out of a
 *    fixed `height`. A Text button is the library's 44 whatever the size (Bottom
 *    bar CTA+Text, 2109:30149). Destructive is 52 like its neighbours because
 *    several screens set it beside a 52 Secondary; the 56 of Sheet · Confirm
 *    destructive (2110:30387) is ConfirmSheet's own, passed through `style`.
 *  - Primary is r11 and the other boxes r12, as the kit draws them side by side.
 *  - Labels: Primary 16/24 SemiBold (14/20 compact); Secondary and Destructive
 *    14/21 (the library's 150%); tonal 14/20 (Empty state, 2074:14392) and
 *    neutral 14/20 black (Home request card, 2083:15120); Text and Destructive
 *    Bold, the rest SemiBold.
 *  - Disabled: only Primary changes fill — to #CAC8F7 with its white label, as
 *    SPEC asks. In dark that fill is #292929, where a full-white label reads as
 *    live, so the dark label drops to `textDim`. The others keep their box and
 *    drop the label to `textDim`, so a dead outline does not turn into a
 *    lavender bar that reads as tonal.
 */
export function resolveButtonStyle(
  {
    variant,
    size,
    tone,
    blocked,
  }: { variant: ButtonVariant; size: ButtonSize; tone?: ButtonTone; blocked: boolean },
  color: ColorTokens,
  isDark: boolean
): { container: ViewStyle; label: ButtonLabelStyle } {
  const compact = size === "compact";
  const ring = isDark ? buttonShadow.dark : buttonShadow.light;
  const base: ViewStyle = {
    minHeight: compact ? 44 : 52,
    paddingHorizontal: 20, // the hugging kit button (Empty state Action)
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  };
  const secondaryLabel: ButtonLabelStyle = {
    color: blocked ? color.textDim : color.brandText,
    fontSize: "text-sm",
    fontWeight: "font-semibold",
    lineHeight: 21,
  };

  switch (variant) {
    case "outline":
      if (tone === "neutral")
        return {
          container: {
            ...base,
            ...ring,
            backgroundColor: color.surface,
            borderWidth: 1,
            borderColor: color.line,
          },
          label: {
            ...secondaryLabel,
            color: blocked ? color.textDim : color.text,
            lineHeight: 20,
          },
        };
      return tone === "tonal"
        ? {
            container: { ...base, ...ring, backgroundColor: color.brandPanel },
            label: { ...secondaryLabel, lineHeight: 20 },
          }
        : {
            container: {
              ...base,
              ...ring,
              backgroundColor: color.surface,
              borderWidth: 1,
              borderColor: color.brandPanelLine,
            },
            label: secondaryLabel,
          };
    case "warning":
      return {
        container: {
          ...base,
          ...ring,
          backgroundColor: color.surface,
          borderWidth: 1,
          borderColor: color.line,
        },
        label: {
          ...secondaryLabel,
          color: blocked ? color.textDim : color.dangerStrong,
          fontWeight: "font-bold",
        },
      };
    case "ghost":
      return {
        // The library Text button hugs its label: no box, no inset, 44 tall.
        container: {
          ...base,
          minHeight: MIN_TOUCH_TARGET,
          paddingHorizontal: 0,
          backgroundColor: "transparent",
        },
        label: {
          ...secondaryLabel,
          color: blocked
            ? color.textDim
            : tone === "muted"
            ? color.textBody
            : color.brandText,
          fontWeight: "font-bold",
        },
      };
    case "primary":
    default:
      return {
        container: {
          ...base,
          borderRadius: radius.buttonPrimary,
          backgroundColor: blocked ? color.brandPanelLine : color.brand,
        },
        label: {
          color: blocked && isDark ? color.textDim : color.onBrand,
          fontSize: compact ? "text-sm" : "text-md",
          fontWeight: "font-semibold",
          lineHeight: compact ? 20 : 24,
        },
      };
  }
}

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
  /** See `ButtonTone`: `tonal` | `neutral` for `outline`, `brand` | `muted` for `ghost`. */
  tone?: ButtonTone;
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
  tone,
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

  // A loading button is blocked too, so it shows the disabled look while the
  // request runs — the same treatment, so a spinner never sits on a live control.
  const { container, label } = resolveButtonStyle(
    { variant, size, tone, blocked: isBlocked },
    color,
    isDark
  );
  const labelColor = label.color;

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
          fontWeight={label.fontWeight}
          fontSize={label.fontSize}
          lineHeight={label.lineHeight}
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
export function useButtonLabelColor(
  variant: ButtonVariant = "primary",
  tone?: ButtonTone
) {
  const { color, isDark } = useTheme();
  const fromButton = useContext(ButtonForegroundContext);
  if (fromButton !== null) return fromButton;
  return resolveButtonStyle(
    { variant, size: "default", tone, blocked: false },
    color,
    isDark
  ).label.color;
}
