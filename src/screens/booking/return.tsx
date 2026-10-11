import { bookingQueryKey, useBooking } from "@/backend/bookings";
import { returnItem } from "@/backend/handover";
import { GetHelp } from "@/components/booking/get-help";
import { BookingLoadError, BookingLoading, Notice, Panel, TextButton } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { useServerNow } from "@/components/booking/use-server-now";
import { CODE_LENGTH, CodeInput } from "@/components/capture/code";
import { MomentSets } from "@/components/capture/moment-sets";
import { RecordCardBody, Records, useRecord } from "@/components/capture/record-card";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Block, LinkRow, StepList, useGuardedTap } from "@/components/handover/parts";
import { apiError } from "@/lib/api-error";
import { BookingCustomer, SLOW_POLL_MS } from "@/lib/booking";
import { otherSetOffered, recordWanted } from "@/lib/capture";
import {
  captured,
  codeErrorText,
  codeIsClosed,
  ownerAbsentAt,
  ownerAbsentKey,
  ownerAbsentNote,
  returnSteps,
  returnedCopy,
} from "@/lib/day-of";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { successFeedback } from "@/lib/haptics";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useQueryClient } from "react-query";

function Return({ booking, receivedAt, watching }: { booking: BookingCustomer; receivedAt: number; watching: boolean }) {
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const keyboard = useKeyboardInset();
  const now = useServerNow(booking.server_time, receivedAt);
  const { running, run } = useGuardedTap();
  const { number } = booking;
  const [code, setCode] = useState("");
  const [round, setRound] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  // The customer's return record, and the shop's if this phone recorded it: one rule
  // (`recordState`). Both stay open after the code, while the booking is `returned`.
  const names = { title: `${booking.product.title} · ${booking.shop.name}`, other: "the shop" };
  const record = useRecord({ moment: "return", role: "customer", booking, receivedAt, ...names });
  const theirRecord = useRecord({ moment: "return", role: "customer", forOther: true, booking, receivedAt, ...names });

  const flags = captured(booking, "return");
  const recorded = flags.mine || Boolean(record.draft?.sealed);
  const returned = booking.stage === "returned" || booking.stage === "closed";
  const out = booking.stage === "out" && !booking.exit;
  const can = (action: string) => booking.can.includes(action);
  const sending = running !== null;
  // The code is asked for only while the server says it can be typed.
  const typing = out && !closed && can("enter_return_code");
  const absentAt = ownerAbsentAt(booking, queryClient.getQueryData<string>(ownerAbsentKey(number)));

  const finish = () =>
    run("return", async () => {
      if (code.length !== CODE_LENGTH) return;
      setError(null);
      try {
        queryClient.setQueryData(bookingQueryKey(number), await returnItem(number, code));
        void queryClient.invalidateQueries("bookings");
        successFeedback();
      } catch (failure) {
        const refused = apiError(failure);
        setError(codeErrorText(refused, now));
        setClosed(codeIsClosed(refused));
        setCode("");
        setRound((r) => r + 1);
        // Anything but a wrong code means the booking is not where this screen thought: read it again.
        if (refused && refused.status > 0 && refused.code !== "wrong_code" && refused.code !== "code_locked") {
          void queryClient.invalidateQueries(bookingQueryKey(number));
        }
      }
    });

  const after = returned ? returnedCopy(booking) : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.lg + keyboard }}
    >
      <View style={{ gap: 2 }}>
        <Text role="screenTitle" accessibilityRole="header">
          {returned ? `${booking.product.title} returned` : `Return the ${booking.product.title}`}
        </Text>
        <Text fontSize="text-md" tone="body">
          {`${number} · ${booking.shop.name}`}
        </Text>
      </View>

      {absentAt && out ? (
        <Notice tone="brand" icon="info">
          {ownerAbsentNote(absentAt, now)}
        </Notice>
      ) : null}

      <Panel style={{ padding: space.md, gap: space.md }}>
        <StepList steps={returnSteps(booking, recorded)} />
        {typing ? (
          <>
            <CodeInput round={round} disabled={sending} onChange={(value) => (setCode(value), setError(null))} />
            {error ? (
              <Text fontSize="text-sm" tone="danger" accessibilityRole="alert" style={{ textAlign: "center" }}>
                {error}
              </Text>
            ) : null}
          </>
        ) : null}
      </Panel>

      {out && closed ? (
        <>
          <Notice tone="warning" icon="warning">
            {error ?? "This code no longer works. Renit's desk will finish the return by phone or send a new code."}
          </Notice>
          {/* The desk can issue a new code while the two people are still at the counter. */}
          <TextButton
            label="The shop has a new code? Type it"
            onPress={() => {
              setClosed(false);
              setError(null);
            }}
          />
        </>
      ) : null}

      {typing ? (
        <Button onPress={() => void finish()} loading={sending} disabled={sending || code.length !== CODE_LENGTH}>
          Finish the return
        </Button>
      ) : null}

      {/* The record can be made before the code or after it: the server takes it while the
          booking is out or returned, and the card is here in both (review r1 #2). */}
      <RecordCardBody record={record} />
      {out && record.state === "start" ? (
        <Notice icon="info">Record the item's condition before you hand it back. It is your proof of how you returned it.</Notice>
      ) : null}
      <RecordCardBody record={theirRecord} />

      {after ? (
        <Block title="What happens next">
          <Text fontSize="text-md" fontWeight="font-bold">
            {after.title}
          </Text>
          <Text fontSize="text-md" tone="body">
            {after.body}
          </Text>
        </Block>
      ) : null}

      {recorded ? (
        <MomentSets
          number={number}
          moment="return"
          side="customer"
          otherName="the shop"
          otherTitle="The shop's"
          // Read again only while a set is still to come and the server still takes one.
          poll={watching && recordWanted("return", booking) && !(flags.mine && flags.theirs)}
        />
      ) : null}

      {recorded && otherSetOffered("return", booking, flags.theirs, theirRecord.draft) ? (
        <TextButton label="The shop's phone can't record?" onPress={theirRecord.open} />
      ) : null}

      {/* A handover record that was never finished can still be finished from here. */}
      <Records role="customer" moments={["handover"]} booking={booking} receivedAt={receivedAt} {...names} />

      {/* Help is always here; the way to say the shop was not is here while it can still be said. */}
      <Panel>
        {out && can("report_owner_absent") && !absentAt ? (
          <LinkRow
            title="The shop isn't here?"
            sub="Tell us and late charges stop from that moment."
            onPress={() => navigation.navigate("BookingReport", { number, kind: "owner_absent", role: "customer" })}
          />
        ) : null}
        <GetHelp booking={booking} first={!(out && can("report_owner_absent") && !absentAt)} />
      </Panel>

      {returned ? <Button onPress={() => navigation.navigate("Booking", { number })}>Open the booking</Button> : null}
    </ScrollView>
  );
}

/**
 * BK-21, the return: record the condition again, the shop checks it against the
 * handover, then the customer types the shop's six-digit code. The code is the
 * customer's proof of return and stops the clock, so it can be typed even while
 * the photos are still uploading (poor signal at the door). Three wrong tries
 * lock it for a while and the third lock closes it; the words are the server's times.
 */
export default function ReturnScreen() {
  const { params } = useRoute<RouteProps<"BookingReturn">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const query = useBooking(params.number);
  const { refetch } = query;
  const booking = query.data;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  // While the two people stand together: the shop's record landing changes this screen.
  const waiting = watching && booking?.stage === "out";
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void refetch(), SLOW_POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, refetch]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Return" />
      {booking ? (
        <Return booking={booking} receivedAt={query.dataUpdatedAt} watching={watching} />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading your booking" />
      )}
    </NonScrollableContainer>
  );
}
