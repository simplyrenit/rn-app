import { answerCustomerWindowChange } from "@/backend/shop-bookings";
import { shopBookingQueryKey, useShopBooking } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { GetHelp } from "@/components/booking/get-help";
import { ClaimRows } from "@/components/claims/claim-rows";
import { BookingLoadError, BookingLoading, MoneyLine, Notice, Panel, SummaryCard } from "@/components/booking/parts";
import { PaymentSchedule } from "@/components/booking/payment-schedule";
import { Records } from "@/components/capture/record-card";
import { useCaptureDraft } from "@/backend/capture-jobs";
import { useCaptures, useShotList } from "@/backend/captures";
import { ItemsTable } from "@/components/shop/lines";
import { recordWanted } from "@/lib/capture";
import { basketItems, isBasket, lineRows, liveLines } from "@/lib/shop-lines";
import { Timeline } from "@/components/booking/timeline";
import { useAppActive } from "@/components/booking/use-app-active";
import { BottomBar, Button, ListRow, SectionHeader, StatusPill, SubpageHeader, Text } from "@/components/core";
import { BrandNote } from "@/components/shop/brand-note";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { ShopCancelSheet, ShopCancelSheetHandle } from "@/components/shop/shop-cancel-sheet";
import { WindowChangeSheet, WindowChangeSheetHandle } from "@/components/shop/window-change-sheet";
import { apiError } from "@/lib/api-error";
import { isMonthly, overduePeriod, shopOverdueAlert } from "@/lib/billing";
import { daysLabel, money, rangeLabel, todayIst } from "@/lib/booking";
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
import { dayButton, dayScreen, pageMoments, payoutPending } from "@/lib/shop-handover";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { CheckCircleIcon } from "react-native-heroicons/mini";
import { ClockIcon, InformationCircleIcon, MapPinIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "react-query";

// The 08 sections (2093:21769): a Section header 8 below the block above it and 12 over its content.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 8, gap: 12 }}>
      <SectionHeader title={title} gutter={false} flush />
      {children}
    </View>
  );
}

// The 08 cards are r12 with 16 inside, 12 between lines (2093:21769 Customer card, Money card); `Panel` brings the edge.
const CARD = { borderRadius: 12, padding: 16, gap: 12 } as const;

/** The Customer card: first name, ID and rentals, the area, never a number or an address before `ready`. */
function CustomerCard({ booking, now }: { booking: BookingShop; now: Date }) {
  const { color } = useTheme();
  const c = customerBlock(booking, now);
  return (
    <Panel style={CARD}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.full,
            backgroundColor: color.brandPanel,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fontSize="text-md" fontWeight="font-semibold" tone="brand">
            {c.initial}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text fontSize="text-md" fontWeight="font-semibold">
            {c.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {booking.customer.id_checked === true ? <CheckCircleIcon size={16} color={color.success} /> : null}
            <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
              {c.line}
            </Text>
          </View>
        </View>
      </View>
      {c.place ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MapPinIcon size={20} color={color.textBody} />
          <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
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

/** A small print line of the Money card: 12/16 at 60%, as "Paid to your bank on the day of handover". */
function Small({ children }: { children: string }) {
  return (
    <Text fontSize="text-xs" tone="dim">
      {children}
    </Text>
  );
}

function MoneyCard({ booking }: { booking: BookingShop }) {
  const { color } = useTheme();
  const m = moneyView(booking);
  return (
    <Panel style={CARD}>
      <MoneyLine label={m.rentLabel} amount={m.rent} note={m.rentNote} />
      {m.delivery ? <MoneyLine label="Delivery fee" amount={m.delivery} /> : null}
      <MoneyLine label="Renit's fee" amount={m.fee.charged} struck={m.fee.struck ?? undefined} note={m.fee.note} />
      <MoneyLine label={m.earnLabel} amount={m.earn} total />
      {m.notes.map((note) => (
        <Small key={note}>{note}</Small>
      ))}
      {m.payout ? <Small>{m.payout}</Small> : null}
      {m.deposit ? (
        <>
          <View style={{ height: 1, backgroundColor: color.line }} />
          <MoneyLine label="Deposit" amount={m.deposit.amount} />
          {m.deposit.sub ? <Small>{m.deposit.sub}</Small> : null}
        </>
      ) : null}
    </Panel>
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

  // b3-01: the page's one next step sits in the kit Bottom bar: answering a ringing request, or the day's own screen
  // (the handover while the booking is ready, the return once it is out, ENG-223).
  const next = ringing
    ? { label: "Answer this request", onPress: () => navigation.navigate("ShopRing", { number: booking.number }) }
    : day && dayLabel
      ? { label: dayLabel, onPress: () => navigation.navigate(day, { number: booking.number }) }
      : null;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.textBody} colors={[color.brand]} />
        }
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 8,
          // The frames' 40 under the last block; with no bar below, the home indicator's inset too.
          paddingBottom: 40 + (next ? 0 : insets.bottom),
          gap: 24,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Shrinks before the pill does: at 360dp and a large font the number pushed it off the edge. */}
          <Text role="screenTitle" accessibilityRole="header" style={{ flexShrink: 1 }}>
            {booking.number}
          </Text>
          <StatusPill label={pill.label} tone={pill.tone} />
        </View>

        {ringing ? <BrandNote icon="clock">This request is waiting for your answer.</BrandNote> : null}

        {/* A record that is not finished is never out of sight: it can be made or carried on
            from the booking for as long as the server takes it, and the card says when the
            payout waits for it (review r1 #1). The moment the day button opens is recorded
            on that screen, so its card is not drawn here as a second button (ENG-418). */}
        <Records
          role="owner"
          moments={pageMoments(booking)}
          booking={booking}
          receivedAt={receivedAt}
          title={`${booking.product.title} · ${booking.customer.first_name}`}
          other={booking.customer.first_name}
          stake={payoutPending(booking)}
        />

        <SummaryCard
          title={booking.product.title}
          image={booking.product.cover_image}
          // Without the year, as the 08 frames and the Bookings cards write it: "Tue 24 – Thu 26 Nov · 3 days".
          lines={[`${rangeLabel(booking.first_day, booking.last_day)} · ${daysLabel(booking.days)}`, howLine(booking)]}
        />

        {isBasket(booking) ? <Items booking={booking} /> : null}

        {alert ? (
          <Notice tone="danger" icon="warning" title={alert.title}>
            {alert.body}
          </Notice>
        ) : null}

        {/* 2093:21659: the customer's request, no card around it, Decline left of Accept. */}
        {request ? (
          <View style={{ gap: 8 }}>
            <Text fontSize="text-md" fontWeight="font-semibold">
              {request.title}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {request.body}
            </Text>
            {request.ended ? null : (
              <View style={{ flexDirection: "row", gap: 8, paddingTop: 8 }}>
                <Button
                  size="compact"
                  variant="outline"
                  loading={answering === "decline"}
                  disabled={answering !== null}
                  onPress={() => void answer(false)}
                  style={{ flex: 1 }}
                >
                  Decline
                </Button>
                <Button
                  size="compact"
                  loading={answering === "accept"}
                  disabled={answering !== null}
                  onPress={() => void answer(true)}
                  style={{ flex: 1 }}
                >
                  Accept
                </Button>
              </View>
            )}
          </View>
        ) : null}
        {mine ? <Notice icon="clock">{mine}</Notice> : null}

        <Section title="Timeline">
          {/* One child: Timeline returns its steps as a fragment, and the section's 12 gap would open between them. */}
          <View>
            <Timeline rows={shopTimeline(booking, now)} />
          </View>
        </Section>

        <Section title="Customer">
          <CustomerCard booking={booking} now={now} />
        </Section>
        <Section title="Money">
          <MoneyCard booking={booking} />
        </Section>
        {monthly ? <PaymentSchedule money={booking.money} side="owner" today={todayIst(now)} /> : null}

        {/* A damage claim the shop made, a fault report or a "not as described" report against it. */}
        <ClaimRows ids={booking.claims} role="owner" />

        {/* The actions, as plain rows with no card around them (b3-02). */}
        <View>
          {can("request_window_change") ? (
            // The kit row brings its own 24 gutter; the body already has one (2093:21769: the row's icon at x24).
            <View style={{ marginHorizontal: -SCREEN_GUTTER }}>
              <ListRow label="Ask to change the time" leadingIcon={ClockIcon} onPress={() => changeSheet.current?.present()} />
            </View>
          ) : null}

          {can("cancel") ? (
            <View style={{ paddingVertical: 16, gap: 4 }}>
              {/* Words, not a button box (2093:21920): SemiBold 16/24 in the strong red, with a 44pt touch. */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancel booking"
                accessibilityHint={CANCEL_HINT}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10 }}
                onPress={() => cancelSheet.current?.present()}
                style={{ alignSelf: "flex-start" }}
              >
                <Text fontSize="text-md" fontWeight="font-semibold" style={{ color: color.dangerStrong }}>
                  Cancel booking
                </Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <InformationCircleIcon size={16} color={color.textDim} />
                <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                  {CANCEL_HINT}
                </Text>
              </View>
            </View>
          ) : null}

          <GetHelp booking={booking} />
        </View>

        {/* Figma's shop "End the rental early" (D16): the shop has no way to end a rental, so it reaches the desk. */}
        {monthly && booking.stage === "out" && !booking.exit && can("get_help") ? (
          <View style={{ gap: space.sm }}>
            <GetHelp booking={booking} title="End the rental early" danger />
            <Text fontSize="text-sm" tone="body">
              Talk to Renit's desk first. Ending early follows the rental terms.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      {next ? <BottomBar primary={next} /> : null}
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
