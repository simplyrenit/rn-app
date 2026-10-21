import { EmptyState, Skeleton, Text } from "@/components/core";
import { apiError } from "@/lib/api-error";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import {
  CameraIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The small pieces every booking screen is built from (BK-01 to BK-12): the
 * hairline card, the photo-and-three-lines summary, a line of money, a tinted
 * note, the pinned bottom bar and the loading and failed states. One file, so
 * the price screen, the wait and the booking screen cannot drift apart.
 */

/** The frames' card: a hairline, the card radius, the surface. */
export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { color } = useTheme();
  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: color.line,
          borderRadius: radius.card,
          backgroundColor: color.surface,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const THUMB = 56;

/** The product's photo, or the frames' grey tile with a camera when there is none. */
export function Thumb({ uri }: { uri?: string | null }) {
  const { color } = useTheme();
  const box = { width: THUMB, height: THUMB, borderRadius: 8 } as const;
  return uri ? (
    <Image source={{ uri }} style={box} contentFit="cover" transition={150} accessible={false} />
  ) : (
    <View style={[box, { backgroundColor: color.skeleton, alignItems: "center", justifyContent: "center" }]}>
      <CameraIcon size={24} color={color.textDim} />
    </View>
  );
}

/**
 * What is being booked: the photo, the name, and up to two quiet lines (the
 * dates, how it changes hands). `footer` sits under a hairline: the ₹99 on the
 * confirming screen, the shop's place on the booking screen.
 */
export function SummaryCard({
  title,
  image,
  lines,
  right,
  footer,
}: {
  title: string;
  image?: string | null;
  lines: (string | null | undefined)[];
  /** Beside the title: the stage pill on the Rentals tab. */
  right?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { color } = useTheme();
  return (
    <Panel>
      <View style={{ flexDirection: "row", gap: space.md, padding: space.md }}>
        <Thumb uri={image} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={2} style={{ flex: 1 }}>
              {title}
            </Text>
            {right}
          </View>
          {lines.filter(Boolean).map((line) => (
            <Text key={line} fontSize="text-sm" tone="body">
              {line}
            </Text>
          ))}
        </View>
      </View>
      {footer ? (
        <View style={{ borderTopWidth: 1, borderTopColor: color.line, padding: space.md }}>{footer}</View>
      ) : null}
    </Panel>
  );
}

/** A label on the left and an amount on the right; `struck` is drawn crossed out before it. */
export function MoneyLine({
  label,
  amount,
  struck,
  bold = false,
  amountTone,
}: {
  label: string;
  amount: string;
  struck?: string;
  bold?: boolean;
  amountTone?: "success";
}) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}
      accessible
      accessibilityLabel={struck ? `${label}: ${amount}, instead of ${struck}` : `${label}: ${amount}`}
    >
      <Text
        fontSize="text-md"
        fontWeight={bold ? "font-bold" : "font-normal"}
        tone={bold ? "default" : "body"}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      {struck ? (
        <Text fontSize="text-md" tone="dim" style={{ textDecorationLine: "line-through" }}>
          {struck}
        </Text>
      ) : null}
      <Text fontSize="text-md" fontWeight="font-bold" tone={amountTone ?? (struck ? "success" : "default")}>
        {amount}
      </Text>
    </View>
  );
}

type NoticeTone = "info" | "warning" | "brand" | "danger";

/**
 * A tinted note with an icon: the deposit note, the closed shop, a thing in the way. `danger` with a `title` is an alert
 * that costs the rental (ENG-282: a month overdue), its title in the danger colour above the words.
 */
export function Notice({
  tone = "info",
  icon,
  title,
  children,
}: {
  tone?: NoticeTone;
  icon?: "info" | "clock" | "warning";
  title?: string;
  children: React.ReactNode;
}) {
  const { color } = useTheme();
  const tint = {
    info: { bg: color.surfaceRaised, fg: color.textBody, line: "transparent" },
    warning: { bg: color.warningWash, fg: color.warning, line: color.warning },
    brand: { bg: color.brandPanel, fg: color.brandText, line: color.brandPanelLine },
    danger: { bg: color.dangerWash, fg: color.danger, line: color.danger },
  }[tone];
  const Icon =
    icon === "clock" ? ClockIcon : icon === "warning" ? ExclamationTriangleIcon : InformationCircleIcon;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: tint.line,
        backgroundColor: tint.bg,
      }}
    >
      <Icon size={20} color={tint.fg} />
      {title ? (
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold" style={{ color: tint.fg }}>
            {title}
          </Text>
          <Text fontSize="text-sm">{children}</Text>
        </View>
      ) : (
        <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
          {children}
        </Text>
      )}
    </View>
  );
}

type PillTone = "brand" | "success" | "warning" | "danger" | "neutral";

/** A stage on a card: "Confirmed", "Ready", "Asking the owner". */
export function Pill({ label, tone }: { label: string; tone: PillTone }) {
  const { color } = useTheme();
  const tint = {
    brand: { fg: color.brandText, bg: color.brandWash },
    success: { fg: color.success, bg: color.successWash },
    warning: { fg: color.warning, bg: color.warningWash },
    danger: { fg: color.danger, bg: color.dangerWash },
    neutral: { fg: color.textBody, bg: color.surfaceRaised },
  }[tone];
  return (
    <View
      style={{ backgroundColor: tint.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 }}
    >
      <Text fontSize="text-xs" fontWeight="font-bold" style={{ color: tint.fg }}>
        {label}
      </Text>
    </View>
  );
}

/** A quiet action written as words: "Cancel request · ₹99 comes back", "No thanks, refund my ₹99". */
export function TextButton({
  label,
  onPress,
  tone = "brand",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: "brand" | "danger";
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      activeOpacity={0.6}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH_TARGET, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : 1 }}
    >
      <Text fontSize="text-md" fontWeight="font-bold" tone={tone} style={{ textAlign: "center" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** The bar pinned under a booking screen's scroll: a hairline above, the home-indicator inset below. */
export function BottomBar({ children }: { children: React.ReactNode }) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: space.md,
        paddingBottom: space.md + insets.bottom,
        borderTopWidth: 1,
        borderTopColor: color.line,
        backgroundColor: color.canvas,
        gap: space.sm,
      }}
    >
      {children}
    </View>
  );
}

/** Placeholder blocks while a booking screen loads. */
export function BookingLoading({ label }: { label: string }) {
  return (
    <View
      style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, gap: space.md }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
    >
      <Skeleton width="100%" height={88} />
      <Skeleton width="100%" height={150} />
      <Skeleton width="100%" height={190} />
    </View>
  );
}

/** A booking screen that could not load. A 404 is said as such; anything else can be tried again. */
export function BookingLoadError({
  error,
  what,
  onRetry,
}: {
  error: unknown;
  /** What could not be loaded: "this booking", "the price". */
  what: string;
  onRetry: () => void;
}) {
  const { color } = useTheme();
  const missing = apiError(error)?.status === 404;
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <EmptyState
        variant="error"
        icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
        title={missing ? `We couldn't find ${what}` : `We couldn't load ${what}`}
        body={missing ? "It may have been removed." : "Check your connection and try again."}
        actionLabel={missing ? undefined : "Try again"}
        onAction={missing ? undefined : onRetry}
      />
    </View>
  );
}
