import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from "react-native-heroicons/solid";
import { Text } from "./text";

export type ToastSeverity = "success" | "error" | "warning" | "info";

const SEVERITIES: ToastSeverity[] = ["success", "error", "warning", "info"];

/**
 * Older call sites pass the severity in `text2`, which is otherwise the toast's
 * second line. Sniff it so both conventions work: a `text2` of exactly
 * "success"/"error"/"warning"/"info" is a severity, anything else is a message.
 */
export function splitLegacyToastProps(text2?: string) {
  if (text2 && SEVERITIES.includes(text2 as ToastSeverity)) {
    return { severity: text2 as ToastSeverity, message: undefined };
  }
  return { severity: "info" as ToastSeverity, message: text2 };
}

interface ToastBodyProps {
  text1?: string;
  text2?: string;
  props?: { severity?: ToastSeverity };
}

/**
 * The app's toast surface.
 *
 * Two things it fixes over the version it replaces: it takes its colours from
 * the theme, so it is no longer the single light surface flashing over a dark
 * UI; and severity is carried by the whole surface rather than by a 24pt icon
 * chip, so an error actually reads as an error.
 */
export function ToastBody({ text1, text2, props }: ToastBodyProps) {
  const { color, shadow } = useTheme();
  const legacy = splitLegacyToastProps(text2);
  const severity = props?.severity ?? legacy.severity;
  const message = legacy.message;

  const palette: Record<
    ToastSeverity,
    { accent: string; wash: string; Icon: typeof CheckCircleIcon }
  > = {
    success: {
      accent: color.success,
      wash: color.successWash,
      Icon: CheckCircleIcon,
    },
    error: { accent: color.danger, wash: color.dangerWash, Icon: XCircleIcon },
    warning: {
      accent: color.warning,
      wash: color.warningWash,
      Icon: ExclamationTriangleIcon,
    },
    info: {
      accent: color.info,
      wash: color.infoWash,
      Icon: InformationCircleIcon,
    },
  };

  const { accent, wash, Icon } = palette[severity];

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message ? `${text1}. ${message}` : text1}
      style={[
        {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          width: "92%",
          padding: 14,
          borderRadius: radius.card,
          backgroundColor: color.surface,
          borderWidth: 1,
          borderColor: color.line,
          // A 4pt bar in the severity colour. The colour is the message here —
          // the icon alone is too small to change how the toast reads.
          borderLeftWidth: 4,
          borderLeftColor: accent,
        },
        shadow,
      ]}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.button,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: wash,
        }}
      >
        <Icon size={18} color={accent} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-semibold">
          {text1}
        </Text>
        {message ? (
          <Text fontSize="text-sm" tone="body">
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
