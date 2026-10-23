import { useBooking } from "@/backend/bookings";
import { BookingLoadError, BookingLoading, BottomBar, Notice, TextButton } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { CodeBoxes } from "@/components/capture/code";
import { MomentSets } from "@/components/capture/moment-sets";
import { RecordCardBody, useRecord } from "@/components/capture/record-card";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Block } from "@/components/handover/parts";
import { BookingCustomer } from "@/lib/booking";
import { otherSetOffered, recordOpens } from "@/lib/capture";
import { captured, dayBlock } from "@/lib/day-of";
import { byRenit } from "@/lib/delivery";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useQueryClient } from "react-query";

function Check({ booking, receivedAt, watching }: { booking: BookingCustomer; receivedAt: number; watching: boolean }) {
  const navigation = useTypedNavigation();
  const { number } = booking;
  const day = dayBlock(booking);
  const flags = captured(booking, "handover");
  const [showCode, setShowCode] = useState(false);
  // The customer's own record and, if the shop's phone failed, the shop's: one rule for both (`recordState`).
  const names = { title: `${booking.product.title} · ${booking.shop.name}`, other: "the shop" };
  const record = useRecord({ moment: "handover", role: "customer", booking, receivedAt, ...names });
  const theirRecord = useRecord({ moment: "handover", role: "customer", forOther: true, booking, receivedAt, ...names });
  const recorded = !recordOpens(record.state);
  // B1: on a courier booking nobody types a code; Renit's desk starts the rental from the customer's record.
  const courier = byRenit(booking);
  const both = flags.mine && flags.theirs;
  const can = (action: string) => booking.can.includes(action);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingVertical: space.md, gap: space.md }}
      >
        <View style={{ gap: 2 }}>
          <Text role="screenTitle" accessibilityRole="header">
            Check before you take it
          </Text>
          <Text fontSize="text-md" tone="body" accessibilityLiveRegion="polite">
            {both
              ? `Both sets are in. Compare them with the ${booking.product.title} in front of you.`
              : flags.theirs
                ? "The shop's set is in. Yours is still on its way."
                : recorded
                  ? "Waiting for the shop's photos and video. They show here as soon as they are in."
                  : "Record the item's condition first. The shop records it too."}
          </Text>
        </View>

        <RecordCardBody record={record} skip={["start"]} />
        <RecordCardBody record={theirRecord} />

        <MomentSets
          number={number}
          moment="handover"
          side="customer"
          otherName="the shop"
          otherTitle="The shop's"
          poll={watching && !both}
        />

        {!courier && otherSetOffered("handover", booking, flags.theirs, theirRecord.draft) ? (
          <TextButton label="The shop's phone can't record?" onPress={theirRecord.open} />
        ) : null}

        {showCode && day.handover_code ? (
          <Block title="Your handover code">
            <CodeBoxes code={day.handover_code} />
            <Text fontSize="text-sm" tone="body" style={{ textAlign: "center" }}>
              The shop types your code to start the rental.
            </Text>
          </Block>
        ) : null}

        {booking.claim_open ? (
          <Notice tone="warning" icon="clock">
            Renit is looking at your report. Your code is paused until Renit decides.
          </Notice>
        ) : null}
      </ScrollView>

      <BottomBar>
        {record.state === "start" ? (
          <Button onPress={record.open}>Start recording the condition</Button>
        ) : !recorded || booking.claim_open || !day.handover_code ? null : showCode ? (
          <Button variant="outline" onPress={() => setShowCode(false)}>
            Hide my code
          </Button>
        ) : (
          <Button onPress={() => setShowCode(true)}>All good · show my code</Button>
        )}
        {can("refuse_at_door") && !booking.claim_open ? (
          <TextButton label={courier ? "Problem at the door" : "Not as described"} tone="danger" onPress={() => navigation.navigate("BookingRefuse", { number })} />
        ) : null}
        {!showCode && recorded && !booking.claim_open ? (
          <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
            {courier ? "Renit starts your rental once it has your recording." : "The shop types your code to start the rental."}
          </Text>
        ) : null}
      </BottomBar>
    </View>
  );
}

/**
 * BK-18, "Check before you take it": the customer's set beside the shop's, and
 * what is included, before the code is shown. Disagreements surface at the door.
 * "Not as described" is the way out before the code; "All good" shows the code
 * the shop types. Once the shop has typed it the booking is `out`, and this
 * screen hands over to the rental.
 */
export default function CheckCapturesScreen() {
  const { params } = useRoute<RouteProps<"BookingCheck">>();
  const navigation = useTypedNavigation();
  const focused = useIsFocused();
  const active = useAppActive();
  const watching = focused && active;
  const queryClient = useQueryClient();
  const query = useBooking(params.number, watching);
  const { refetch } = query;
  const booking = query.data;

  useEffect(() => {
    if (watching) void refetch();
  }, [watching, refetch]);

  // The shop typed the code (or the booking ended): this step is over, the booking screen shows what is next.
  const over = booking ? booking.stage !== "ready" || Boolean(booking.exit) : false;
  useEffect(() => {
    if (!over || !focused) return;
    void queryClient.invalidateQueries("bookings");
    navigation.navigate("Booking", { number: params.number });
  }, [over, focused, navigation, params.number, queryClient]);

  return (
    <NonScrollableContainer>
      <SubpageHeader title="Handover" />
      {booking ? (
        <Check booking={booking} receivedAt={query.dataUpdatedAt} watching={watching} />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading your booking" />
      )}
    </NonScrollableContainer>
  );
}
