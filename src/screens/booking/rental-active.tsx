import { EndEarlySheet, EndEarlySheetHandle } from "@/components/booking/end-early-sheet";
import { GetHelp } from "@/components/booking/get-help";
import { BottomBar, Notice, Panel } from "@/components/booking/parts";
import { PaymentSchedule } from "@/components/booking/payment-schedule";
import { ClaimRows } from "@/components/claims/claim-rows";
import { Records } from "@/components/capture/record-card";
import { useServerNow } from "@/components/booking/use-server-now";
import { Button, Text } from "@/components/core";
import { LinkRow } from "@/components/handover/parts";
import { canPayPeriod, endingEarlyLine, isMonthly, overdueAlert, overduePeriod } from "@/lib/billing";
import { BookingCustomer, RentPeriod, money, todayIst } from "@/lib/booking";
import { faultRowSub } from "@/lib/claims";
import { activeCopy, bannerTone, ownerAbsentAt, ownerAbsentKey } from "@/lib/day-of";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React, { useRef } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ClockIcon, LockClosedIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/**
 * BK-20, "Your rental": the booking is `out`. When it is due back, what a late
 * day costs (and what being late has cost so far, N11), extending, the deposit
 * Renit holds, and the way into the return.
 *
 * The customer's handover record is still taken after the code, so it can be
 * made or finished from here (review r1 #2): the shop may have typed the code
 * while the customer was still shooting. Once "Owner did not come" is reported,
 * the late-day line gives way to what was reported (review r1 #11).
 *
 * A monthly-billed booking (ENG-282) also shows its months under the return-by card, each due month opening Rent due.
 * While a month is overdue an alert says when the rental ends, above the card, and the bar pays it; "End the rental
 * early" opens its sheet when the server offers it.
 */
export function RentalActive({ booking, receivedAt }: { booking: BookingCustomer; receivedAt: number }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const now = useServerNow(booking.server_time, receivedAt);
  const { number } = booking;
  const absentAt = ownerAbsentAt(booking, queryClient.getQueryData<string>(ownerAbsentKey(number)));
  const copy = activeCopy(booking, absentAt, now);
  const can = (action: string) => booking.can.includes(action);
  const late = copy.late.tone === "warning";
  const extension = booking.extensions?.[booking.extensions.length - 1] ?? null;
  const endSheet = useRef<EndEarlySheetHandle>(null);
  const today = todayIst(now);
  const monthly = isMonthly(booking.money);
  const overdue = monthly ? overduePeriod(booking.money) : null;
  const alert = overdue ? overdueAlert(overdue, booking.product.title, booking.money.rate) : null;
  // Paid from here only when it is this booking's own month and the server offers it (`canPayPeriod`).
  const payOverdue = overdue !== null && canPayPeriod(overdue, booking);
  const canPay = (period: RentPeriod) => canPayPeriod(period, booking);
  // Monthly: the notice while inside the minimum, else nothing (the months after are simply not charged).
  const ending = monthly ? endingEarlyLine(booking.money, today) : "Returning early gives no refund.";
  const payMonth = (period: RentPeriod) => navigation.navigate("PayPeriod", { number, n: period.n });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, paddingBottom: insets.bottom + space.lg, gap: space.md }}
      >
        <View style={{ gap: 2 }}>
          <Text role="screenTitle" accessibilityRole="header">
            {copy.title}
          </Text>
          <Text fontSize="text-md" tone="body">
            {copy.sub}
          </Text>
        </View>

        {/* B1: what Renit's desk says about the courier's return leg (a delay, a rider changed). */}
        {booking.courier?.banner ? (
          <Notice tone={bannerTone(booking.courier.banner)} icon="clock" title={booking.courier.banner.title}>
            {booking.courier.banner.body}
          </Notice>
        ) : null}

        {overdue && alert ? (
          <TouchableOpacity
            accessibilityRole={payOverdue ? "button" : undefined}
            accessibilityHint={payOverdue ? "Opens Rent due" : undefined}
            activeOpacity={0.8}
            disabled={!payOverdue}
            onPress={() => payMonth(overdue)}
          >
            <Notice tone="danger" icon="warning" title={alert.title}>
              {alert.body}
            </Notice>
          </TouchableOpacity>
        ) : null}

        <View
          accessible
          accessibilityLabel={`${copy.returnBy ?? "Rental active"}. ${copy.late.text}`}
          style={{
            flexDirection: "row",
            gap: space.md,
            padding: space.md,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: late ? color.warning : color.brandPanelLine,
            backgroundColor: late ? color.warningWash : color.brandPanel,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              backgroundColor: color.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ClockIcon size={20} color={late ? color.warning : color.brandText} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {copy.returnBy ?? "Rental active"}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {copy.late.text}
            </Text>
          </View>
        </View>

        {monthly ? <PaymentSchedule money={booking.money} side="customer" today={today} onPay={payMonth} canPay={canPay} /> : null}

        <Records
          role="customer"
          moments={["handover"]}
          booking={booking}
          receivedAt={receivedAt}
          title={`${booking.product.title} · ${booking.shop.name}`}
          other="the shop"
        />

        {extension ? (
          <Notice tone="brand" icon="clock">
            {`You asked to extend this rental (${extension}). Open it from your rentals to see where it stands.`}
          </Notice>
        ) : null}

        {/* A fault report, a "not as described" report, a damage claim: each opens with where it stands. */}
        <ClaimRows ids={booking.claims} role="customer" />

        <Panel>
          {can("extend") ? (
            <LinkRow
              title={monthly ? "Extend by a month" : "Extend this rental"}
              sub={
                monthly
                  ? "Adds a month to the schedule. The shop has to accept."
                  : "A new booking for the days after. The shop has to accept."
              }
              onPress={() => navigation.navigate("BookingExtend", { number })}
            />
          ) : null}
          {/* BK-20: reported within 24 hours of the handover, by the server's clock. */}
          {can("report_fault") ? (
            <LinkRow
              first={!can("extend")}
              title="Something doesn't work?"
              sub={faultRowSub(booking, now)}
              onPress={() => navigation.navigate("BookingFault", { number })}
            />
          ) : null}
          <LinkRow
            first={!can("extend") && !can("report_fault")}
            title="Booking details"
            sub="The timeline and your payments."
            onPress={() => navigation.navigate("BookingDetails", { number })}
          />
          <GetHelp booking={booking} first={false} />
          {can("end_early") ? (
            <LinkRow first={false} danger title="End the rental early" onPress={() => endSheet.current?.present()} />
          ) : null}
        </Panel>

        {copy.deposit ? (
          <Panel style={{ flexDirection: "row", gap: space.md, padding: space.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.full,
                backgroundColor: color.surfaceRaised,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockClosedIcon size={20} color={color.textBody} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                  Deposit
                </Text>
                <Text fontSize="text-md" fontWeight="font-bold">
                  {copy.deposit.amount}
                </Text>
              </View>
              <Text fontSize="text-sm" tone="body">
                {copy.deposit.sub}
              </Text>
            </View>
          </Panel>
        ) : null}

        {ending ? (
          <Text fontSize="text-sm" tone="body">
            {ending}
          </Text>
        ) : null}
      </ScrollView>
      <BottomBar>
        {overdue && payOverdue ? (
          <Button onPress={() => payMonth(overdue)}>{`Pay ${money(overdue.amount)}`}</Button>
        ) : (
          <Button variant="outline" onPress={() => navigation.navigate("BookingReturn", { number })}>
            {copy.button}
          </Button>
        )}
      </BottomBar>
      {monthly ? <EndEarlySheet ref={endSheet} booking={booking} /> : null}
    </View>
  );
}
