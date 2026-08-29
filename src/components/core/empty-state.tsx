import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { Button } from "./button";
import { Text } from "./text";

interface Props {
  /** A heroicon element, sized 28. */
  icon?: React.ReactNode;
  title: string;
  /** One sentence explaining what will fill this space, or what went wrong. */
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `error` tints the icon chip with the danger colour. */
  variant?: "empty" | "error";
  compact?: boolean;
}

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
  variant = "empty",
  compact = false,
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
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: compact ? 28 : 48,
        gap: 8,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.group,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 6,
            backgroundColor:
              variant === "error" ? color.dangerWash : color.brandWash,
          }}
        >
          {icon}
        </View>
      ) : null}

      <Text
        fontSize="text-lg"
        fontWeight="font-bold"
        style={{ textAlign: "center" }}
      >
        {title}
      </Text>

      {body ? (
        <Text
          fontSize="text-md"
          tone="body"
          style={{ textAlign: "center", maxWidth: 320 }}
        >
          {body}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <View style={{ marginTop: 12, minWidth: 180 }}>
          <Button
            variant={variant === "error" ? "outline" : "primary"}
            onPress={onAction}
          >
            {actionLabel}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
