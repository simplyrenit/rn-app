import { useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading } from "@/components/booking/parts";
import { SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { BookingView, bookingView } from "@/lib/booking";
import { RouteProps } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import { BookingDetails } from "./booking-details";
import { Confirming } from "./confirming";
import { Outcome } from "./outcome";
import { PayBookingAmount } from "./pay-booking-amount";
import { PayRent } from "./pay-rent";

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
  pay_rent: () => "",
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

  const refresh = async () => (await refetch()).data;

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
        <PayBookingAmount booking={booking} autoStart={Boolean(params.pay)} refresh={refresh} />
      ) : view === "confirming" ? (
        <Confirming booking={booking} />
      ) : view === "outcome" ? (
        <Outcome booking={booking} />
      ) : view === "pay_rent" ? (
        <PayRent booking={booking} refresh={refresh} />
      ) : (
        <BookingDetails booking={booking} />
      )}
    </NonScrollableContainer>
  );
}
