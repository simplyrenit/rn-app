import { useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { RouteProps } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect } from "react";
import { BookingDetails } from "./booking-details";

/**
 * The booking screen of BK-08 (the timeline, every payment and refund, changing
 * the time, cancelling) for a booking whose own screen is something else: the
 * day of the handover while it is `ready`, the rental while it is `out`. Those
 * screens link here; nothing about the booking is shown in only one of the two.
 */
export default function BookingDetailsScreen() {
  const { params } = useRoute<RouteProps<"BookingDetails">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const query = useBooking(params.number);
  const { refetch } = query;

  useEffect(() => {
    if (focused && active) void refetch();
  }, [focused, active, refetch]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title={`Booking ${params.number}`} />
      {query.data ? (
        <BookingDetails booking={query.data} />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading your booking" />
      )}
    </NonScrollableContainer>
  );
}
