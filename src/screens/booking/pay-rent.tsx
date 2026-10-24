import { bookingQueryKey, payRent } from "@/backend/bookings";
import { CancelSheet, CancelSheetHandle } from "@/components/booking/cancel-sheet";
import { GetHelp } from "@/components/booking/get-help";
import { ShopAnswer } from "@/components/booking/items";
import { BottomBar, MoneyLine, Notice, Panel, TextButton } from "@/components/booking/parts";
import { PushNotice } from "@/components/booking/push-notice";
import { usePay } from "@/components/booking/use-pay";
import { useReadAt } from "@/components/booking/use-read-at";
import { useServerNow } from "@/components/booking/use-server-now";
import { Button, Text } from "@/components/core";
import { apiError } from "@/lib/api-error";
import {
  BookingCustomer,
  Charge,
  SLOW_POLL_MS,
  payButtonLabel,
  payPhaseText,
  payRentCopy,
  payRentErrorText,
  rentCharge,
  sameCharge,
  timeLeft,
} from "@/lib/booking";
import { basketPayRent, isBasket, partlyAccepted } from "@/lib/booking-lines";
import { byRenit } from "@/lib/delivery";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { clockSkewMs } from "@/lib/server-clock";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";

/**
 * BK-06, "<shop> accepted": pay the rest of the rent to confirm the booking.
 *
 * What the button names is what the pay page takes. Every tap asks rn-api for
 * the payment (`pay-rent`), and the server decides at that call whether the
 * deposit joins the rent (A-13), so its answer can be for more than the screen
 * said a moment ago. The answer's booking goes on screen first; the page opens
 * only when its amount is the one the button showed. If not, the card redraws
 * with the new sum and the customer taps again knowing it.
 *
 * The deadline is the server's (`rent_due_at`), and the countdown to it runs
 * against the server's clock (`server_time`, P3-17), so a phone with a wrong
 * clock still shows the right time left. It is for the eye and stops nothing.
 * When the deadline passes, or the bank is slow, the booking is read again on a
 * slow timer until the server says what happened.
 */
export function PayRent({
  booking,
  receivedAt,
  watching,
  refresh,
}: {
  booking: BookingCustomer;
  /** When this booking's answer arrived: with its `server_time`, the server's clock. */
  receivedAt: number;
  /** The screen is in front of an active app: the only time it reads on a timer. */
  watching: boolean;
  /** Reads the booking again and returns it. */
  refresh: () => Promise<BookingCustomer | undefined>;
}) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const cancelSheet = useRef<CancelSheetHandle>(null);
  const now = useServerNow(booking.server_time, receivedAt, 1000);
  // A payment rn-api answered a tap with that was not the one on the button. It
  // is what the screen shows from then on, whatever the booking's copy says.
  const [offered, setOffered] = useState<Charge | null>(null);
  const [changed, setChanged] = useState(false);
  const shown = offered ?? rentCharge(booking);
  // A basket names its items; after a partial accept, what was left out and the ₹99 that comes back (CT-26, CT-27).
  const copy = basketPayRent(booking, payRentCopy(booking, now, shown), now);
  const partial = partlyAccepted(booking);
  // The tap's work finishes later; it must compare against what is on screen at the tap.
  const latest = useRef(shown);
  latest.current = shown;

  const { phase, pay } = usePay(booking.number, {
    onResult: async (result) => {
      const fresh = await refresh();
      // The rent is in. The arrival window is the next thing, one tap away.
      if (result === "paid" && fresh?.can.includes("set_window")) {
        navigation.navigate("BookingWindow", { number: booking.number });
      }
    },
    onError: (error) => {
      toast.error("We couldn't start the payment", { message: payRentErrorText(apiError(error)) });
    },
  });

  const tapPay = () => {
    setChanged(false);
    void pay(async () => {
      const named = latest.current;
      let answer;
      try {
        answer = await payRent(booking.number);
      } catch (error) {
        // The booking is no longer waiting for the rent: it was paid (a slow bank,
        // another phone), or it lapsed. Not an error to show; the booking says which.
        if (apiError(error)?.code !== "stage_not_allowed") throw error;
        await refresh();
        return null;
      }
      queryClient.setQueryData(bookingQueryKey(booking.number), answer.booking);
      if (!sameCharge(named, answer.payment)) {
        // Not opened: the customer has not seen this sum. Show it, and ask for the tap again.
        const { purpose, amount, deposit_part } = answer.payment;
        setOffered({ purpose, amount, deposit_part });
        setChanged(true);
        return null;
      }
      return answer.payment;
    });
  };

  const dueAt = booking.pay_now?.due_at ?? booking.money.rent_due_at;
  const left = timeLeft(dueAt, now);
  useReadAt(dueAt, () => void refresh(), clockSkewMs(booking.server_time, receivedAt));

  // Nothing else reads an accepted booking by itself. While the bank is slow, or
  // once the deadline has passed by this phone's clock, ask until the server answers.
  const waiting = watching && (phase === "pending" || (Boolean(dueAt) && left === null));
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void refresh(), SLOW_POLL_MS);
    return () => clearInterval(timer);
    // `refresh` is recreated each render; only the state matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const note = payPhaseText(phase);
  const working = phase === "working";

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.lg }}
      >
        <View style={{ alignItems: "center", gap: space.sm }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: partial ? color.warningWash : color.successWash,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: space.sm,
            }}
          >
            {partial ? (
              <ExclamationTriangleIcon size={36} color={color.warning} />
            ) : (
              <CheckCircleIcon size={40} color={color.success} />
            )}
          </View>
          <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center" }}>
            {copy.title}
          </Text>
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
            {copy.sub}
          </Text>
          {left ? (
            // Not a live region: a screen reader hears the deadline above, not every second.
            <View
              accessible
              accessibilityLabel={`Time left to pay: ${left}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: space.md,
                paddingVertical: 4,
                borderRadius: radius.full,
                backgroundColor: color.brandPanel,
              }}
            >
              <ClockIcon size={16} color={color.brandText} />
              <Text fontSize="text-sm" fontWeight="font-bold" tone="brand" style={{ fontVariant: ["tabular-nums"] }}>
                {`${left} left`}
              </Text>
            </View>
          ) : null}
        </View>

        {changed ? (
          <Notice tone="warning" icon="warning">
            The amount to pay has changed. Check the new total below, then tap Pay.
          </Notice>
        ) : null}

        {isBasket(booking) ? <ShopAnswer booking={booking} /> : null}

        <Panel style={{ padding: space.md, gap: space.sm }}>
          {copy.lines.map((line) => (
            <MoneyLine key={line.label} {...line} />
          ))}
          <View style={{ height: 1, backgroundColor: color.line }} />
          <MoneyLine {...copy.total} bold />
        </Panel>

        {copy.note ? <Notice>{copy.note}</Notice> : null}

        <PushNotice deadline />

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
        <Button onPress={tapPay} loading={working} disabled={working}>
          {payButtonLabel(phase === "ended" ? "idle" : phase, copy.button)}
        </Button>
        <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
          {copy.small}
        </Text>
        {booking.can.includes("cancel") ? (
          <TextButton label={copy.cancel} tone="danger" disabled={working} onPress={() => cancelSheet.current?.present()} />
        ) : null}
      </BottomBar>

      <CancelSheet ref={cancelSheet} number={booking.number} courier={byRenit(booking)} booking={booking} />
    </View>
  );
}
