import { CancelSheet, CancelSheetHandle } from "@/components/booking/cancel-sheet";
import { BottomBar, MoneyLine, Panel, SummaryCard, TextButton } from "@/components/booking/parts";
import { useServerNow } from "@/components/booking/use-server-now";
import { Text } from "@/components/core";
import { BookingCustomer, RingStep, bookingHow, datesLine, money, ringCopy } from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useRef } from "react";
import { ScrollView, View } from "react-native";
import { BellIcon, ClockIcon, PhoneIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";

const MARK = 22;
const ICONS = { bell: BellIcon, phone: PhoneIcon, clock: ClockIcon } as const;

/** One step of the wait: a tick when done, a filled ring when it is happening, an empty ring before. */
function Step({ step, last }: { step: RingStep; last: boolean }) {
  const { color } = useTheme();
  const reached = step.state !== "todo";
  return (
    <View
      style={{ flexDirection: "row", gap: space.md }}
      accessible
      accessibilityLabel={`${step.label}${step.state === "done" ? ", done" : step.state === "active" ? ", now" : ""}`}
    >
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: MARK,
            height: MARK,
            borderRadius: radius.full,
            borderWidth: 2,
            borderColor: reached ? color.brand : color.inputLine,
            backgroundColor: step.state === "done" ? color.brand : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {step.state === "done" ? (
            <CheckIcon size={14} color={color.onBrand} />
          ) : step.state === "active" ? (
            <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.brand }} />
          ) : null}
        </View>
        {last ? null : (
          <View style={{ width: 2, flex: 1, minHeight: space.md, backgroundColor: step.state === "done" ? color.brand : color.inputLine }} />
        )}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : space.md }}>
        <Text
          fontSize="text-md"
          fontWeight={step.state === "active" ? "font-bold" : "font-normal"}
          tone={step.state === "active" ? "default" : "body"}
        >
          {step.label}
        </Text>
        {step.sub && step.state === "active" ? (
          <Text fontSize="text-sm" tone="body">
            {step.sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * BK-04 and BK-05, "Confirming your booking": the one screen the customer sees
 * while the owner is asked. It says what is happening ("Ringing the owner",
 * "Calling the owner", "Ringing again", or that a closed shop is asked when it
 * opens) and never how long is left: no countdown, no number of minutes.
 *
 * It holds nothing. The parent reads the booking from the server every 3
 * seconds while it rings, and this view is replaced the moment the answer is in.
 */
export function Confirming({ booking, receivedAt }: { booking: BookingCustomer; receivedAt: number }) {
  const { color } = useTheme();
  const cancelSheet = useRef<CancelSheetHandle>(null);
  // "Asked at 10:00 am tomorrow" is said against the server's day, not this phone's (P3-17).
  const copy = ringCopy(booking, useServerNow(booking.server_time, receivedAt));
  const Icon = ICONS[copy.icon];
  const amount = money(booking.money.booking_amount);
  const canCancel = booking.can.includes("cancel");
  // A cancel before the shop opens is never counted; while it rings there are three a day.
  const limitReached =
    !canCancel && booking.ring_state !== "waiting_to_open" && booking.cancels_left_today <= 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.lg }}
      >
        <View style={{ alignItems: "center", gap: space.lg }}>
          <View
            style={{
              width: 128,
              height: 128,
              borderRadius: radius.full,
              borderWidth: 1,
              borderColor: color.brandPanelLine,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: radius.full,
                backgroundColor: color.brandPanel,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon size={36} color={color.brandText} />
            </View>
          </View>
          <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
            {copy.title}
          </Text>
        </View>

        {/* Read out when the step changes, for someone not looking at the screen. */}
        <Panel style={{ padding: space.md }}>
          <View accessibilityLiveRegion="polite">
            {copy.steps.map((step, index) => (
              <Step key={step.label} step={step} last={index === copy.steps.length - 1} />
            ))}
          </View>
        </Panel>

        <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
          {copy.body}
        </Text>

        <SummaryCard
          title={booking.product.title}
          image={booking.product.cover_image}
          lines={[datesLine(booking), `${bookingHow(booking)} · ${booking.shop.name}`]}
          footer={<MoneyLine label="Paid now · counts toward the rent" amount={amount} />}
        />
      </ScrollView>

      {canCancel ? (
        <BottomBar>
          <TextButton
            label={`Cancel request · ${amount} comes back`}
            onPress={() => cancelSheet.current?.present()}
          />
        </BottomBar>
      ) : limitReached ? (
        <BottomBar>
          <Text fontSize="text-sm" tone="body" style={{ textAlign: "center" }}>
            You have cancelled as many requests as you can today.
          </Text>
        </BottomBar>
      ) : null}

      <CancelSheet ref={cancelSheet} number={booking.number} />
    </View>
  );
}
