import { Thumb } from "@/components/booking/parts";
import { Avatar, Text, VerifiedBusinessBadge } from "@/components/core";
import { ChipTone, LineChip } from "@/lib/card-checkout";
import { MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import {
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MapPinIcon,
  TruckIcon,
} from "react-native-heroicons/outline";

/**
 * A cart card at checkout (CT-20, CT-22): the shop once, then a row per item, each with its price for the dates and,
 * on the dates step, Leave in cart / Add back. One file, so the dates step and the price screen draw an item alike.
 */

/** The card's top: the shop, where it is, how it hands over, and (on the price screen) the dates. */
export function ShopHead({
  name,
  verified,
  sub,
  delivers,
  handover,
  dates,
}: {
  name: string;
  verified?: boolean;
  /** "Andheri W · 6 km away". */
  sub?: string | null;
  delivers: boolean;
  /** "Delivers", "Self pickup only", "Delivery to Home · ₹200". */
  handover: string;
  dates?: string | null;
}) {
  const { color } = useTheme();
  const Icon = delivers ? TruckIcon : MapPinIcon;
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: "row", gap: space.md }}>
        <Avatar name={name} size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
            <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </Text>
            <VerifiedBusinessBadge verified={verified} />
          </View>
          {sub ? (
            <Text fontSize="text-sm" tone="body">
              {sub}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
            <Icon size={16} color={color.textBody} />
            <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
              {handover}
            </Text>
          </View>
        </View>
      </View>
      {dates ? (
        <Text fontSize="text-sm" tone="body">
          {dates}
        </Text>
      ) : null}
    </View>
  );
}

function Chip({ chip, onView }: { chip: LineChip; onView?: () => void }) {
  const { color } = useTheme();
  const tint: Record<ChipTone, { bg: string; fg: string; line: string }> = {
    warning: { bg: color.warningWash, fg: color.warning, line: color.warning },
    info: { bg: color.brandPanel, fg: color.brandText, line: color.brandPanelLine },
    neutral: { bg: color.surfaceRaised, fg: color.textBody, line: color.line },
  };
  const t = tint[chip.tone];
  const Icon = chip.tone === "warning" ? ExclamationTriangleIcon : InformationCircleIcon;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: space.xs,
        paddingHorizontal: space.sm,
        paddingVertical: 3,
        borderRadius: radius.button,
        // G15: a 1 pt line in the chip's tone, so it reads on the dark surface too.
        borderWidth: 1,
        borderColor: t.line,
        backgroundColor: t.bg,
        maxWidth: "100%",
      }}
    >
      <Icon size={14} color={t.fg} />
      <Text fontSize="text-xs" style={{ color: t.fg, flexShrink: 1 }}>
        {chip.text}
      </Text>
      {onView ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`View ${chip.text}`}
          onPress={onView}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={{ flexDirection: "row", alignItems: "center", marginLeft: space.xs }}
        >
          <Text fontSize="text-xs" fontWeight="font-bold" tone="brand">
            View
          </Text>
          <ChevronRightIcon size={12} color={color.brandText} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * One item. `left`: left in the cart for this checkout; G12 draws it with a dim title and struck amounts, never faded.
 * `action` is Leave in cart or Add back; `chips` say why it is in the way or left out. The chips take the row's full
 * width under the item: between the photo and the action, at a large font, they wrapped two letters a line (ENG-336).
 */
export function LineRow({
  title,
  image,
  meta,
  amount,
  deposit,
  left = false,
  chips = [],
  action,
  extra,
}: {
  title: string;
  image?: string | null;
  /** "₹500 a day · 3 days". */
  meta: string;
  /** The rent for these dates, when the quote has it. */
  amount?: string | null;
  /** "Deposit ₹20,000". */
  deposit?: string | null;
  left?: boolean;
  chips?: { chip: LineChip; onView?: () => void }[];
  action?: { label: string; onPress: () => void; disabled?: boolean; hint?: string };
  /** Under the chips: CT-21e's "Book it on its own". */
  extra?: React.ReactNode;
}) {
  const strike = left ? ({ textDecorationLine: "line-through" } as const) : undefined;
  return (
    <View style={{ gap: space.xs, paddingVertical: space.sm }}>
      <View style={{ flexDirection: "row", gap: space.md }}>
        <Thumb uri={image} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold" tone={left ? "dim" : "default"} numberOfLines={2}>
            {title}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {meta}
          </Text>
          {amount || deposit ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: space.sm }}>
              {amount ? (
                <Text fontSize="text-md" fontWeight="font-bold" style={strike}>
                  {amount}
                </Text>
              ) : null}
              {deposit ? (
                <Text fontSize="text-sm" tone="body" style={strike}>
                  {deposit}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        {action ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${action.label}: ${title}`}
            // The chips are read after this button now; their reason is heard with it.
            accessibilityHint={
              [action.hint, ...chips.map(({ chip }) => chip.text)].filter(Boolean).join(". ") || undefined
            }
            accessibilityState={{ disabled: Boolean(action.disabled) }}
            disabled={action.disabled}
            onPress={action.onPress}
            style={{ minHeight: MIN_TOUCH_TARGET, paddingLeft: space.sm, justifyContent: "flex-start" }}
          >
            <Text fontSize="text-sm" fontWeight="font-bold" tone={action.disabled ? "dim" : "brand"}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {chips.map(({ chip, onView }) => (
        <Chip key={chip.text} chip={chip} onView={onView} />
      ))}
      {extra}
    </View>
  );
}
