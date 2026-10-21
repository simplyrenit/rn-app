import { useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading, BottomBar, Notice, Panel } from "@/components/booking/parts";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { isMonthly } from "@/lib/billing";
import { dayShort, daysLabel } from "@/lib/booking";
import { MAX_EXTRA_DAYS, extensionDays } from "@/lib/day-of";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { tapFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { MinusIcon, PlusIcon } from "react-native-heroicons/outline";

function Step({ label, disabled, onPress, children }: { label: string; disabled: boolean; onPress: () => void; children: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      activeOpacity={0.7}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{
        width: MIN_TOUCH_TARGET + 4,
        height: MIN_TOUCH_TARGET + 4,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: color.inputLine,
        backgroundColor: color.surface,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

/**
 * Extending a rental: a new booking for the days right after this one, which the
 * shop accepts as usual. The item stays with the customer and the deposit
 * carries on. This screen only picks how many more days; the price, the terms
 * tick and the request itself are the price screen's, asked with `extends`.
 */
export default function ExtendScreen() {
  const { params } = useRoute<RouteProps<"BookingExtend">>();
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const query = useBooking(params.number);
  const booking = query.data;
  // ENG-282: a monthly-billed rental extends by a month, so the stepper starts at 30 days (the most it allows).
  const [picked, setExtra] = useState<number | null>(null);

  if (!booking) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title="Extend" />
        {query.isError ? (
          <BookingLoadError error={query.error} what="this booking" onRetry={() => void query.refetch()} />
        ) : (
          <BookingLoading label="Loading your booking" />
        )}
      </NonScrollableContainer>
    );
  }

  const extra = picked ?? (isMonthly(booking.money) ? MAX_EXTRA_DAYS : 1);
  const days = extensionDays(booking.last_day, extra);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Extend" />
      <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.lg }}>
        <View style={{ gap: 2 }}>
          <Text role="screenTitle" accessibilityRole="header">
            How many more days?
          </Text>
          <Text fontSize="text-md" tone="body">
            {`Your rental of the ${booking.product.title} ends on ${dayShort(booking.last_day)}.`}
          </Text>
        </View>

        <Panel style={{ padding: space.lg, alignItems: "center", gap: space.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg }}>
            <Step label="One day fewer" disabled={extra <= 1} onPress={() => setExtra(Math.max(1, extra - 1))}>
              <MinusIcon size={20} color={color.text} />
            </Step>
            <Text fontSize="text-2xl" fontWeight="font-bold" accessibilityLiveRegion="polite" style={{ minWidth: 110, textAlign: "center" }}>
              {daysLabel(extra)}
            </Text>
            <Step label="One day more" disabled={extra >= MAX_EXTRA_DAYS} onPress={() => setExtra(Math.min(MAX_EXTRA_DAYS, extra + 1))}>
              <PlusIcon size={20} color={color.text} />
            </Step>
          </View>
          <Text fontSize="text-md" tone="body">
            {`New last day: ${dayShort(days.last_day)}`}
          </Text>
        </Panel>

        <Notice icon="info">
          The shop has to accept the extra days, as for any booking. If they can't, the item is due back on the original day.
        </Notice>
      </View>
      <BottomBar>
        <Button
          onPress={() =>
            navigation.navigate("ReviewAndBook", {
              item: {
                name: booking.product.name,
                title: booking.product.title,
                cover_image: booking.product.cover_image,
                shop_name: booking.shop.name,
              },
              first_day: days.first_day,
              last_day: days.last_day,
              delivery_mode: booking.delivery_mode,
              address_id: booking.delivery_address?.id ?? null,
              extends: booking.number,
            })
          }
        >
          See the price
        </Button>
      </BottomBar>
    </NonScrollableContainer>
  );
}
