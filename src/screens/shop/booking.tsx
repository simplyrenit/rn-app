import { answerCustomerWindowChange } from "@/backend/shop-bookings";
import { shopBookingQueryKey, useShopBooking } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { BookingLoadError, BookingLoading, MoneyLine, Notice, Panel, Pill, SummaryCard } from "@/components/booking/parts";
import { Timeline } from "@/components/booking/timeline";
import { useAppActive } from "@/components/booking/use-app-active";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopCancelSheet, ShopCancelSheetHandle } from "@/components/shop/shop-cancel-sheet";
import { WindowChangeSheet, WindowChangeSheetHandle } from "@/components/shop/window-change-sheet";
import { apiError } from "@/lib/api-error";
import { datesLine } from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import {
  BookingShop,
  CANCEL_HINT,
  customerBlock,
  customerRequest,
  howLine,
  moneyView,
  ownRequest,
  shopActionErrorText,
  shopPill,
  shopTimeline,
} from "@/lib/shop-booking";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckCircleIcon, ClockIcon, InformationCircleIcon, MapPinIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/** The Customer card: first name, ID and rentals, the area, never a number or an address before `ready`. */
function CustomerCard({ booking }: { booking: BookingShop }) {
  const { color } = useTheme();
  const c = customerBlock(booking);
  return (
    <Panel style={{ padding: space.md, gap: space.md }}>
      <Text role="sectionTitle" accessibilityRole="header">
        Customer
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.full,
            backgroundColor: color.brandPanel,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
            {c.initial}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-bold">
            {c.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
            {booking.customer.id_checked ? <CheckCircleIcon size={16} color={color.success} /> : null}
            <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
              {c.line}
            </Text>
          </View>
        </View>
      </View>
      {c.place ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
          <MapPinIcon size={18} color={color.text} />
          <Text fontSize="text-md" style={{ flex: 1 }}>
            {c.place}
          </Text>
        </View>
      ) : null}
      {c.address ? (
        <Text fontSize="text-sm" tone="body">
          {`Deliver to: ${c.address}`}
        </Text>
      ) : null}
      {c.note ? <Notice icon="info">{c.note}</Notice> : null}
    </Panel>
  );
}

function MoneyCard({ booking }: { booking: BookingShop }) {
  const { color } = useTheme();
  const m = moneyView(booking);
  return (
    <Panel style={{ padding: space.md, gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        Money
      </Text>
      <MoneyLine label="Rent" amount={m.rent} />
      {m.delivery ? <MoneyLine label="Delivery fee" amount={m.delivery} /> : null}
      <MoneyLine label="Renit's fee" amount={m.fee.charged} struck={m.fee.struck ?? undefined} />
      <View style={{ height: 1, backgroundColor: color.line }} />
      <MoneyLine label="You earn" amount={m.earn} bold />
      {m.payout ? (
        <Text fontSize="text-sm" tone="body">
          {m.payout}
        </Text>
      ) : null}
      {m.deposit ? (
        <>
          <View style={{ height: 1, backgroundColor: color.line }} />
          <MoneyLine label="Deposit" amount={m.deposit.amount} />
          {m.deposit.sub ? (
            <Text fontSize="text-sm" tone="body">
              {m.deposit.sub}
            </Text>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}

/** A row of the actions card: a words-and-chevron line the shop taps. */
function ActionRow({ label, onPress, first }: { label: string; onPress: () => void; first?: boolean }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.7}
      onPress={onPress}
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: space.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: color.line,
      }}
    >
      <ClockIcon size={22} color={color.text} />
      <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
        {label}
      </Text>
      <ChevronRightIcon size={20} color={color.textBody} />
    </TouchableOpacity>
  );
}

function BookingPage({ booking }: { booking: BookingShop }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cancelSheet = useRef<ShopCancelSheetHandle>(null);
  const changeSheet = useRef<WindowChangeSheetHandle>(null);
  const [answering, setAnswering] = useState<"accept" | "decline" | null>(null);
  const busy = useRef(false);

  const pill = shopPill(booking);
  const can = (action: string) => booking.can.includes(action);
  const request = customerRequest(booking);
  const mine = ownRequest(booking);
  const ringing = booking.stage === "ringing" && !booking.exit;

  const answer = async (accept: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setAnswering(accept ? "accept" : "decline");
    try {
      queryClient.setQueryData(shopBookingQueryKey(booking.number), await answerCustomerWindowChange(booking.number, accept));
      refreshShop(queryClient);
      toast.success(accept ? "Arrival time moved" : "Kept the arrival time");
    } catch (error) {
      const failure = apiError(error);
      toast.error("We couldn't send your answer", { message: shopActionErrorText(failure) });
      // The request may be gone (the customer withdrew it, or it was answered elsewhere).
      if (failure && failure.status > 0) void queryClient.invalidateQueries(shopBookingQueryKey(booking.number));
    } finally {
      busy.current = false;
      setAnswering(null);
    }
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: insets.bottom + space.lg,
          gap: space.lg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.md }}>
          <Text role="screenTitle" accessibilityRole="header">
            {booking.number}
          </Text>
          <Pill label={pill.label} tone={pill.tone} />
        </View>

        {ringing ? (
          <View style={{ gap: space.sm }}>
            <Notice tone="brand" icon="clock">
              This request is waiting for your answer.
            </Notice>
            <Button onPress={() => navigation.navigate("ShopRing", { number: booking.number })}>Answer this request</Button>
          </View>
        ) : null}

        <SummaryCard
          title={booking.product.title}
          image={booking.product.cover_image}
          lines={[datesLine(booking), howLine(booking)]}
        />

        {request ? (
          <Panel style={{ padding: space.md, gap: space.sm }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {request.title}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {request.body}
            </Text>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button loading={answering === "accept"} disabled={answering !== null} onPress={() => void answer(true)}>
                  Accept
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="outline" loading={answering === "decline"} disabled={answering !== null} onPress={() => void answer(false)}>
                  Decline
                </Button>
              </View>
            </View>
          </Panel>
        ) : null}
        {mine ? <Notice icon="clock">{mine}</Notice> : null}

        <Panel style={{ padding: space.md, gap: space.md }}>
          <Text role="sectionTitle" accessibilityRole="header">
            Timeline
          </Text>
          <View>
            <Timeline rows={shopTimeline(booking)} />
          </View>
        </Panel>

        <CustomerCard booking={booking} />
        <MoneyCard booking={booking} />

        {can("request_window_change") ? (
          <Panel>
            <ActionRow first label="Ask to change the time" onPress={() => changeSheet.current?.present()} />
          </Panel>
        ) : null}

        {can("cancel") ? (
          <View style={{ gap: space.sm }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel booking"
              accessibilityHint={CANCEL_HINT}
              activeOpacity={0.7}
              onPress={() => cancelSheet.current?.present()}
              style={{
                minHeight: 56,
                justifyContent: "center",
                paddingHorizontal: space.md,
                borderRadius: radius.card,
                borderWidth: 1,
                borderColor: color.line,
                backgroundColor: color.surface,
              }}
            >
              <Text fontSize="text-md" fontWeight="font-bold" tone="danger">
                Cancel booking
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: space.sm, paddingHorizontal: space.xs }}>
              <InformationCircleIcon size={16} color={color.textDim} />
              <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                {CANCEL_HINT}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <ShopCancelSheet ref={cancelSheet} number={booking.number} />
      <WindowChangeSheet ref={changeSheet} number={booking.number} firstName={booking.customer.first_name} />
    </>
  );
}

/**
 * SH-07, one booking as its shop sees it: its stage, what happened and what comes
 * next, who asked, the money, and what the shop can do now. What is offered follows
 * the server's `can` list. The booking is read again each time the screen or the
 * app comes back to the front, so a stage that moved while the shop was away is
 * never shown as it was. Day-of buttons and the camera are the handover's screens.
 */
export default function ShopBookingScreen() {
  const { params } = useRoute<RouteProps<"ShopBooking">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const query = useShopBooking(params.number);
  const { refetch } = query;

  useEffect(() => {
    if (focused && active) void refetch();
  }, [focused, active, refetch]);

  const booking = query.data;
  return (
    <NonScrollableContainer>
      <SubpageHeader title="Booking" />
      {booking ? (
        <BookingPage booking={booking} />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading the booking" />
      )}
    </NonScrollableContainer>
  );
}
