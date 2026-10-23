import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import Toast from "react-native-toast-message";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckIcon,
} from "react-native-heroicons/solid";
import { Text } from "./text";

export type ToastSeverity = "success" | "error" | "warning" | "info" | "neutral";

export interface ToastAction {
  label: string;
  onPress: () => void;
}

// The legacy `text2` sniff knows only the four it always knew.
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
  props?: { severity?: ToastSeverity; action?: ToastAction };
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
  const { width: screenWidth } = useWindowDimensions();
  const legacy = splitLegacyToastProps(text2);
  const severity = props?.severity ?? legacy.severity;
  const message = legacy.message;
  const action = props?.action;

  // The Figma success toast: a brand-tint pill on the 24 gutter with a brand
  // check tile. Only a success toast without a second line takes it — the other
  // severities, and a success that carries a message, keep the semantic palette
  // below until the designer ships one for them.
  if (severity === "success" && !message && !action) {
    return (
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={text1}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          width: screenWidth - 2 * SCREEN_GUTTER,
          padding: 8,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: color.brandPanelLine,
          backgroundColor: color.brandPanel,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.brand,
          }}
        >
          <CheckIcon size={24} color={color.onBrand} />
        </View>
        <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
          {text1}
        </Text>
      </View>
    );
  }

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
    // A change that can be undone is not news in any tone: the bar is the hairline.
    neutral: { accent: color.line, wash: color.surfaceRaised, Icon: CheckIcon },
  };

  const { accent, wash, Icon } = palette[severity];

  return (
    <View
      // One element to VoiceOver, unless it holds an action, which has to stay reachable.
      accessible={!action}
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

      {action ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={12}
          onPress={() => {
            Toast.hide();
            action.onPress();
          }}
        >
          <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
            {action.label}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
