import { useShopBooking } from "@/backend/shop-ring";
import { BookingLoadError, BookingLoading, Notice, TextButton } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { useServerNow } from "@/components/booking/use-server-now";
import { CodeBoxes } from "@/components/capture/code";
import { ReturnSets } from "@/components/capture/moment-sets";
import { RecordCardBody, Records, useRecord } from "@/components/capture/record-card";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Block, StepList } from "@/components/handover/parts";
import { SLOW_POLL_MS } from "@/lib/booking";
import { otherSetOffered, recordWanted } from "@/lib/capture";
import { captured, dayBlock } from "@/lib/day-of";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { BookingShop } from "@/lib/shop-booking";
import { payoutPending, reportFirstNote, returnCopy, shopReturnSteps } from "@/lib/shop-handover";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { CheckCircleIcon } from "react-native-heroicons/outline";

function Return({ booking, receivedAt, watching }: { booking: BookingShop; receivedAt: number; watching: boolean }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const now = useServerNow(booking.server_time, receivedAt, 60_000);
  const { number } = booking;
  const first = booking.customer.first_name;
  const day = dayBlock(booking);
  const flags = captured(booking, "return");
  // The shop's return record and, if the customer's phone failed, theirs: one rule
  // (`recordState`). Both stay open after the customer's code, while the booking is
  // `returned`: it is the record a damage report rests on (review r1 #2).
  const names = { title: `${booking.product.title} · ${first}`, other: first };
  const record = useRecord({ moment: "return", role: "owner", booking, receivedAt, ...names });
  const theirRecord = useRecord({ moment: "return", role: "owner", forOther: true, booking, receivedAt, ...names });
  // What the shop tapped: "All good" or "Report a problem". Both show the code (decision A-35).
  const [verdict, setVerdict] = useState<"good" | "problem" | null>(null);

  const copy = returnCopy(booking, now);
  const out = booking.stage === "out" && !booking.exit;
  const recorded = flags.mine || Boolean(record.draft?.sealed);
  const code = "return_code" in day ? day.return_code : null;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md, paddingBottom: space.lg }}
    >
      <View style={{ gap: 2 }}>
        <Text role="screenTitle" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text fontSize="text-md" tone="body">
          {copy.sub}
        </Text>
      </View>

      {booking.exit ? <Notice icon="info">This booking has ended. Open it to see what happened.</Notice> : null}

      {copy.late ? (
        <Notice tone="warning" icon="clock">
          {copy.late}
        </Notice>
      ) : null}

      {copy.returned ? (
        <View style={{ gap: space.sm, padding: space.md, borderRadius: radius.card, backgroundColor: color.successWash }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <CheckCircleIcon size={24} color={color.success} />
            <Text fontSize="text-md" fontWeight="font-bold" tone="success" style={{ flex: 1 }}>
              {copy.returned.title}
            </Text>
          </View>
          <Text fontSize="text-md" tone="body">
            {copy.returned.body}
          </Text>
        </View>
      ) : (
        <Block>
          <StepList steps={shopReturnSteps(booking, recorded)} />
        </Block>
      )}

      {/* A handover record that was never made or finished: the payout still waits for it,
          and an `out` booking lands here, so this is where it is found (review r1 #1). */}
      <Records role="owner" moments={["handover"]} booking={booking} receivedAt={receivedAt} stake={payoutPending(booking)} {...names} />

      <RecordCardBody record={record} />
      <RecordCardBody record={theirRecord} />

      <ReturnSets
        number={number}
        side="owner"
        otherName={first}
        handoverDay={copy.handoverDay}
        returnDay={copy.returnDay}
        // Read again only while a set is still to come and the server still takes one.
        poll={watching && recordWanted("return", booking) && !(flags.mine && flags.theirs)}
      />

      {recorded && otherSetOffered("return", booking, flags.theirs, theirRecord.draft) ? (
        <TextButton label={`${first}'s phone can't record?`} onPress={theirRecord.open} />
      ) : null}

      {out && verdict === null ? (
        <View style={{ gap: space.xs }}>
          <Button onPress={() => setVerdict("good")} disabled={!code}>
            All good · show my code
          </Button>
          <TextButton label="Report a problem" tone="danger" disabled={!code} onPress={() => setVerdict("problem")} />
          {!recorded ? (
            <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
              Record its condition first: it is your record if anything is wrong.
            </Text>
          ) : null}
        </View>
      ) : null}

      {out && verdict === "problem" ? (
        <Notice tone="warning" icon="warning">
          {reportFirstNote(booking)}
        </Notice>
      ) : null}

      {out && verdict !== null && code ? (
        <View
          style={{
            gap: space.md,
            padding: space.md,
            borderRadius: radius.card,
            borderWidth: 1,
            borderColor: color.brandPanelLine,
            backgroundColor: color.brandPanel,
          }}
        >
          <Text fontSize="text-md" fontWeight="font-bold" accessibilityRole="header">
            {copy.codeTitle}
          </Text>
          <CodeBoxes code={code} tinted />
          <Text fontSize="text-sm" tone="body">
            {copy.codeSub}
          </Text>
          <TextButton label="Hide the code" onPress={() => setVerdict(null)} />
        </View>
      ) : null}

      {/* Reporting the problem itself (the form, the evidence, the amount) is ENG-253's
          screen; it opens from here once the booking is `returned` and `can` has `report_problem`. */}

      <Button variant="outline" onPress={() => navigation.navigate("ShopBooking", { number })}>
        Booking details
      </Button>
    </ScrollView>
  );
}

/**
 * SH-10, the shop's return: the handover set beside the return set, what was
 * included, then "All good · show my code" or "Report a problem". Either way the
 * code is shown first, so the customer can finish the return and late days never
 * start because of a dispute (decision A-35); the shop then has 24 hours to
 * report. The customer types the code on their phone, so this screen reads the
 * booking again while it is in front and moves on by itself when the code is in.
 */
export default function ShopReturnScreen() {
  const { params } = useRoute<RouteProps<"ShopReturn">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const query = useShopBooking(params.number);
  const { refetch } = query;
  const booking = query.data;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  // The customer types the code on their own phone: read until the booking says it is back.
  const waiting = watching && booking?.stage === "out" && !booking.exit;
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
        <BookingLoading label="Loading the booking" />
      )}
    </NonScrollableContainer>
  );
}
