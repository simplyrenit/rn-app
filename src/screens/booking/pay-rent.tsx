import { payRent } from "@/backend/bookings";
import { CancelSheet, CancelSheetHandle } from "@/components/booking/cancel-sheet";
import { BottomBar, MoneyLine, Notice, Panel, TextButton } from "@/components/booking/parts";
import { usePay } from "@/components/booking/use-pay";
import { Button, Text } from "@/components/core";
import { apiError } from "@/lib/api-error";
import {
  BookingCustomer,
  payButtonLabel,
  payPhaseText,
  payRentCopy,
  payRentErrorText,
} from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import { CheckCircleIcon } from "react-native-heroicons/outline";

/**
 * BK-06, "<shop> accepted": pay the rest of the rent to confirm the booking.
 *
 * The deadline is written as the server's own clock time ("by 10:13 am"), never
 * as a number of minutes. When it passes the booking is read again: the server
 * decides the lapse, and a payment that lands late is kept or refunded there.
 *
 * Every tap of Pay asks rn-api for the payment: it answers with the same one
 * while that can still be paid, so two taps never make two payments, and with a
 * new one once the first has run out.
 */
export function PayRent({
  booking,
  refresh,
}: {
  booking: BookingCustomer;
  /** Reads the booking again and returns it. */
  refresh: () => Promise<BookingCustomer | undefined>;
}) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const cancelSheet = useRef<CancelSheetHandle>(null);
  const copy = payRentCopy(booking);

  const { phase, pay } = usePay(booking.number, {
    onPaid: async () => {
      // The rent is in. The arrival window is the next thing, one tap away.
      const fresh = await refresh();
      if (fresh?.can.includes("set_window")) navigation.navigate("BookingWindow", { number: booking.number });
    },
    onError: (error) => {
      const failure = apiError(error);
      toast.error("We couldn't start the payment", { message: payRentErrorText(failure) });
      // The booking may have lapsed or been cancelled meanwhile.
      if (failure?.code === "stage_not_allowed") void refresh();
    },
  });

  const dueAt = booking.pay_now?.due_at ?? booking.money.rent_due_at;
  useEffect(() => {
    const left = new Date(dueAt ?? "").getTime() - Date.now();
    if (!Number.isFinite(left) || left <= 0) return;
    const timer = setTimeout(() => void refresh(), left + 2000);
    return () => clearTimeout(timer);
    // `refresh` is recreated each render; the deadline is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAt]);

  const note = payPhaseText(phase);
  const working = phase === "working";

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.lg }}
      >
        <View style={{ alignItems: "center", gap: space.sm }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: color.successWash,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: space.sm,
            }}
          >
            <CheckCircleIcon size={40} color={color.success} />
          </View>
          <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
            {copy.title}
          </Text>
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
            {copy.sub}
          </Text>
        </View>

        <Panel style={{ padding: space.md, gap: space.sm }}>
          {copy.lines.map((line) => (
            <MoneyLine key={line.label} {...line} />
          ))}
          <View style={{ height: 1, backgroundColor: color.line }} />
          <MoneyLine {...copy.total} bold />
        </Panel>

        {copy.note ? <Notice>{copy.note}</Notice> : null}
      </ScrollView>

      <BottomBar>
        {note ? (
          <Text fontSize="text-sm" tone={phase === "failed" ? "danger" : "body"} accessibilityRole="alert">
            {note}
          </Text>
        ) : null}
        <Button
          onPress={() => void pay(async () => (await payRent(booking.number)).payment)}
          loading={working}
          disabled={working}
        >
          {payButtonLabel(phase === "ended" ? "idle" : phase, copy.button)}
        </Button>
        <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
          {copy.small}
        </Text>
        {booking.can.includes("cancel") ? (
          <TextButton label="Cancel booking" tone="danger" disabled={working} onPress={() => cancelSheet.current?.present()} />
        ) : null}
      </BottomBar>

      <CancelSheet ref={cancelSheet} number={booking.number} />
    </View>
  );
}
