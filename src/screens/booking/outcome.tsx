import {
  Alternatives,
  bookingQueryKey,
  fetchAlternatives,
  refundBookingAmount,
} from "@/backend/bookings";
import { Notice, Panel, Pill, TextButton, Thumb } from "@/components/booking/parts";
import { PaymentsList } from "@/components/booking/payments-list";
import { useReadAt } from "@/components/booking/use-read-at";
import { Button, Skeleton, Text } from "@/components/core";
import { apiError } from "@/lib/api-error";
import {
  BookItem,
  BookingCustomer,
  bookingAmountCopy,
  money,
  outcomeCopy,
  rangeLabel,
  shopNameOf,
} from "@/lib/booking";
import { SCREEN_GUTTER, MIN_TOUCH_TARGET, radius, space } from "@/lib/design-tokens";
import { useDistanceTo } from "@/lib/distance";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { BackendProduct, useTypedNavigation } from "@/lib/types";
import React, { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { CalendarIcon, ClockIcon } from "react-native-heroicons/outline";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

/** The same item from another owner: who, how far, the day rate, and "Ask this owner". */
function OtherOwner({ product, onAsk }: { product: BackendProduct; onAsk: () => void }) {
  const distance = useDistanceTo(product.coordinates);
  return (
    <Panel style={{ padding: space.md, gap: space.md }}>
      <View style={{ flexDirection: "row", gap: space.md }}>
        <Thumb uri={product.cover_image} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={2}>
            {product.title}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {[shopNameOf(product), distance].filter(Boolean).join(" · ")}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, flexWrap: "wrap" }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {`${money(product.rate)} a day`}
            </Text>
            {product.live_booking ? <Pill label="Live booking" tone="success" /> : null}
          </View>
        </View>
      </View>
      <Button variant="outline" onPress={onAsk} accessibilityLabel={`Ask ${shopNameOf(product)}`}>
        Ask this owner
      </Button>
    </Panel>
  );
}

/**
 * BK-09 and BK-10, "Your request": the owner said no, did not answer, or (after
 * accepting) cancelled or did not come. The customer is told plainly why, what
 * happens to their money, and what they can do next: other dates for this item,
 * the same item from other owners, or the ₹99 back now.
 *
 * Renit never moves a booking by itself. Picking one of the options starts a
 * new request, and the ₹99 moves to it while the pick-by time has not passed.
 */
export function Outcome({ booking }: { booking: BookingCustomer }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const copy = outcomeCopy(booking);
  const Icon = copy.icon === "clock" ? ClockIcon : CalendarIcon;

  const options = useQuery<Alternatives>(["booking-alternatives", booking.number], () =>
    fetchAlternatives(booking.number)
  );
  const { refetch } = options;

  // When the pick-by time passes the ₹99 stops moving and is refunded: read both again then.
  useReadAt(booking.pick_deadline_at, () => {
    void refetch();
    void queryClient.invalidateQueries(bookingQueryKey(booking.number));
  });

  const moves = options.data?.booking_amount_moves;
  const amountCard = bookingAmountCopy(booking, moves);

  /** A new request for these dates. The ₹99 moves to it while it still can. */
  const ask = (item: BookItem, firstDay: string, lastDay: string) => {
    const moved_from = moves ? booking.number : undefined;
    if (booking.delivery_mode === "pickup") {
      navigation.navigate("ReviewAndBook", {
        item,
        first_day: firstDay,
        last_day: lastDay,
        delivery_mode: "pickup",
        moved_from,
      });
    } else {
      // Delivery is priced per shop and address, so that choice is made again.
      navigation.navigate("BookingDates", { product: item.name, first_day: firstDay, last_day: lastDay, moved_from });
    }
  };

  const [refunding, setRefunding] = useState(false);
  const busy = useRef(false);
  const refundNow = async () => {
    if (busy.current) return;
    busy.current = true;
    setRefunding(true);
    try {
      queryClient.setQueryData(bookingQueryKey(booking.number), await refundBookingAmount(booking.number));
      void refetch();
    } catch (error) {
      const failure = apiError(error);
      // `stage_not_allowed`: it has already been refunded or moved. The booking says which.
      if (failure?.code === "stage_not_allowed") void queryClient.invalidateQueries(bookingQueryKey(booking.number));
      else toast.error("We couldn't start the refund", { message: failure?.message ?? "Check your connection and try again." });
    } finally {
      busy.current = false;
      setRefunding(false);
    }
  };

  const sameItem: BookItem = {
    name: booking.product.name,
    title: booking.product.title,
    cover_image: booking.product.cover_image,
    shop_name: booking.shop.name,
  };
  const dates = options.data?.other_dates ?? [];
  const owners = options.data?.other_owners ?? [];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: space.md,
        paddingBottom: insets.bottom + space.lg,
        gap: space.lg,
      }}
    >
      <View style={{ alignItems: "center", gap: space.md }}>
        {/* Calm on purpose: a grey disc, no red. A refusal is about the dates, not the customer. */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.full,
            backgroundColor: color.surfaceRaised,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={28} color={color.textBody} />
        </View>
        <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
          {copy.title}
        </Text>
        <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
          {copy.body}
        </Text>
      </View>

      <Panel style={{ padding: space.md, gap: space.xs }}>
        <Text fontSize="text-md" fontWeight="font-bold">
          {amountCard.title}
        </Text>
        <Text fontSize="text-sm" tone="body">
          {amountCard.body}
        </Text>
      </Panel>

      {options.isLoading ? (
        <View accessible accessibilityRole="progressbar" accessibilityLabel="Looking for other options" style={{ gap: space.sm }}>
          <Skeleton width="100%" height={52} />
          <Skeleton width="100%" height={140} />
        </View>
      ) : options.isError ? (
        <Notice icon="warning">
          {"We couldn't load other dates and owners. "}
          <Text fontSize="text-sm" fontWeight="font-bold" tone="brand" accessibilityRole="button" onPress={() => void refetch()}>
            Try again
          </Text>
        </Notice>
      ) : dates.length === 0 && owners.length === 0 ? (
        <Notice>There are no other dates or owners to offer for this item right now.</Notice>
      ) : (
        <>
          {dates.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <Text role="sectionTitle" accessibilityRole="header">
                {`Other dates for this ${booking.product.title}`}
              </Text>
              {dates.map((range) => {
                const label = rangeLabel(range.first_day, range.last_day);
                return (
                  <TouchableOpacity
                    key={range.first_day}
                    accessibilityRole="button"
                    accessibilityLabel={`Ask for ${label}`}
                    activeOpacity={0.7}
                    onPress={() => ask(sameItem, range.first_day, range.last_day)}
                    style={{
                      minHeight: MIN_TOUCH_TARGET + 4,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.sm,
                      paddingHorizontal: space.md,
                      borderRadius: radius.button,
                      borderWidth: 1,
                      borderColor: color.inputLine,
                      backgroundColor: color.surface,
                    }}
                  >
                    <CalendarIcon size={20} color={color.brandText} />
                    <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                      {label}
                    </Text>
                    <ChevronRightIcon size={20} color={color.text} />
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {owners.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <Text role="sectionTitle" accessibilityRole="header">
                The same item from other owners
              </Text>
              {owners.map((product) => (
                <OtherOwner
                  key={product.name}
                  product={product}
                  onAsk={() =>
                    ask(
                      {
                        name: product.name,
                        title: product.title,
                        cover_image: product.cover_image ?? null,
                        shop_name: shopNameOf(product),
                      },
                      booking.first_day,
                      booking.last_day
                    )
                  }
                />
              ))}
            </View>
          ) : null}
        </>
      )}

      {/* Each payment and each refund, with where it is going and when to expect it (N16). */}
      <PaymentsList booking={booking} />

      {booking.can.includes("refund_now") ? (
        <TextButton
          label={`No thanks, refund my ${money(booking.money.booking_amount)}`}
          onPress={refundNow}
          disabled={refunding}
        />
      ) : null}
    </ScrollView>
  );
}
