import { GetHelp } from "@/components/booking/get-help";
import { Notice, Panel } from "@/components/booking/parts";
import { useServerNow } from "@/components/booking/use-server-now";
import { ClaimRows } from "@/components/claims/claim-rows";
import { RecordCardBody, useRecord } from "@/components/capture/record-card";
import { Button, Text } from "@/components/core";
import { Block, CallButton, LinkRow, StepList } from "@/components/handover/parts";
import { BookingCustomer } from "@/lib/booking";
import { recordOpens } from "@/lib/capture";
import {
  bannerTone,
  callCopy,
  courierDoorTips,
  courierMayRecord,
  courierRows,
  dayBlock,
  dayOfCopy,
  openByLine,
} from "@/lib/day-of";
import { COURIER } from "@/lib/delivery";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { ScrollView, View } from "react-native";
import { CameraIcon, ClockIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * BK-14 for a booking Renit's courier partner carries (B1, Figma C3 and C4): the server's tracker and the desk's banner
 * instead of the preset buttons, no handover code and no "The shop isn't here?" (neither side meets the other), and Call
 * goes to Renit's desk. The customer opens it on camera: from the moment the rider has it, and within 30 minutes of the
 * desk's "delivered" (`courier.open_by`, the server's clock). Renit's desk starts the rental from that record.
 *
 * Every step and its words are the server's; this screen only draws them.
 */
export function CourierDayOf({ booking, receivedAt }: { booking: BookingCustomer; receivedAt: number }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  // Moved on twice a minute: the minutes left to open it count down by the server's clock.
  const now = useServerNow(booking.server_time, receivedAt, 30_000);
  const names = { title: `${booking.product.title} · ${COURIER}`, other: "the shop" };
  const record = useRecord({ moment: "handover", role: "customer", booking, receivedAt, ...names });

  const { number, courier } = booking;
  const day = dayBlock(booking);
  const can = (action: string) => booking.can.includes(action);
  const copy = dayOfCopy(booking, now);
  // Nothing left for the customer to shoot: the next thing is to compare it with the shop's packing set.
  const recorded = !recordOpens(record.state);
  const opening = !booking.claim_open && record.state === "start" && courierMayRecord(courier);

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

      {courier?.banner ? (
        <Notice tone={bannerTone(courier.banner)} icon="clock" title={courier.banner.title}>
          {courier.banner.body}
        </Notice>
      ) : null}

      <Panel style={{ padding: space.md, gap: space.md }}>
        <StepList steps={courierRows(courier?.steps, "out", now)} />
      </Panel>

      {opening ? (
        <View style={{ gap: space.xs }}>
          <Button onPress={record.open} accessibilityLabel="Open it on camera">
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <CameraIcon size={20} color={color.onBrand} />
              <Text fontSize="text-md" fontWeight="font-bold" tone="onBrand">
                Open it on camera
              </Text>
            </View>
          </Button>
          <Text fontSize="text-xs" tone="body">
            {openByLine(courier?.open_by, now)}
          </Text>
        </View>
      ) : null}

      {/* The record's own state while it uploads, waits or needs the customer; the first button is above. */}
      <RecordCardBody record={record} skip={["start"]} />

      {booking.claim_open ? (
        <Notice tone="warning" icon="clock">
          Renit is looking at your report. You will hear by the end of tomorrow. Nothing is charged or refunded until then.
        </Notice>
      ) : recorded ? (
        <>
          <Notice icon="info">Renit starts your rental once it has your recording.</Notice>
          <Button variant="outline" onPress={() => navigation.navigate("BookingCheck", { number })}>
            Check it against the shop's photos
          </Button>
        </>
      ) : null}

      <CallButton copy={callCopy("customer", day, COURIER, now, true)} />

      <Panel>
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

      {recorded ? null : (
        <Block title="When it arrives">
          {courierDoorTips(courier?.seal).map((line) => (
            <Text key={line} fontSize="text-sm" tone="body">
              {`•  ${line}`}
            </Text>
          ))}
        </Block>
      )}

      <ClaimRows ids={booking.claims} role="customer" />

      <Panel>
        {can("refuse_at_door") && !booking.claim_open ? (
          <LinkRow
            title="Problem at the door?"
            sub="Seal broken or box damaged? Record it before you open it."
            onPress={() => navigation.navigate("BookingRefuse", { number })}
          />
        ) : null}
        <LinkRow
          first={!(can("refuse_at_door") && !booking.claim_open)}
          title="Booking details"
          sub="The timeline, your payments, or cancelling."
          onPress={() => navigation.navigate("BookingDetails", { number })}
        />
        <GetHelp booking={booking} first={false} />
      </Panel>
    </ScrollView>
  );
}
