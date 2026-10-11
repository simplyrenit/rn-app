import { bookingQueryKey } from "@/backend/bookings";
import { setDayStatus } from "@/backend/handover";
import { Notice, Panel, Pill } from "@/components/booking/parts";
import { useServerNow } from "@/components/booking/use-server-now";
import { CodeBoxes } from "@/components/capture/code";
import { RecordCard, RecordCardBody, useRecord } from "@/components/capture/record-card";
import { Button, Text } from "@/components/core";
import { Block, CallButton, LinkRow, StatusButtons, useGuardedTap } from "@/components/handover/parts";
import { apiError } from "@/lib/api-error";
import { BookingCustomer } from "@/lib/booking";
import { recordOpens } from "@/lib/capture";
import {
  callCopy,
  dayBlock,
  dayErrorText,
  dayOfCopy,
  mapsUrl,
  noShowCopy,
  reached,
  statusButtons,
  statusNote,
  theirStatusLine,
} from "@/lib/day-of";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { Linking, Platform, ScrollView, TouchableOpacity, View } from "react-native";
import { CameraIcon, ClockIcon, MapPinIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/**
 * BK-14, the day of the handover, for a booking that is `ready`: everything is
 * paid, so the address, the three preset buttons, Call and the handover code are
 * here, then the capture. The customer shows the code; the owner types it.
 *
 * What is offered follows the server's `can` list and its own times
 * (`day.call_from`, `day.no_show_from`), read against the server's clock. Each
 * tap is sent once, and after any refusal the booking is read again.
 */
export function DayOf({ booking, receivedAt }: { booking: BookingCustomer; receivedAt: number }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  // Moved on twice a minute: the buttons and the no-show row open by the clock.
  const now = useServerNow(booking.server_time, receivedAt, 30_000);
  const { running, run } = useGuardedTap();
  // The customer's own handover record: the one rule decides what is offered (`recordState`).
  const names = { title: `${booking.product.title} · ${booking.shop.name}`, other: "the shop" };
  const record = useRecord({ moment: "handover", role: "customer", booking, receivedAt, ...names });

  const { number } = booking;
  const day = dayBlock(booking);
  const can = (action: string) => booking.can.includes(action);
  const copy = dayOfCopy(booking, now);
  const their = theirStatusLine("customer", booking.delivery_mode, day.their_status, "The shop");
  const noShow = noShowCopy("customer", day, "The shop", now);
  // Nothing left for the customer to shoot: the next thing is to compare the two sets.
  const recorded = !recordOpens(record.state);
  const map = booking.delivery_mode === "pickup" ? mapsUrl(booking.shop.coordinates, booking.shop.name, Platform.OS === "ios") : null;

  const tapStatus = (status: "on_my_way" | "running_late" | "i_am_here") =>
    run(status, async () => {
      try {
        queryClient.setQueryData(bookingQueryKey(number), await setDayStatus<BookingCustomer>(number, status));
      } catch (error) {
        const failure = apiError(error);
        toast.error("That didn't go through", { message: dayErrorText(failure, now) });
        // Whatever refused it, the booking on screen is out of date: the server's stage is the truth.
        if (failure && failure.status > 0) void queryClient.invalidateQueries(bookingQueryKey(number));
      }
    });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: SCREEN_GUTTER,
        paddingTop: space.sm,
        paddingBottom: insets.bottom + space.lg,
        gap: space.md,
      }}
    >
      <Text role="screenTitle" accessibilityRole="header">
        {copy.title}
      </Text>

      <Panel>
        {map ? (
          <TouchableOpacity
            accessibilityRole="link"
            accessibilityLabel={`Open ${booking.shop.name} in Maps`}
            activeOpacity={0.8}
            onPress={() => void Linking.openURL(map).catch(() => toast.error("Maps could not be opened"))}
            style={{ height: 120, backgroundColor: color.surfaceRaised, alignItems: "center", justifyContent: "center", gap: space.xs }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.full,
                backgroundColor: color.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MapPinIcon size={22} color={color.brandText} />
            </View>
            <Text fontSize="text-xs" fontWeight="font-bold" tone="brand">
              Open in Maps
            </Text>
          </TouchableOpacity>
        ) : null}
        <View style={{ padding: space.md, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {copy.place.name}
          </Text>
          {copy.place.address ? (
            <Text fontSize="text-md" tone="body" selectable>
              {copy.place.address}
            </Text>
          ) : null}
        </View>
        {copy.window ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              padding: space.md,
              borderTopWidth: 1,
              borderTopColor: color.line,
            }}
          >
            <ClockIcon size={20} color={color.brandText} />
            <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
              {copy.window}
            </Text>
            <Text fontSize="text-xs" tone="body">
              Arrival window
            </Text>
          </View>
        ) : null}
      </Panel>

      {their ? (
        <View style={{ flexDirection: "row" }}>
          <Pill label={their} tone="success" />
        </View>
      ) : null}

      <View style={{ gap: space.xs }}>
        <StatusButtons
          buttons={statusButtons("customer", booking.delivery_mode)}
          mine={day.my_status}
          disabled={!can("set_status") || !reached(day.call_from, now)}
          sending={running}
          onTap={(status) => void tapStatus(status)}
        />
        {statusNote(day, now) ? (
          <Text fontSize="text-xs" tone="body" style={{ textAlign: "center" }}>
            {statusNote(day, now)}
          </Text>
        ) : null}
      </View>

      <CallButton copy={callCopy("customer", day, "the shop", now)} />

      <Block title="Your handover code">
        {day.handover_code && !booking.claim_open ? <CodeBoxes code={day.handover_code} /> : null}
        <Text fontSize="text-sm" tone="body" style={{ textAlign: "center" }}>
          {copy.codeNote}
        </Text>
      </Block>

      {/* The record's own state while it uploads, waits or needs the customer; the first button is below. */}
      <RecordCardBody record={record} skip={["start"]} />
      <RecordCard moment="handover" role="customer" forOther booking={booking} receivedAt={receivedAt} {...names} />

      {booking.claim_open ? (
        <Notice tone="warning" icon="clock">
          Renit is looking at your report. You will hear by the end of tomorrow. Nothing is charged or refunded until then.
        </Notice>
      ) : recorded ? (
        <Button onPress={() => navigation.navigate("BookingCheck", { number })}>Check both sets of photos</Button>
      ) : record.state === "start" ? (
        <Button onPress={record.open} accessibilityLabel="Start recording the condition">
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <CameraIcon size={20} color={color.onBrand} />
            <Text fontSize="text-md" fontWeight="font-bold" tone="onBrand">
              Start recording the condition
            </Text>
          </View>
        </Button>
      ) : null}

      <Panel>
        <LinkRow
          title={noShow.title}
          sub={noShow.sub}
          disabled={!noShow.open || !can("no_show")}
          onPress={() => navigation.navigate("BookingReport", { number, kind: "no_show", role: "customer" })}
        />
        {can("refuse_at_door") && !booking.claim_open ? (
          <LinkRow
            first={false}
            title="Not as described?"
            sub="Tell Renit before you show the code, with photos."
            onPress={() => navigation.navigate("BookingRefuse", { number })}
          />
        ) : null}
        <LinkRow
          first={false}
          title="Booking details"
          sub="The timeline, your payments, changing the time or cancelling."
          onPress={() => navigation.navigate("BookingDetails", { number })}
        />
      </Panel>
    </ScrollView>
  );
}
