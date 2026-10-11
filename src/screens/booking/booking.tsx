import { useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading, MoneyLine, SummaryCard } from "@/components/booking/parts";
import { SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { datesLine, howLabel, money } from "@/lib/booking";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { RouteProps } from "@/lib/types";
import { useRoute } from "@react-navigation/native";
import React from "react";
import { View } from "react-native";
import { PayBookingAmount } from "./pay-booking-amount";

/**
 * One booking, at whatever stage the server says it is in. The screen holds no
 * stage of its own: it reads the booking and draws the view that stage calls
 * for, so opening it from Book now, from a push, from the Rentals tab or after
 * the app was closed in the middle all show the same thing.
 */
export default function BookingScreen() {
  const { params } = useRoute<RouteProps<"Booking">>();
  const query = useBooking(params.number);
  const booking = query.data;

  if (!booking) {
    return (
      <NonScrollableContainer>
        <SubpageHeader title={`Booking ${params.number}`} />
        {query.isError ? (
          <BookingLoadError error={query.error} what="this booking" onRetry={() => void query.refetch()} />
        ) : (
          <BookingLoading label="Loading your booking" />
        )}
      </NonScrollableContainer>
    );
  }

  const unpaid = booking.ring_state === "awaiting_payment" && !booking.exit;

  return (
    <NonScrollableContainer>
      <SubpageHeader title={unpaid ? "" : `Booking ${booking.number}`} />
      {unpaid ? (
        <PayBookingAmount
          booking={booking}
          autoStart={Boolean(params.pay)}
          onChanged={() => void query.refetch()}
        />
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
