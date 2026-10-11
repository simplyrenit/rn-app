import { useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading, MoneyLine, SummaryCard } from "@/components/booking/parts";
import { SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { BookingView, bookingView, datesLine, howLabel, money } from "@/lib/booking";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { RouteProps } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { Confirming } from "./confirming";
import { Outcome } from "./outcome";
import { PayBookingAmount } from "./pay-booking-amount";

/** True while the app is in front. A screen that asks the server on a timer stops when it is not. */
function useAppActive() {
  const [active, setActive] = useState(AppState.currentState !== "background");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => subscription.remove();
  }, []);
  return active;
}

/** The header's words for each view. The wait and the pay steps carry their own heading. */
const TITLE: Record<BookingView, (number: string) => string> = {
  pay_booking_amount: () => "",
  confirming: () => "",
  outcome: () => "Your request",
  pay_rent: (number) => `Booking ${number}`,
  details: (number) => `Booking ${number}`,
};

/**
 * One booking, at whatever stage the server says it is in. The screen holds no
 * stage of its own: it reads the booking and draws the view that stage calls
 * for (`bookingView`), so opening it from Book now, from a push, from the
 * Rentals tab or after the app was closed in the middle all show the same thing.
 *
 * While the owner is being asked the booking is read again every 3 seconds, and
 * only while this screen is in front of an active app. It is also read again
 * each time the screen or the app comes back: a payment or an answer may have
 * landed while the customer was away.
 */
export default function BookingScreen() {
  const { params } = useRoute<RouteProps<"Booking">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const query = useBooking(params.number, watching);
  const booking = query.data;
  const { refetch } = query;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  if (!booking) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title={`Booking ${params.number}`} />
        {query.isError ? (
          <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
        ) : (
          <BookingLoading label="Loading your booking" />
        )}
      </NonScrollableContainer>
    );
  }

  const view = bookingView(booking);

  return (
    <NonScrollableContainer>
      <SubpageHeader title={TITLE[view](booking.number)} />
      {view === "pay_booking_amount" ? (
        <PayBookingAmount booking={booking} autoStart={Boolean(params.pay)} onChanged={() => void refetch()} />
      ) : view === "confirming" ? (
        <Confirming booking={booking} />
      ) : view === "outcome" ? (
        <Outcome booking={booking} />
      ) : (
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md }}>
          <SummaryCard
            title={booking.product.title}
            image={booking.product.cover_image}
            lines={[datesLine(booking), `${howLabel(booking.delivery_mode)} · ${booking.shop.name}`]}
            footer={
              <MoneyLine label="Paid now · counts toward the rent" amount={money(booking.money.booking_amount)} />
            }
          />
        </View>
      )}
    </NonScrollableContainer>
  );
}
