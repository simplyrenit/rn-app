import { answerWindowChange, bookingQueryKey, fetchCancelOutcome } from "@/backend/bookings";
import { CancelSheet, CancelSheetHandle } from "@/components/booking/cancel-sheet";
import { Panel, SummaryCard } from "@/components/booking/parts";
import { PaymentsList } from "@/components/booking/payments-list";
import { Button, Text } from "@/components/core";
import { apiError } from "@/lib/api-error";
import {
  BookingCustomer,
  TimelineRow,
  bookingBanner,
  cancelHint,
  datesLine,
  howLabel,
  money,
  timelineRows,
  windowErrorText,
  windowRequestCopy,
} from "@/lib/booking";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { kmText } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import React, { useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckCircleIcon, ClockIcon, MapPinIcon, XCircleIcon } from "react-native-heroicons/outline";
import { CheckIcon } from "react-native-heroicons/solid";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

const MARK = 20;

/** One line of the timeline: a tick for what happened, a ring for what is next, an empty ring after. */
function TimelineLine({ row, last }: { row: TimelineRow; last: boolean }) {
  const { color } = useTheme();
  const done = row.state === "done";
  const next = row.state === "next";
  return (
    <View
      style={{ flexDirection: "row", gap: space.md }}
      accessible
      accessibilityLabel={`${row.label}, ${row.when}${done ? ", done" : next ? ", next" : ""}`}
    >
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: MARK,
            height: MARK,
            borderRadius: radius.full,
            borderWidth: 2,
            borderColor: done || next ? color.brand : color.inputLine,
            backgroundColor: done ? color.brand : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {done ? (
            <CheckIcon size={12} color={color.onBrand} />
          ) : next ? (
            <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.brand }} />
          ) : null}
        </View>
        {last ? null : (
          <View style={{ width: 2, flex: 1, minHeight: space.md, backgroundColor: done ? color.brand : color.inputLine }} />
        )}
      </View>
      <View style={{ flex: 1, flexDirection: "row", gap: space.sm, paddingBottom: last ? 0 : space.md }}>
        <Text
          fontSize="text-md"
          fontWeight={next ? "font-bold" : "font-normal"}
          tone={row.state === "todo" ? "body" : "default"}
          style={{ flex: 1 }}
        >
          {row.label}
        </Text>
        <Text fontSize="text-sm" fontWeight={next ? "font-bold" : "font-normal"} tone={next ? "brand" : "body"}>
          {row.when}
        </Text>
      </View>
    </View>
  );
}

/**
 * BK-08, the booking screen: where the booking stands, what happened and what
 * comes next, every payment and refund with its status (N16), and what the
 * customer can do now. What is offered follows the server's `can` list, so the
 * screen never shows a button the server would refuse.
 *
 * Paying the deposit and the day of the handover are the next story's screens;
 * here the deposit shows with its due date in the timeline and under Payments.
 */
export function BookingDetails({ booking }: { booking: BookingCustomer }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cancelSheet = useRef<CancelSheetHandle>(null);
  const [answering, setAnswering] = useState<"accept" | "decline" | null>(null);
  const busy = useRef(false);

  const banner = bookingBanner(booking);
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
  const where =
    booking.delivery_mode === "pickup"
      ? booking.shop.address ??
        [
          booking.distance_km ? `${kmText(booking.distance_km)} away.` : null,
          booking.is_open ? "The full address shows once the deposit is paid." : null,
        ]
          .filter(Boolean)
          .join(" ")
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
        lines={[datesLine(booking), `${howLabel(booking.delivery_mode)} · rent ${money(booking.money.rent)}`]}
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
            {rows.map((row, index) => (
              <TimelineLine key={`${row.label}-${index}`} row={row} last={index === rows.length - 1} />
            ))}
          </Panel>
        </View>
      ) : null}

      <PaymentsList booking={booking} />

      {can("request_window_change") || can("cancel") ? (
        <Panel>
          {can("request_window_change") && !booking.window_request ? (
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
              accessibilityHint={cancelQuery.data ? cancelHint(cancelQuery.data) : undefined}
              activeOpacity={0.7}
              onPress={() => cancelSheet.current?.present()}
              style={{
                minHeight: MIN_TOUCH_TARGET + 8,
                flexDirection: "row",
                gap: space.md,
                padding: space.md,
                borderTopWidth: can("request_window_change") && !booking.window_request ? 1 : 0,
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
                    {cancelHint(cancelQuery.data)}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ) : null}
        </Panel>
      ) : null}

      <CancelSheet ref={cancelSheet} number={booking.number} />
    </ScrollView>
  );
}
