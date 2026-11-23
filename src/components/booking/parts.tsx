import { EmptyState, Skeleton, Text } from "@/components/core";
// By path, not the barrel: tests mock the barrel, and these two are new kit
// pieces the mocks do not carry.
import { BottomBar as KitBottomBar } from "@/components/core/bottom-bar";
import { StatusPill } from "@/components/core/status-pill";
import { apiError } from "@/lib/api-error";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { Image } from "expo-image";
import React from "react";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import {
  CameraIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "react-native-heroicons/outline";

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

/**
 * The product's photo, or the frames' grey tile with a camera when there is none. `more`: a booking's other items, "+2",
 * in the corner (cart plan §3.7, CT-30a).
 */
export function Thumb({
  uri,
  more,
  size = THUMB,
}: {
  uri?: string | null;
  more?: string | null;
  /** The cart's lines draw it at 64 (2089:26744, 28848); every other booking screen keeps 56. */
  size?: number;
}) {
  const { color } = useTheme();
  const box = { width: size, height: size, borderRadius: 8 } as const;
  const photo = uri ? (
    <Image source={{ uri }} style={box} contentFit="cover" transition={150} accessible={false} />
  ) : (
    <View style={[box, { backgroundColor: color.skeleton, alignItems: "center", justifyContent: "center" }]}>
      <CameraIcon size={24} color={color.textDim} />
    </View>
  );
  if (!more) return photo;
  return (
    <View>
      {photo}
      <View
        style={{
          position: "absolute",
          right: 4,
          bottom: 4,
          paddingHorizontal: 5,
          borderRadius: radius.full,
          backgroundColor: "rgba(0,0,0,0.65)",
        }}
      >
        <Text fontSize="text-xs" fontWeight="font-bold" tone="onPhoto">
          {more}
        </Text>
      </View>
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
  more,
  lines,
  right,
  footer,
}: {
  title: string;
  image?: string | null;
  /** A booking's other items on the photo: "+2". */
  more?: string | null;
  lines: (string | null | undefined)[];
  /** Beside the title: the stage pill on the Rentals tab. */
  right?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { color } = useTheme();
  return (
    <Panel>
      <View style={{ flexDirection: "row", gap: space.md, padding: space.md }}>
        <Thumb uri={image} more={more} />
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

/**
 * The kit Price row (figma/00 2074:14416): a label on the left at 70% and an amount on the right, both 14. `struck` is
 * drawn crossed out before it, and the amount then reads as a saving (green) unless `amountTone` says otherwise: a price
 * that went up (CT-23a) is `default`. `note` is a small line under it (ENG-343: the GST in it).
 *
 * `total` is the kit's Total row: 16 Bold both sides, under its own hairline. `bold` is the older emphasis, kept so its
 * screens (which draw their own divider) do not get a second one: the Total type without the hairline.
 */
export function MoneyLine({
  label,
  amount,
  struck,
  bold = false,
  total = false,
  amountTone,
  note,
}: {
  label: string;
  amount: string;
  struck?: string;
  bold?: boolean;
  total?: boolean;
  amountTone?: "success" | "default";
  note?: string;
}) {
  const { color } = useTheme();
  const said = struck ? `${label}: ${amount}, instead of ${struck}` : `${label}: ${amount}`;
  const strong = bold || total;
  const size = strong ? "text-md" : "text-sm";
  return (
    <View
      accessible
      accessibilityLabel={note ? `${said}. ${note}` : said}
      style={[{ gap: 2 }, total && { borderTopWidth: 1, borderTopColor: color.line, paddingTop: 12 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          fontSize={size}
          fontWeight={strong ? "font-bold" : "font-normal"}
          tone={strong ? "default" : "body"}
          style={{ flex: 1 }}
        >
          {label}
        </Text>
        {struck ? (
          <Text fontSize={size} tone="dim" style={{ textDecorationLine: "line-through" }}>
            {struck}
          </Text>
        ) : null}
        <Text
          fontSize={size}
          fontWeight={strong ? "font-bold" : "font-semibold"}
          tone={amountTone ?? (struck ? "success" : "default")}
        >
          {amount}
        </Text>
      </View>
      {note ? (
        <Text fontSize="text-xs" tone="body">
          {note}
        </Text>
      ) : null}
    </View>
  );
}

type NoticeTone = "info" | "warning" | "brand" | "danger" | "success";

/**
 * The kit Notice card (figma/00 2074:14388): a tinted note with an icon in the tone's colour — the deposit note, the
 * closed shop, a thing in the way. `danger` with a `title` is an alert that costs the rental (ENG-282: a month overdue).
 * The title is black over the words at 70%; the tint and the icon carry the tone. `brand` is a pre-kit tone and draws as
 * `info`: the kit has no purple notice. Without `icon` the glyph follows the tone, as the kit draws it.
 */
export function Notice({
  tone = "info",
  icon,
  title,
  children,
}: {
  tone?: NoticeTone;
  icon?: "info" | "clock" | "warning" | "check";
  title?: string;
  children: React.ReactNode;
}) {
  const { color } = useTheme();
  const kitTone = tone === "brand" ? "info" : tone;
  const tint = {
    info: { bg: color.infoWash, fg: color.info },
    warning: { bg: color.warningWash, fg: color.warning },
    danger: { bg: color.dangerWash, fg: color.danger },
    // G10: money coming back (cart CT-29b, CT-47a).
    success: { bg: color.successWash, fg: color.success },
  }[kitTone];
  const glyph = icon ?? { info: "info", warning: "warning", danger: "warning", success: "check" }[kitTone];
  const Icon =
    glyph === "clock"
      ? ClockIcon
      : glyph === "warning"
        ? ExclamationTriangleIcon
        : glyph === "check"
          ? CheckCircleIcon
          : InformationCircleIcon;
  return (
    <View
      style={{
        alignSelf: "stretch",
        flexDirection: "row",
        gap: 12,
        padding: 16,
        borderRadius: 12, // kit Notice card r12, no border
        backgroundColor: tint.bg,
      }}
    >
      <Icon size={20} color={tint.fg} />
      <View style={{ flex: 1, gap: 4 }}>
        {title ? (
          <Text fontSize="text-sm" fontWeight="font-semibold">
            {title}
          </Text>
        ) : null}
        <Text fontSize="text-sm" tone="body">
          {children}
        </Text>
      </View>
    </View>
  );
}

type PillTone = "brand" | "success" | "warning" | "danger" | "neutral";

/**
 * A stage on a card: "Confirmed", "Ready", "Asking the owner". Drawn by the kit `StatusPill`. The kit has no brand
 * pill, so the legacy `brand` tone falls back to `info` (blue, the fix pass's "Out"); the per-label remaps belong to the
 * flow stories (ENG-431, ENG-433).
 */
export function Pill({ label, tone }: { label: string; tone: PillTone }) {
  return <StatusPill label={label} tone={tone === "brand" ? "info" : tone} />;
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

/**
 * The bar pinned under a booking screen's scroll. The kit `BottomBar` draws it — hairline, padding, home-indicator and
 * keyboard insets — with these children in its content strip. The inner column keeps the 8pt between stacked children
 * (a button over a text link) that this bar always had, whatever the kit bar does with its own strip.
 */
export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <KitBottomBar>
      <View style={{ gap: space.sm }}>{children}</View>
    </KitBottomBar>
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
