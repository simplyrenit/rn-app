import { Thumb } from "@/components/booking/parts";
import { Text } from "@/components/core";
import { ChipTone, LineChip } from "@/lib/card-checkout";
import { radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View, useWindowDimensions } from "react-native";
import { CheckCircleIcon, ChevronRightIcon, MapPinIcon, TruckIcon } from "react-native-heroicons/outline";

/**
 * A cart card at checkout (CT-20, CT-22): the shop once, then a row per item, each with its price for the dates and,
 * on the dates step, Leave in cart / Add back. One file, so the dates step and the price screen draw an item alike.
 */

/** "SR" for SkyHire Rentals: the first letters of the first and last words. */
const initials = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase() : (words[0]?.[0] ?? "").toUpperCase();
};

/** The card's top (2089:26744, 28848 "Shop head"): the shop, where it is, how it hands over, and (on the price screen) the dates. */
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
      <View style={{ flexDirection: "row", gap: 12 }}>
        {/* The frames' shop monogram: initials on the brand tint, no photo and no ring. */}
        <View
          accessible={false}
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.brandPanel,
          }}
        >
          <Text fontSize="text-sm" fontWeight="font-semibold" tone="brand">
            {initials(name)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1} style={{ flexShrink: 1 }}>
              {name}
            </Text>
            {verified ? (
              <CheckCircleIcon size={16} color={color.brandText} accessibilityLabel="Verified business" />
            ) : null}
          </View>
          {sub ? (
            <Text fontSize="text-sm" tone="body">
              {sub}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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

/** A line's chip (2089:28848 "Line chip"): the tone's wash, r8, Medium 12/16, no border and no icon. */
function Chip({ chip, onView }: { chip: LineChip; onView?: () => void }) {
  const { color } = useTheme();
  const tint: Record<ChipTone, { bg: string; fg: string }> = {
    warning: { bg: color.warningWash, fg: color.warning },
    info: { bg: color.brandPanel, fg: color.brandText },
    neutral: { bg: color.surfaceMuted, fg: color.textBody },
  };
  const t = tint[chip.tone];
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: t.bg,
        maxWidth: "100%",
      }}
    >
      <Text fontSize="text-xs" fontWeight="font-medium" style={{ color: t.fg, flexShrink: 1 }}>
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
 * One item (2089:28848 "Line"). `left`: left in the cart for this checkout; G12 draws it with a dim title and struck
 * amounts, and the 2.1 frame fades only its photo. `action` is Leave in cart or Add back, a 20pt text link; `chips` say
 * why it is in the way or left out, under the amounts in the text column as the frame draws them (full width at a
 * large font or below 375pt, ENG-336).
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
  thumbSize,
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
  /** The photo's side: 64 in the cart checkout (2089:28848); the price screen keeps `Thumb`'s 56. */
  thumbSize?: number;
}) {
  const strike = left ? ({ textDecorationLine: "line-through" } as const) : undefined;
  // Below 375pt (360dp Android) a one-line "Leave in cart" left the item's text
  // about 110dp, and "Deposit ₹3,000" broke across two lines; the action wraps
  // to two short lines there instead. 375 and up keep the frame's single line.
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const narrow = windowWidth < 375;
  // The frame puts the chips in the text column. At a large font or a narrow screen that column is too thin, and
  // they wrapped two letters a line (ENG-336): they then take the row's full width under the item.
  const chipsUnder = narrow || fontScale >= 1.3;
  const chipList = chips.map(({ chip, onView }) => <Chip key={chip.text} chip={chip} onView={onView} />);
  return (
    <View style={{ gap: space.xs, paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ opacity: left ? 0.5 : 1 }}>
          <Thumb uri={image} size={thumbSize} />
        </View>
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
          {chipsUnder || chipList.length === 0 ? null : <View style={{ gap: 4 }}>{chipList}</View>}
        </View>
        {action ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${action.label}: ${title}`}
            accessibilityHint={action.hint}
            accessibilityState={{ disabled: Boolean(action.disabled) }}
            disabled={action.disabled}
            onPress={action.onPress}
            // The frame's 20pt text link (SemiBold 14/20); the slop makes the 44pt target.
            hitSlop={12}
            style={{ maxWidth: narrow ? 72 : undefined }}
          >
            <Text fontSize="text-sm" fontWeight="font-semibold" tone={action.disabled ? "dim" : "brand"} style={narrow ? { textAlign: "right" } : undefined}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {chipsUnder ? chipList : null}
      {extra}
    </View>
  );
}
