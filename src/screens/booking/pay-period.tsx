import { payPeriod, useBooking } from "@/backend/bookings";
import { GetHelp } from "@/components/booking/get-help";
import { BookingLoadError, BookingLoading, BottomBar, Notice, Panel } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { usePay } from "@/components/booking/use-pay";
import { useServerNow } from "@/components/booking/use-server-now";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { apiError } from "@/lib/api-error";
import { payPeriodCopy, payPeriodErrorText } from "@/lib/billing";
import { BookingCustomer, SLOW_POLL_MS, payButtonLabel, payPhaseText, todayIst } from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";
import { CalendarDaysIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";

function PayPeriod({
  booking,
  n,
  receivedAt,
  watching,
  refresh,
}: {
  booking: BookingCustomer;
  n: number;
  receivedAt: number;
  watching: boolean;
  refresh: () => Promise<BookingCustomer | undefined>;
}) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const now = useServerNow(booking.server_time, receivedAt, SLOW_POLL_MS);
  const copy = payPeriodCopy(booking, n, todayIst(now));
  // The tap's work reads the booking as it is at the tap, not as it was when this was drawn.
  const latest = useRef(booking);
  latest.current = booking;

  const openBooking = () => navigation.navigate("Booking", { number: booking.number });

  const { phase, pay } = usePay(booking.number, {
    onResult: () => {
      void refresh();
      // The schedule on the rental screen behind reads the month's new state too.
      void queryClient.invalidateQueries("bookings");
    },
    onError: (error) => toast.error("We couldn't start the payment", { message: payPeriodErrorText(apiError(error)) }),
  });

  const tapPay = () => {
    void pay(async () => {
      // The one rule for resuming any payment (P2-1): the booking carries the open page of the month that is due, and
      // only when it is not this month's (or there is none) is a page asked for.
      const current = latest.current;
      const open = current.pay_now?.period === n ? current.pay_now.payment : null;
      if (open) return open;
      try {
        return await payPeriod(booking.number, n);
      } catch (error) {
        const failure = apiError(error);
        // Paid meanwhile, not due yet, or past its grace: the booking says which.
        if (failure?.code === "period_paid" || failure?.code === "period_not_due" || failure?.code === "period_lapsed") {
          toast.error(payPeriodErrorText(failure));
          await refresh();
          return null;
        }
        throw error;
      }
    });
  };

  // A slow bank: ask, slowly, until the server says the month is paid.
  const waiting = watching && copy.state === "to_pay" && phase === "pending";
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void refresh(), SLOW_POLL_MS);
    return () => clearInterval(timer);
    // `refresh` is recreated each render; only the state matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const note = payPhaseText(phase);
  const working = phase === "working";

  if (copy.state !== "to_pay") {
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
            {paid ? <CheckCircleIcon size={40} color={color.success} /> : <CalendarDaysIcon size={36} color={color.textBody} />}
          </View>
          <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
            {paid ? `${copy.period?.label ?? "Rent"} paid` : copy.period?.label ?? "Nothing to pay"}
          </Text>
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
            {copy.done}
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
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: space.md, gap: space.lg }}
      >
        <View style={{ alignItems: "center", gap: 6, paddingTop: space.lg, paddingBottom: space.sm }}>
          <Text fontSize="text-sm" tone="body" style={{ textAlign: "center" }}>
            {copy.sub}
          </Text>
          <Text fontSize="text-3xl" fontWeight="font-bold" accessibilityRole="header" accessibilityLabel={`${copy.title}, ${copy.amount}`}>
            {copy.amount}
          </Text>
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
            {copy.line}
          </Text>
        </View>

        <Panel>
          {copy.payBy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 52, paddingHorizontal: space.md }}>
              <ClockIcon size={20} color={copy.period?.state === "overdue" ? color.danger : color.brandText} />
              <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                {copy.payBy}
              </Text>
            </View>
          ) : null}
          {copy.sent ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                minHeight: 52,
                paddingHorizontal: space.md,
                borderTopWidth: copy.payBy ? 1 : 0,
                borderTopColor: color.line,
              }}
            >
              <CalendarDaysIcon size={20} color={color.text} />
              <Text fontSize="text-md" style={{ flex: 1 }}>
                {copy.sent}
              </Text>
            </View>
          ) : null}
        </Panel>

        {copy.info ? (
          <Notice tone="brand" icon="info">
            {copy.info}
          </Notice>
        ) : null}

        {copy.warning ? (
          <View style={{ flexDirection: "row", gap: space.sm, paddingHorizontal: space.xs }}>
            <ExclamationTriangleIcon size={16} color={color.warning} />
            <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
              {copy.warning}
            </Text>
          </View>
        ) : null}

        <Panel>
          <GetHelp booking={booking} />
        </Panel>
      </ScrollView>

      <BottomBar>
        {note ? (
          <Text fontSize="text-sm" tone={phase === "failed" ? "danger" : "body"} accessibilityRole="alert">
            {note}
          </Text>
        ) : null}
        <Button onPress={tapPay} loading={working} disabled={working} accessibilityLabel={`${copy.title}: pay ${copy.amount}`}>
          {payButtonLabel(phase === "ended" ? "idle" : phase, copy.button)}
        </Button>
      </BottomBar>
    </View>
  );
}

/**
 * BK-13 for a month (ENG-282, Figma 9477:5285), "Rent due": one month of a monthly-billed booking, or the notice for
 * ending early. Opened from a due or overdue row of the schedule and from the overdue alert. It pays the way the deposit
 * does: the booking's own `pay_now.payment` when that is this month's, else `…/periods/{n}/pay/`, then `usePay`. The
 * screen draws what the booking says, so opening it after the month was paid shows it paid.
 */
export default function PayPeriodScreen() {
  const { params } = useRoute<RouteProps<"PayPeriod">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const query = useBooking(params.number);
  const { refetch } = query;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  const notice = query.data?.money.periods?.find((p) => p.booking === params.number && p.n === params.n)?.kind === "notice";
  return (
    <NonScrollableContainer>
      <SubpageHeader title={notice ? "Notice due" : "Rent due"} />
      {query.data ? (
        <PayPeriod
          booking={query.data}
          n={params.n}
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
