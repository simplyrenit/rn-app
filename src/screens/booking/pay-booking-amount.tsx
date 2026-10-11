import { BottomBar, SummaryCard, TextButton } from "@/components/booking/parts";
import { usePay } from "@/components/booking/use-pay";
import { useServerNow } from "@/components/booking/use-server-now";
import { Button, Text } from "@/components/core";
import {
  BookingCustomer,
  bookingHow,
  datesLine,
  money,
  payButtonLabel,
  payPhaseText,
  timeAndDay,
} from "@/lib/booking";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";

/**
 * A booking whose ₹99 is not paid yet. The owner is rung only once it is
 * (ARCHITECTURE A-05), so until then nobody has been asked anything.
 *
 * The pay page comes from the booking itself (`pay_now.payment`), which the
 * server keeps there for exactly as long as the booking waits for the ₹99. So
 * any phone can pay or pay again, and nothing about the payment is taken from
 * this phone's memory or clock. When the server says the page is over, the
 * booking is read again and shows what became of the request.
 */
export function PayBookingAmount({
  booking,
  receivedAt,
  autoStart,
  refresh,
}: {
  booking: BookingCustomer;
  /** When this booking's answer arrived: with its `server_time`, the server's clock. */
  receivedAt: number;
  /** Book now was tapped a moment ago: open the pay page without a second tap. */
  autoStart: boolean;
  /** Reads the booking again and returns it. */
  refresh: () => Promise<BookingCustomer | undefined>;
}) {
  const navigation = useTypedNavigation();
  const now = useServerNow(booking.server_time, receivedAt);
  // The payment settles minutes after the tap; it must see the booking as it is then.
  const latest = useRef(booking);
  latest.current = booking;

  const { phase, pay } = usePay(booking.number, {
    // Whatever the answer, the booking on the server is what the screen draws next.
    onResult: () => void refresh(),
    onError: (error) =>
      toast.error("We couldn't start the payment", {
        message: apiError(error)?.message ?? "Check your connection and try again.",
      }),
  });

  const open = () =>
    void pay(async () => {
      const kept = latest.current.pay_now?.payment;
      if (kept) return kept;
      // Not on the copy in hand (it should always be while the ₹99 is awaited): read again.
      const fresh = await refresh();
      const payment = fresh?.pay_now?.payment ?? null;
      if (!payment) toast.info("Checking this request again", { haptic: false });
      return payment;
    });

  const started = useRef(false);
  useEffect(() => {
    if (started.current || !autoStart) return;
    started.current = true;
    open();
    // Spent: coming back to this screen later must not open the page by itself.
    navigation.setParams({ pay: false });
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const amount = money(booking.money.booking_amount);
  // "Today" and "tomorrow" by the server's day, not this phone's (P3-17).
  const opens = booking.shop.opens_at ? timeAndDay(booking.shop.opens_at, now) : null;
  const note = payPhaseText(phase);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md }}
      >
        <Text role="screenTitle" accessibilityRole="header">
          {`Pay ${amount} to ask ${booking.shop.name}`}
        </Text>
        <Text fontSize="text-md" tone="body">
          {opens
            ? `It counts toward the rent. The owner is closed now and will be asked at ${opens.time} ${opens.day}.`
            : "It counts toward the rent. The owner is asked the moment it is paid."}
        </Text>
        <SummaryCard
          title={booking.product.title}
          image={booking.product.cover_image}
          lines={[datesLine(booking), `${bookingHow(booking)} · ${booking.shop.name}`]}
        />
      </ScrollView>
      <BottomBar>
        {note ? (
          <Text fontSize="text-sm" tone={phase === "failed" ? "danger" : "body"} accessibilityRole="alert">
            {note}
          </Text>
        ) : null}
        <Button onPress={open} loading={phase === "working"} disabled={phase === "working"}>
          {payButtonLabel(phase === "ended" ? "idle" : phase, `Pay ${amount}`)}
        </Button>
        {phase === "ended" ? (
          <TextButton
            label="Back to the listing"
            onPress={() => navigation.navigate("ProductDetail", { id: booking.product.name })}
          />
        ) : null}
      </BottomBar>
    </View>
  );
}
