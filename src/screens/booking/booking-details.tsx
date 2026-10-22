import { answerWindowChange, bookingQueryKey, fetchCancelOutcome } from "@/backend/bookings";
import { CancelSheet, CancelSheetHandle } from "@/components/booking/cancel-sheet";
import { GetHelp } from "@/components/booking/get-help";
import { ClaimRows } from "@/components/claims/claim-rows";
import { Records } from "@/components/capture/record-card";
import { Panel, SummaryCard } from "@/components/booking/parts";
import { PaymentSchedule } from "@/components/booking/payment-schedule";
import { PaymentsList } from "@/components/booking/payments-list";
import { Timeline } from "@/components/booking/timeline";
import { Button, Text } from "@/components/core";
import { apiError } from "@/lib/api-error";
import { canPayPeriod, isMonthly } from "@/lib/billing";
import {
  BookingCustomer,
  bookingBanner,
  bookingHow,
  CancelOutcome,
  cancelHint,
  cancelledKey,
  datesLine,
  deliveryPlace,
  money,
  timelineRows,
  todayIst,
  windowErrorText,
  windowRequestCopy,
} from "@/lib/booking";
import { COURIER, byRenit } from "@/lib/delivery";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { correctedNow } from "@/lib/server-clock";
import { kmText } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckCircleIcon, ClockIcon, MapPinIcon, XCircleIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

/**
 * BK-08, the booking screen: where the booking stands, what happened and what
 * comes next, every payment and refund with its status (N16), and what the
 * customer can do now. What is offered follows the server's `can` list, so the
 * screen never shows a button the server would refuse.
 *
 * The deposit is paid from here ("Pay the deposit", BK-13) whenever the server
 * allows it, asked for or not. The day of the handover and the rental have their
 * own screens (`day-of.tsx`, `rental-active.tsx`) and link back to this one.
 */
export function BookingDetails({ booking, receivedAt }: { booking: BookingCustomer; receivedAt: number }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cancelSheet = useRef<CancelSheetHandle>(null);
  const [answering, setAnswering] = useState<"accept" | "decline" | null>(null);
  const busy = useRef(false);

  const banner = bookingBanner(booking, queryClient.getQueryData<CancelOutcome>(cancelledKey(booking.number)));
  const rows = timelineRows(booking);
  const request = windowRequestCopy(booking);
  const can = (action: string) => booking.can.includes(action);

  // What cancelling would cost right now, for the line under "Cancel booking". Asked
  // again whenever the stage or the window moves, since the answer changes with them.
  const cancelQuery = useQuery(
    ["booking-cancel", booking.number, booking.stage, booking.window?.start ?? null],
    () => fetchCancelOutcome(booking.number),
    { enabled: can("cancel"), staleTime: 0, retry: 0 }
  );

  const answer = async (accept: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setAnswering(accept ? "accept" : "decline");
    try {
      queryClient.setQueryData(bookingQueryKey(booking.number), await answerWindowChange(booking.number, accept));
      toast.success(accept ? "Arrival time moved" : "Kept your arrival time");
    } catch (error) {
      const failure = apiError(error);
      toast.error("We couldn't send your answer", { message: windowErrorText(failure) });
      if (failure && failure.status > 0) void queryClient.invalidateQueries(bookingQueryKey(booking.number));
    } finally {
      busy.current = false;
      setAnswering(null);
    }
  };

  const tint = {
    success: { bg: color.successWash, fg: color.success, Icon: CheckCircleIcon },
    brand: { bg: color.brandPanel, fg: color.brandText, Icon: ClockIcon },
    warning: { bg: color.warningWash, fg: color.warning, Icon: XCircleIcon },
    neutral: { bg: color.surfaceRaised, fg: color.textBody, Icon: booking.exit ? XCircleIcon : CheckCircleIcon },
  }[banner.tone];

  // The shop's exact address is on the booking only once the deposit is paid (stage `ready`).
  // Drawn only when it is text: anything else from the server must not reach a <Text>.
  const address = typeof booking.shop.address === "string" && booking.shop.address ? booking.shop.address : null;
  // Owner delivery: the customer's own address, as it was chosen at Book now.
  const delivery = deliveryPlace(booking.delivery_address);
  const where =
    booking.delivery_mode === "pickup"
      ? address ??
        [
          booking.distance_km ? `${kmText(booking.distance_km)} away.` : null,
          // An extension has no handover: the item is already with the customer.
          booking.extends ? "The item stays with you." : booking.is_open ? "The full address shows once the deposit is paid." : null,
        ]
          .filter(Boolean)
          .join(" ")
      : delivery
        ? `Delivered to ${delivery.title}: ${delivery.line}`
        : byRenit(booking)
          ? `${COURIER} brings it to your address.`
          : "The shop brings it to your address.";

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
      <View
        accessible
        accessibilityLabel={banner.sub ? `${banner.title}. ${banner.sub}` : banner.title}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          padding: space.md,
          borderRadius: radius.card,
          backgroundColor: tint.bg,
        }}
      >
        <tint.Icon size={32} color={tint.fg} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-lg" fontWeight="font-bold">
            {banner.title}
          </Text>
          {banner.sub ? (
            <Text fontSize="text-sm" tone="body">
              {banner.sub}
            </Text>
          ) : null}
        </View>
      </View>

      {can("set_window") ? (
        <Button onPress={() => navigation.navigate("BookingWindow", { number: booking.number })}>
          Pick your arrival window
        </Button>
      ) : null}

      {can("pay_deposit") ? (
        // Asked for (`due`): the next thing to do. Not asked for yet: it may still be paid early.
        <Button
          variant={booking.money.deposit_state === "due" && !can("set_window") ? "primary" : "outline"}
          onPress={() => navigation.navigate("BookingDeposit", { number: booking.number })}
        >
          {`Pay the deposit · ${money(booking.money.deposit)}`}
        </Button>
      ) : null}

      {/* A record that is not finished is never out of sight: it can be made or carried on from
          here for as long as the server takes it, after either code too (review r1 #2). */}
      <Records
        role="customer"
        booking={booking}
        receivedAt={receivedAt}
        title={`${booking.product.title} · ${booking.shop.name}`}
        other="the shop"
      />

      {/* The reports and claims on this booking (a fault, the shop's damage claim), each with where it stands. */}
      <ClaimRows ids={booking.claims} role="customer" />

      {request ? (
        <Panel style={{ padding: space.md, gap: space.sm, borderColor: color.brandPanelLine, backgroundColor: color.brandPanel }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {request.title}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {request.body}
          </Text>
          {request.canAnswer ? (
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                loading={answering === "decline"}
                disabled={answering !== null}
                onPress={() => void answer(false)}
              >
                Decline
              </Button>
              <Button
                style={{ flex: 1 }}
                loading={answering === "accept"}
                disabled={answering !== null}
                onPress={() => void answer(true)}
              >
                Accept
              </Button>
            </View>
          ) : null}
        </Panel>
      ) : null}

      <SummaryCard
        title={booking.product.title}
        image={booking.product.cover_image}
        lines={[datesLine(booking), `${bookingHow(booking)} · rent ${money(booking.money.rent)}`]}
        footer={
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <MapPinIcon size={20} color={color.text} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                {[booking.shop.name, booking.shop.locality].filter(Boolean).join(" · ")}
              </Text>
              {where ? (
                <Text fontSize="text-sm" tone="body">
                  {where}
                </Text>
              ) : null}
            </View>
          </View>
        }
      />

      {rows.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Text role="sectionTitle" accessibilityRole="header">
            Timeline
          </Text>
          <Panel style={{ padding: space.md }}>
            <Timeline rows={rows} />
          </Panel>
        </View>
      ) : null}

      {/* ENG-282: the months of a monthly-billed booking, above the payments that paid them. */}
      {isMonthly(booking.money) ? (
        <PaymentSchedule
          money={booking.money}
          side="customer"
          today={todayIst(correctedNow(booking.server_time, receivedAt))}
          onPay={(period) => navigation.navigate("PayPeriod", { number: booking.number, n: period.n })}
          canPay={(period) => canPayPeriod(period, booking)}
        />
      ) : null}

      <PaymentsList booking={booking} />

      {can("request_window_change") || can("cancel") ? (
        <Panel>
          {can("request_window_change") ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={() => navigation.navigate("BookingWindow", { number: booking.number })}
              style={{
                minHeight: MIN_TOUCH_TARGET + 8,
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                paddingHorizontal: space.md,
              }}
            >
              <ClockIcon size={20} color={color.text} />
              <Text fontSize="text-md" style={{ flex: 1 }}>
                Change my arrival time
              </Text>
              <ChevronRightIcon size={20} color={color.text} />
            </TouchableOpacity>
          ) : null}
          {can("cancel") ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel booking"
              accessibilityHint={cancelQuery.data ? cancelHint(cancelQuery.data, byRenit(booking)) : undefined}
              activeOpacity={0.7}
              onPress={() => cancelSheet.current?.present()}
              style={{
                minHeight: MIN_TOUCH_TARGET + 8,
                flexDirection: "row",
                gap: space.md,
                padding: space.md,
                borderTopWidth: can("request_window_change") ? 1 : 0,
                borderTopColor: color.line,
              }}
            >
              <XCircleIcon size={20} color={color.danger} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text fontSize="text-md" fontWeight="font-bold" tone="danger">
                  Cancel booking
                </Text>
                {cancelQuery.data ? (
                  <Text fontSize="text-sm" tone="body">
                    {cancelHint(cancelQuery.data, byRenit(booking))}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ) : null}
        </Panel>
      ) : null}

      <Panel>
        <GetHelp booking={booking} />
      </Panel>

      <CancelSheet ref={cancelSheet} number={booking.number} courier={byRenit(booking)} />
    </ScrollView>
  );
}
