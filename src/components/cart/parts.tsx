import { useBookings } from "@/backend/bookings";
import { useCart } from "@/backend/cart";
import { Button, IconButton, Text } from "@/components/core";
import { Pill } from "@/components/booking/parts";
import { clock, rangeLabel, rentCharge, timeLeft } from "@/lib/booking";
import { CartNoteTone, waitingForRent } from "@/lib/cart";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, darkColors, radius, space } from "@/lib/design-tokens";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import React, { useEffect, useState } from "react";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShoppingBagIcon,
} from "react-native-heroicons/outline";

/**
 * The cart's way in (cart plan D29, Figma CT-04, CT-05): the bag, with the
 * number of lines on it. The tab bar has no room for a cart (F24), so it sits
 * in the product page's band and in Home's header.
 */
export function CartButton({ onPhoto = false, style }: { onPhoto?: boolean; style?: StyleProp<ViewStyle> }) {
  const { cart } = useCart();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const count = cart?.count ?? 0;
  return (
    <IconButton
      onPress={() => navigation.navigate("Cart")}
      accessibilityLabel={count ? `Your cart, ${count === 1 ? "1 item" : `${count} items`}` : "Your cart"}
      scrim={onPhoto}
      size={onPhoto ? 40 : undefined}
      style={style}
    >
      <ShoppingBagIcon size={24} color={onPhoto ? darkColors.text : color.text} strokeWidth={1.5} />
      {count > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: onPhoto ? -2 : 2,
            right: onPhoto ? -4 : 0,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.brand,
          }}
        >
          <Text fontSize="text-xs" fontWeight="font-bold" style={{ color: color.onBrand, lineHeight: 14 }}>
            {count > 9 ? "9+" : String(count)}
          </Text>
        </View>
      ) : null}
    </IconButton>
  );
}

/**
 * "You've requested this for Sat 24 – Mon 26 · RN-21345 · View" above the
 * product bar (D28, Figma CT-01): the customer already has a live booking of
 * this item, so another request for it is most likely a mistake (D39).
 */
export function RequestedLine({
  requested,
  onView,
}: {
  requested: NonNullable<BackendProduct["requested"]>;
  onView: () => void;
}) {
  const { color } = useTheme();
  const when =
    requested.first_day && requested.last_day ? ` for ${rangeLabel(requested.first_day, requested.last_day)}` : "";
  const text = `You've requested this${when} · ${requested.number}`;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${text}. View`}
      activeOpacity={0.7}
      onPress={onView}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.sm,
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: color.brandPanelLine,
        backgroundColor: color.brandPanel,
      }}
    >
      <ClockIcon size={16} color={color.brandText} />
      <Text fontSize="text-sm" fontWeight="font-semibold" style={{ flex: 1 }}>
        {text}
      </Text>
      <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
        View
      </Text>
    </TouchableOpacity>
  );
}

/** A cart line's warning chip; with `onPress` it ends in "View ›" and opens what it names. */
export function CartChip({ text, tone, onPress }: { text: string; tone: CartNoteTone; onPress?: () => void }) {
  const { color } = useTheme();
  const tint = {
    info: { fg: color.info, bg: color.infoWash, Icon: InformationCircleIcon },
    warning: { fg: color.warning, bg: color.warningWash, Icon: ExclamationTriangleIcon },
    neutral: { fg: color.textBody, bg: color.surfaceRaised, Icon: InformationCircleIcon },
  }[tone];
  const body = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: color.line,
        backgroundColor: tint.bg,
      }}
    >
      <tint.Icon size={14} color={tint.fg} />
      <Text fontSize="text-xs" style={{ color: tint.fg, flexShrink: 1 }}>
        {text}
      </Text>
      {onPress ? (
        <>
          <Text fontSize="text-xs" fontWeight="font-bold" tone="brand">
            View
          </Text>
          <ChevronRightIcon size={14} color={color.brandText} />
        </>
      ) : null}
    </View>
  );
  return onPress ? (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${text}. View`}
      activeOpacity={0.7}
      onPress={onPress}
      style={{ minHeight: MIN_TOUCH_TARGET, justifyContent: "center", alignSelf: "flex-start" }}
    >
      {body}
    </TouchableOpacity>
  ) : (
    body
  );
}

/**
 * "Pay {shop} ₹X by 4:34 pm" (§3.2, Figma CT-42): while another booking of
 * this customer waits for its rent, that payment comes before a new checkout,
 * so it sits on top of the cart as its loudest action. The countdown is for the
 * eye only; the server ends the request.
 */
export function RentStrip() {
  const { data } = useBookings(true, true);
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const booking = waitingForRent(data?.pages.flatMap((page) => page.results) ?? []);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!booking) return;
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, [booking?.number]);
  if (!booking) return null;
  const due = booking.money.rent_due_at;
  const left = timeLeft(due, now);
  const shop = booking.shop.name;
  return (
    <View
      style={{
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: 16,
        gap: space.sm,
        backgroundColor: color.warningWash,
        borderBottomWidth: 1,
        borderBottomColor: color.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        {left ? <Pill label={`${left} left`} tone="warning" /> : null}
        <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
          {due
            ? `${shop} accepted. Pay by ${clock(due)} or the request ends.`
            : `${shop} accepted. Pay now or the request ends.`}
        </Text>
      </View>
      <Button onPress={() => navigation.navigate("Booking", { number: booking.number })}>
        {`Pay ${shop} ${formatCurrency(rentCharge(booking).amount)}`}
      </Button>
    </View>
  );
}
