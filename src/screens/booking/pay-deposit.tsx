import { bookingQueryKey, useBooking } from "@/backend/bookings";
import { payDeposit } from "@/backend/handover";
import { GetHelp } from "@/components/booking/get-help";
import { BookingLoadError, BookingLoading, BottomBar, Notice, Panel } from "@/components/booking/parts";
import { PushNotice } from "@/components/booking/push-notice";
import { useAppActive } from "@/components/booking/use-app-active";
import { usePay } from "@/components/booking/use-pay";
import { useReadAt } from "@/components/booking/use-read-at";
import { useServerNow } from "@/components/booking/use-server-now";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { apiError } from "@/lib/api-error";
import { UPI_LIMIT } from "@/lib/card-checkout";
import { BookingCustomer, SLOW_POLL_MS, money, payButtonLabel, payPhaseText } from "@/lib/booking";
import { dayErrorText, depositCharge, depositCopy, depositOverdue } from "@/lib/day-of";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { clockSkewMs } from "@/lib/server-clock";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";

function Deposit({
  booking,
  receivedAt,
  watching,
  refresh,
}: {
  booking: BookingCustomer;
  receivedAt: number;
  watching: boolean;
  refresh: () => Promise<BookingCustomer | undefined>;
}) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  // Moved on four times a minute, so the screen notices the due time passing by itself.
  const now = useServerNow(booking.server_time, receivedAt, SLOW_POLL_MS);
  const copy = depositCopy(booking);
  // The due time has passed and the booking still says "to pay": the server is asking the
  // bank and then cancels. Until it says which, nothing may be paid (review r1 #9).
  const overdue = copy.state === "to_pay" && depositOverdue(booking, now);
  // rn-api answered a tap with a sum that was not the one on the button: shown, then asked for again.
  const [changed, setChanged] = useState(false);
  const shown = useRef(depositCharge(booking).amount);
  shown.current = depositCharge(booking).amount;
  // The tap's work reads the booking as it is at the tap, not as it was when this was drawn.
  const latest = useRef(booking);
  latest.current = booking;

  const openBooking = () => navigation.navigate("Booking", { number: booking.number });

  const { phase, pay } = usePay(booking.number, {
    onResult: async (result) => {
      const fresh = await refresh();
      // The deposit is held: the address and the handover code are on the booking now.
      if (result === "paid" && fresh?.stage === "ready") openBooking();
    },
    onError: (error) => toast.error("We couldn't start the payment", { message: dayErrorText(apiError(error), now) }),
  });

  const tapPay = () => {
    setChanged(false);
    void pay(async () => {
      const named = shown.current;
      // The one rule for resuming any payment (P2-1): the booking carries the pay page of
      // the payment that is open and can still be paid. Only when there is none is a new
      // one asked for. After a page has run out the booking is read again and carries none.
      const current = latest.current;
      const open = current.pay_now?.purpose === "deposit" ? current.pay_now.payment : null;
      if (open) return open;
      let answer;
      try {
        answer = await payDeposit(booking.number);
      } catch (error) {
        const failure = apiError(error);
        // Paid meanwhile (a slow bank, another phone), no window yet, or the booking moved on: the booking says which.
        if (failure?.code === "nothing_to_pay" || failure?.code === "stage_not_allowed" || failure?.code === "window_required") {
          await refresh();
          return null;
        }
        throw error;
      }
      queryClient.setQueryData(bookingQueryKey(booking.number), answer.booking);
      if (answer.payment.purpose !== "deposit" || Number(answer.payment.amount) !== Number(named)) {
        // Not opened: the customer has not seen this sum.
        setChanged(true);
        return null;
      }
      return answer.payment;
    });
  };

  // The due time passes, or the bank is slow: ask, slowly, until the server says what
  // happened (paid, or cancelled). One read at the due time is not enough: the server
  // first asks the bank, which can take longer than that.
  const skew = clockSkewMs(booking.server_time, receivedAt);
  useReadAt(copy.state === "to_pay" ? booking.money.deposit_due_at : null, () => void refresh(), skew);
  const waiting = watching && copy.state === "to_pay" && (phase === "pending" || overdue);
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void refresh(), SLOW_POLL_MS);
    return () => clearInterval(timer);
    // `refresh` is recreated each render; only the state matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const note = payPhaseText(phase);
  const working = phase === "working";

  if (copy.state === "paid" || copy.state === "none") {
    const paid = copy.state === "paid";
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SCREEN_GUTTER, gap: space.md }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: paid ? color.successWash : color.surfaceRaised,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {paid ? <CheckCircleIcon size={40} color={color.success} /> : <ExclamationTriangleIcon size={36} color={color.textBody} />}
          </View>
          <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
            {paid ? "Deposit paid" : "No deposit to pay"}
          </Text>
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
            {paid
              ? booking.stage === "ready"
                ? "Your handover code is ready."
                : "Renit holds it until the rental closes."
              : booking.exit
                ? "This booking has ended."
                : "This booking has no deposit."}
          </Text>
        </View>
        <BottomBar>
          <Button onPress={openBooking}>Open the booking</Button>
        </BottomBar>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.lg }}
      >
        <View style={{ alignItems: "center", gap: space.xs }}>
          <Text fontSize="text-sm" tone="body">
            {copy.sub}
          </Text>
          <Text fontSize="text-3xl" fontWeight="font-bold" accessibilityRole="header" accessibilityLabel={`Deposit ${copy.amount}`}>
            {copy.amount}
          </Text>
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
            {copy.refund}
          </Text>
        </View>

        {changed ? (
          <Notice tone="warning" icon="warning">
            The amount to pay has changed. Check it above, then tap Pay.
          </Notice>
        ) : null}

        {/* CT-43b, D48: one UPI payment can't be over ₹1 lakh. */}
        {Number(depositCharge(booking).amount) > UPI_LIMIT ? (
          <Notice tone="info" icon="info" title="Pay by card or net banking">
            This deposit is over ₹1 lakh.
          </Notice>
        ) : null}

        <Panel>
          {copy.payBy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md }}>
              <ClockIcon size={20} color={color.brandText} />
              <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                {copy.payBy}
              </Text>
            </View>
          ) : null}
          {copy.when ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                padding: space.md,
                borderTopWidth: copy.payBy ? 1 : 0,
                borderTopColor: color.line,
              }}
            >
              <CalendarDaysIcon size={20} color={color.text} />
              <Text fontSize="text-md" style={{ flex: 1 }}>
                {copy.when}
              </Text>
            </View>
          ) : null}
        </Panel>

        {copy.state === "window_first" ? (
          <Notice tone="warning" icon="clock">
            Pick your arrival window first. The deposit can be paid once the shop knows when you are coming.
          </Notice>
        ) : (
          <Notice tone="brand" icon="info">
            {copy.unlocks}
          </Notice>
        )}

        <View style={{ flexDirection: "row", gap: space.sm }}>
          <ExclamationTriangleIcon size={18} color={color.warning} />
          <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
            {copy.warning}
          </Text>
        </View>

        <PushNotice deadline />

        <Panel>
          <GetHelp booking={booking} />
        </Panel>
      </ScrollView>

      <BottomBar>
        {overdue ? (
          <Text fontSize="text-sm" tone="body" accessibilityRole="alert">
            The time to pay has passed. Checking what happened to this booking…
          </Text>
        ) : note ? (
          <Text fontSize="text-sm" tone={phase === "failed" ? "danger" : "body"} accessibilityRole="alert">
            {note}
          </Text>
        ) : null}
        {copy.state === "window_first" ? (
          <Button onPress={() => navigation.navigate("BookingWindow", { number: booking.number })}>
            Pick your arrival window
          </Button>
        ) : (
          <Button
            onPress={tapPay}
            loading={working}
            // Held once the due time has passed: a payment made now could land on a booking already cancelled.
            disabled={working || overdue}
            accessibilityLabel={`Pay the deposit, ${money(shown.current)}`}
          >
            {payButtonLabel(phase === "ended" ? "idle" : phase, copy.button)}
          </Button>
        )}
      </BottomBar>
    </View>
  );
}

/**
 * BK-13, "Deposit due". The deposit is asked for 24 hours before the handover
 * and must be paid 2 hours before it (N3b); paying it makes the booking `ready`,
 * which shows the address and the handover code. It is paid with the same hook as
 * the ₹99 and the rent: an open payment is resumed from the booking's own
 * `pay_now.payment`, a new one comes from `pay-deposit`, and `usePay` opens the
 * pay page and asks rn-api what happened.
 * The screen draws what the booking says, so opening it from a reminder after the
 * deposit was paid shows "Deposit paid".
 */
export default function PayDepositScreen() {
  const { params } = useRoute<RouteProps<"BookingDeposit">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const query = useBooking(params.number);
  const { refetch } = query;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Deposit due" />
      {query.data ? (
        <Deposit
          booking={query.data}
          receivedAt={query.dataUpdatedAt}
          watching={watching}
          refresh={async () => (await refetch()).data}
        />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading your booking" />
      )}
    </NonScrollableContainer>
  );
}
