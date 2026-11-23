import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { Button } from "./button";
import { Text } from "./text";

interface Props {
  /**
   * A heroicon element in the colour it should draw in. It is drawn at the
   * kit's 32 whatever size the call site passes (they predate the kit's 32).
   */
  icon?: React.ReactNode;
  title: string;
  /** One sentence explaining what will fill this space, or what went wrong. */
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * A quieter second way out — "Maybe later", "Browse instead". Rendered as a
   * ghost button under the primary action, so the two never compete.
   */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /** `error` tints the icon chip with the danger colour. */
  variant?: "empty" | "error";
  /**
   * The action's weight. Default `tonal`, the kit's Secondary tonal 44; pass
   * `primary` on a screen that has no other filled button.
   */
  actionTone?: "tonal" | "primary";
  /** Kept for back-compat; the kit pads every empty state 24 top and bottom. */
  compact?: boolean;
}

const ICON = 32;
const CIRCLE = 80;

/**
 * The app's single empty/error state.
 *
 * Every list that can come back with nothing renders this — including lists that
 * failed, which previously showed a heading over blank space and were therefore
 * indistinguishable from a list that had simply loaded nothing.
 */
export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = "empty",
  actionTone = "tonal",
}: Props) {
  const { color } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={body ? `${title}. ${body}` : title}
      style={{
        alignItems: "center",
        justifyContent: "center",
        // Kit Empty state (figma/00 2074:14392): 24 above and below, 16
        // between the circle, the words and the action.
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: 24,
        gap: 16,
      }}
    >
      {icon ? (
        <View
          style={{
            width: CIRCLE,
            height: CIRCLE,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              variant === "error" ? color.dangerWash : color.brandPanel,
          }}
        >
          {React.isValidElement<{ size?: number }>(icon)
            ? React.cloneElement(icon, { size: ICON })
            : icon}
        </View>
      ) : null}

      <View style={{ alignSelf: "stretch", gap: 4 }}>
        <Text
          fontSize="text-base"
          fontWeight="font-bold"
          style={{ textAlign: "center" }}
        >
          {title}
        </Text>

        {body ? (
          <Text fontSize="text-sm" tone="body" style={{ textAlign: "center" }}>
            {body}
          </Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        // The action hugs its label, as the kit draws it, rather than
        // stretching to a minimum width.
        <View style={{ alignItems: "center", gap: 4 }}>
          {actionTone === "primary" ? (
            <Button size="compact" onPress={onAction}>
              {actionLabel}
            </Button>
          ) : (
            <Button
              variant="outline"
              tone="tonal"
              size="compact"
              onPress={onAction}
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction ? (
            <Button variant="ghost" onPress={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
