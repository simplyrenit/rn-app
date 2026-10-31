import { answerCustomerWindowChange } from "@/backend/shop-bookings";
import { shopBookingQueryKey, useShopBooking } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { GetHelp } from "@/components/booking/get-help";
import { ClaimRows } from "@/components/claims/claim-rows";
import { BookingLoadError, BookingLoading, MoneyLine, Notice, Panel, Pill, SummaryCard } from "@/components/booking/parts";
import { PaymentSchedule } from "@/components/booking/payment-schedule";
import { Records } from "@/components/capture/record-card";
import { useCaptureDraft } from "@/backend/capture-jobs";
import { useCaptures, useShotList } from "@/backend/captures";
import { ItemsTable } from "@/components/shop/lines";
import { recordWanted } from "@/lib/capture";
import { basketItems, isBasket, lineRows, liveLines } from "@/lib/shop-lines";
import { Timeline } from "@/components/booking/timeline";
import { useAppActive } from "@/components/booking/use-app-active";
import { Button, SubpageHeader, Text } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopCancelSheet, ShopCancelSheetHandle } from "@/components/shop/shop-cancel-sheet";
import { WindowChangeSheet, WindowChangeSheetHandle } from "@/components/shop/window-change-sheet";
import { apiError } from "@/lib/api-error";
import { isMonthly, overduePeriod, shopOverdueAlert } from "@/lib/billing";
import { datesLine, money, todayIst } from "@/lib/booking";
import { byRenit } from "@/lib/delivery";
import { correctedNow } from "@/lib/server-clock";
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
import { dayButton, dayScreen, payoutPending } from "@/lib/shop-handover";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckCircleIcon, ClockIcon, InformationCircleIcon, MapPinIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

/** The Customer card: first name, ID and rentals, the area, never a number or an address before `ready`. */
function CustomerCard({ booking, now }: { booking: BookingShop; now: Date }) {
  const { color } = useTheme();
  const c = customerBlock(booking, now);
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
            {booking.customer.id_checked === true ? <CheckCircleIcon size={16} color={color.success} /> : null}
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
      {/* ENG-352: who to invoice, from Ready on (the server sends it no earlier). */}
      {booking.bill_to ? (
        <Text fontSize="text-sm" tone="body">
          {`Bill to: ${booking.bill_to.legal_name}, GSTIN ${booking.bill_to.gstin}, ${booking.bill_to.address}`}
        </Text>
      ) : null}
      {c.note ? <Notice icon="info">{c.note}</Notice> : null}
    </Panel>
  );
}

const RECORD_TAGS = {
  not_started: { label: "Not started", tone: "neutral" },
  in_progress: { label: "In progress", tone: "info" },
  recorded: { label: "Recorded", tone: "success" },
} as const;

/**
 * MR-07: a basket's items, each with its state, deposit share, its record and what the shop earns from it. The record
 * is the handover's until the item is out, then the return's: both phones' shots as the server has them, and this one's.
 */
function Items({ booking }: { booking: BookingShop }) {
  const moment = ["out", "returned", "closed"].includes(booking.stage) && !booking.exit ? "return" : "handover";
  const reads = recordWanted(moment, booking);
  // The list is read from the accept on, so each item says "Not started" before the handover.
  const list = useShotList(booking.number, !booking.exit && booking.stage !== "ringing").data;
  const capture = useCaptures(booking.number, false, reads).data?.[moment]?.owner;
  const draft = useCaptureDraft(booking.number, moment, "owner");
  const records = Object.fromEntries(basketItems(list, draft, capture).map((item) => [item.id, RECORD_TAGS[item.word]]));
  const all = booking.lines?.length ?? 0;
  const live = liveLines(booking).length;
  // B1: Renit's courier fee is Renit's, not the shop's (as `moneyView`).
  const delivery = Number(booking.money.delivery_fee) > 0 && !byRenit(booking) ? money(booking.money.delivery_fee) : null;
  return (
    <ItemsTable
      title={live < all ? `${live} of ${all} items` : `${all} items`}
      rows={lineRows(booking)}
      records={records}
      delivery={delivery}
      earn={money(booking.money.you_earn)}
    />
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
      <MoneyLine label={m.rentLabel} amount={m.rent} />
      {m.delivery ? <MoneyLine label="Delivery fee" amount={m.delivery} /> : null}
      <MoneyLine label="Renit's fee" amount={m.fee.charged} struck={m.fee.struck ?? undefined} />
      <View style={{ height: 1, backgroundColor: color.line }} />
      <MoneyLine label={m.earnLabel} amount={m.earn} bold />
      {m.notes.map((note) => (
        <Text key={note} fontSize="text-sm" tone="body">
          {note}
        </Text>
      ))}
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

function BookingPage({
  booking,
  now,
  receivedAt,
  refreshing,
  onRefresh,
}: {
  booking: BookingShop;
  now: Date;
  receivedAt: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const cancelSheet = useRef<ShopCancelSheetHandle>(null);
  const changeSheet = useRef<WindowChangeSheetHandle>(null);
  const [answering, setAnswering] = useState<"accept" | "decline" | null>(null);
  const busy = useRef(false);

  const monthly = isMonthly(booking.money);
  const overdue = monthly && booking.stage === "out" && !booking.exit ? overduePeriod(booking.money) : null;
  const alert = overdue ? shopOverdueAlert(overdue, booking.customer.first_name, booking.product.title) : null;
  const pill = overdue ? ({ label: "Rent overdue", tone: "danger" } as const) : shopPill(booking);
  const can = (action: string) => booking.can.includes(action);
  const request = customerRequest(booking);
  const mine = ownRequest(booking);
  const ringing = booking.stage === "ringing" && !booking.exit;
  const day = dayScreen(booking);
  const dayLabel = dayButton(booking);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.textBody} colors={[color.brand]} />
        }
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

        {/* The day's own screen: the handover while the booking is ready, the return once it is out (ENG-223). */}
        {day && dayLabel ? (
          <Button onPress={() => navigation.navigate(day, { number: booking.number })}>{dayLabel}</Button>
        ) : null}

        {/* A record that is not finished is never out of sight: it can be made or carried on
            from the booking for as long as the server takes it, and the card says when the
            payout waits for it (review r1 #1). */}
        <Records
          role="owner"
          booking={booking}
          receivedAt={receivedAt}
          title={`${booking.product.title} · ${booking.customer.first_name}`}
          other={booking.customer.first_name}
          stake={payoutPending(booking)}
        />

        <SummaryCard
          title={booking.product.title}
          image={booking.product.cover_image}
          lines={[datesLine(booking), howLine(booking)]}
        />

        {isBasket(booking) ? <Items booking={booking} /> : null}

        {alert ? (
          <Notice tone="danger" icon="warning" title={alert.title}>
            {alert.body}
          </Notice>
        ) : null}

        {request ? (
          <Panel style={{ padding: space.md, gap: space.sm }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {request.title}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {request.body}
            </Text>
            {request.ended ? null : (
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
            )}
          </Panel>
        ) : null}
        {mine ? <Notice icon="clock">{mine}</Notice> : null}

        <Panel style={{ padding: space.md, gap: space.md }}>
          <Text role="sectionTitle" accessibilityRole="header">
            Timeline
          </Text>
          <View>
            <Timeline rows={shopTimeline(booking, now)} />
          </View>
        </Panel>

        <CustomerCard booking={booking} now={now} />
        <MoneyCard booking={booking} />
        {monthly ? <PaymentSchedule money={booking.money} side="owner" today={todayIst(now)} /> : null}

        {/* A damage claim the shop made, a fault report or a "not as described" report against it. */}
        <ClaimRows ids={booking.claims} role="owner" />

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

        <Panel>
          <GetHelp booking={booking} />
        </Panel>

        {/* Figma's shop "End the rental early" (D16): the shop has no way to end a rental, so it reaches the desk. */}
        {monthly && booking.stage === "out" && !booking.exit && can("get_help") ? (
          <View style={{ gap: space.sm }}>
            <Panel>
              <GetHelp booking={booking} title="End the rental early" danger />
            </Panel>
            <Text fontSize="text-sm" tone="body" style={{ paddingHorizontal: space.xs }}>
              Talk to Renit's desk first. Ending early follows the rental terms.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <ShopCancelSheet
        ref={cancelSheet}
        number={booking.number}
        lines={booking.lines ?? undefined}
        firstName={booking.customer.first_name}
      />
      <WindowChangeSheet ref={changeSheet} number={booking.number} firstName={booking.customer.first_name} />
    </>
  );
}

/**
 * SH-07, one booking as its shop sees it: its stage, what happened and what comes
 * next, who asked, the money, and what the shop can do now. What is offered follows
 * the server's `can` list. The booking is read again each time the screen or the
 * app comes back to the front, every 15 seconds while it stays there, and on a pull down, so a stage that moved is
 * never shown as it was. The day-of buttons, the camera and the codes are on the
 * handover and return screens, which this page opens.
 */
export default function ShopBookingScreen() {
  const { params } = useRoute<RouteProps<"ShopBooking">>();
  const focused = useIsFocused();
  const active = useAppActive();
  const query = useShopBooking(params.number, true, focused && active);
  const { refetch } = query;
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (focused && active) void refetch();
  }, [focused, active, refetch]);

  const booking = query.data;
  return (
    <NonScrollableContainer>
      <SubpageHeader title="Booking" />
      {booking ? (
        <BookingPage
          booking={booking}
          now={correctedNow(booking.server_time, query.dataUpdatedAt)}
          receivedAt={query.dataUpdatedAt}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void refetch().finally(() => setRefreshing(false));
          }}
        />
      ) : query.isError ? (
        <BookingLoadError error={query.error} what="this booking" onRetry={() => void refetch()} />
      ) : (
        <BookingLoading label="Loading the booking" />
      )}
    </NonScrollableContainer>
  );
}
