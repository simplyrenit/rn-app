import { BottomBar, SummaryCard } from "@/components/booking/parts";
import { usePay } from "@/components/booking/use-pay";
import { Button, Text } from "@/components/core";
import {
  BookingCustomer,
  datesLine,
  howLabel,
  money,
  payButtonLabel,
  payPhaseText,
  timeAndDay,
} from "@/lib/booking";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { rememberedPayment } from "@/lib/payments";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";

/**
 * A booking whose ₹99 is not paid yet. The owner is rung only once it is
 * (ARCHITECTURE A-05), so until then nobody has been asked anything.
 *
 * The pay page is the one Book now answered with, kept on this phone. rn-api has
 * no call that hands it out again, so on a phone that does not have it (or once
 * it has run out) the way on is to book again; the server drops the unpaid
 * booking by itself.
 */
export function PayBookingAmount({
  booking,
  autoStart,
  onChanged,
}: {
  booking: BookingCustomer;
  /** Book now was tapped a moment ago: open the pay page without a second tap. */
  autoStart: boolean;
  /** The payment moved: read the booking again. */
  onChanged: () => void;
}) {
  const navigation = useTypedNavigation();
  const [gone, setGone] = useState(false);
  const { phase, pay } = usePay(booking.number, {
    onPaid: onChanged,
    onError: (error) =>
      toast.error("We couldn't start the payment", {
        message: apiError(error)?.message ?? "Check your connection and try again.",
      }),
  });

  const open = () => void pay(() => rememberedPayment(booking.number));

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (autoStart) {
      open();
      // Spent: coming back to this screen later must not open the page by itself.
      navigation.setParams({ pay: false });
    } else {
      void rememberedPayment(booking.number).then((payment) => setGone(!payment));
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ended = gone || phase === "ended";
  const amount = money(booking.money.booking_amount);
  const opens = booking.shop.opens_at ? timeAndDay(booking.shop.opens_at) : null;
  const note = ended ? "This payment has ended. Nothing was taken. Book again from the listing." : payPhaseText(phase);

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
          lines={[datesLine(booking), `${howLabel(booking.delivery_mode)} · ${booking.shop.name}`]}
        />
      </ScrollView>
      <BottomBar>
        {note ? (
          <Text fontSize="text-sm" tone={phase === "failed" ? "danger" : "body"} accessibilityRole="alert">
            {note}
          </Text>
        ) : null}
        {ended ? (
          <Button onPress={() => navigation.navigate("ProductDetail", { id: booking.product.name })}>
            Back to the listing
          </Button>
        ) : (
          <Button onPress={open} loading={phase === "working"} disabled={phase === "working"}>
            {payButtonLabel(phase, `Pay ${amount}`)}
          </Button>
        )}
      </BottomBar>
    </View>
  );
}
