import { acceptBooking, refuseBooking, ringEndedQueryKey, shopBookingQueryKey, useLive, useShopBooking } from "@/backend/shop-ring";
import { refreshShop } from "@/backend/shop-today";
import { dismissRingNotifications } from "@/backend/notifications";
import { BottomBar, MoneyLine, Notice, Panel, TextButton, Thumb } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { Button, EmptyState, Skeleton, Text } from "@/components/core";
import { CheckBox } from "@/components/core/checkbox";
import { LineChip, LineMoney } from "@/components/shop/lines";
import { RefuseSheet } from "@/components/shop/refuse-sheet";
import { UntickSheet, UntickSheetHandle } from "@/components/shop/untick-sheet";
import { apiError } from "@/lib/api-error";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { errorFeedback, successFeedback } from "@/lib/haptics";
import { clock, money, rangeLabel } from "@/lib/booking";
import { ringCourierLine } from "@/lib/shop-courier";
import {
  ShopLine,
  acceptBody,
  acceptLabel,
  acceptNote,
  answeredLines,
  isBasket,
  raceCopy,
  raceLost,
  ringEyebrow,
  ringMoney,
  tickedIds,
  unitsFree,
  untickedMeta,
} from "@/lib/shop-lines";
import {
  Ring,
  RingEnding,
  RingSummary,
  RefuseReason,
  answerErrorText,
  blockResult,
  customerLine,
  customerName,
  endingCopy,
  endingFromBooking,
  endingFromError,
  feeText,
  hereEnding,
  markAnswering,
  markRingOpened,
  moreText,
  otherRings,
  outcomeUnknown,
  parseRing,
  rentByLabel,
  ringDates,
  ringView,
  ringWhere,
  shouldReadBooking,
  summaryOfBooking,
  summaryOfRing,
  unitDots,
  unitsLine,
} from "@/lib/shop-ring";
import { useTheme } from "@/lib/theme";
import { RouteProps, useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { StackActions, useIsFocused, useRoute } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { BellIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, MapPinIcon } from "react-native-heroicons/outline";
import { CheckCircleIcon as CheckCircleMini } from "react-native-heroicons/mini";
import { BellIcon as BellSolid } from "react-native-heroicons/solid";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

/** The bell inside two rings, as SH-01 draws it. */
function RingBell() {
  const { color } = useTheme();
  const circle = (size: number, extra: object) => ({
    width: size,
    height: size,
    borderRadius: radius.full,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...extra,
  });
  return (
    <View
      accessible
      accessibilityLabel="New booking request"
      style={circle(148, { borderWidth: 1.5, borderColor: color.brandPanelLine })}
    >
      <View style={circle(112, { backgroundColor: color.brandPanelLine })}>
        <View style={circle(84, { backgroundColor: color.brand })}>
          <BellSolid size={36} color={color.onBrand} />
        </View>
      </View>
    </View>
  );
}

/** One dot a unit: filled for those in use. */
function UnitDots({ dots }: { dots: boolean[] }) {
  const { color } = useTheme();
  return (
    <View accessible={false} style={{ flexDirection: "row", gap: 4 }}>
      {dots.map((used, i) => (
        <View
          key={i}
          style={{ width: 16, height: 6, borderRadius: radius.full, backgroundColor: used ? color.brand : color.inputLine }}
        />
      ))}
    </View>
  );
}

/** SH-01: the request, who asks, how many units are in use, and what the shop earns. */
function RingingView({
  ring,
  working,
  note,
  onAccept,
  onCantDoIt,
  more,
  onNext,
}: {
  ring: Ring;
  working: "accept" | "refuse" | null;
  note: string | null;
  onAccept: () => void;
  onCantDoIt: () => void;
  /** Other requests that are ringing too. They wait: this screen is not swapped from under the owner's finger. */
  more: number;
  onNext: () => void;
}) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const dots = unitDots(ring.units);
  const fee = feeText(ring);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          paddingTop: space.lg,
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: space.lg,
          gap: space.md,
        }}
      >
        {more > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${moreText(more)}. See the next one.`}
            activeOpacity={0.7}
            onPress={onNext}
            style={{
              alignSelf: "stretch",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.button,
              backgroundColor: color.brandWash,
            }}
          >
            <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
              {moreText(more)}
            </Text>
            <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
              See next
            </Text>
          </TouchableOpacity>
        ) : null}
        <RingBell />
        <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
          New booking
        </Text>
        <Text fontSize="text-2xl" fontWeight="font-bold" accessibilityRole="header" style={{ textAlign: "center" }}>
          {ring.product.title}
        </Text>
        <Text fontSize="text-base" fontWeight="font-bold" style={{ textAlign: "center" }}>
          {ringDates(ring)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
          <MapPinIcon size={16} color={color.textDim} />
          <Text fontSize="text-sm" tone="body">
            {ringWhere(ring)}
          </Text>
        </View>
        {ringCourierLine(ring) ? (
          <Text fontSize="text-sm" tone="body" style={{ textAlign: "center" }}>
            {ringCourierLine(ring)}
          </Text>
        ) : null}

        <Panel style={{ alignSelf: "stretch", marginTop: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md }}>
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
                {ring.customer.first_name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                {customerName(ring.customer)}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
                {ring.customer.id_checked === true ? <CheckCircleMini size={16} color={color.success} /> : null}
                <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                  {customerLine(ring.customer)}
                </Text>
              </View>
            </View>
          </View>
          <View
            accessible
            accessibilityLabel={unitsLine(ring.units)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: space.sm,
              padding: space.md,
              borderTopWidth: 1,
              borderTopColor: color.line,
            }}
          >
            <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
              {unitsLine(ring.units)}
            </Text>
            {dots ? <UnitDots dots={dots} /> : null}
          </View>
        </Panel>

        <Panel style={{ alignSelf: "stretch" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", padding: space.md }}>
            <View>
              <Text fontSize="text-sm" tone="body">
                You earn
              </Text>
              <Text fontSize="text-2xl" fontWeight="font-bold">
                {summaryOfRing(ring).earn}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text fontSize="text-xs" tone="body">
                Renit's fee
              </Text>
              <View style={{ flexDirection: "row", gap: space.sm }}>
                {fee.struck ? (
                  <Text fontSize="text-md" tone="dim" style={{ textDecorationLine: "line-through" }}>
                    {fee.struck}
                  </Text>
                ) : null}
                <Text fontSize="text-md" fontWeight="font-bold" tone="success">
                  {fee.charged}
                </Text>
              </View>
            </View>
          </View>
        </Panel>
        {note ? (
          <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger, textAlign: "center" }}>
            {note}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: Math.max(insets.bottom, space.md), gap: space.sm }}>
        <Button loading={working === "accept"} disabled={working !== null} onPress={onAccept}>
          Accept
        </Button>
        <Button variant="outline" disabled={working !== null} onPress={onCantDoIt}>
          Can't do it
        </Button>
      </View>
    </View>
  );
}

/**
 * MR-01 to MR-03, a request for several items: a row a line with its tick (ticked by default), the units free, what it
 * earns and its deposit; "You earn" as the ticks stand; Accept all, or Accept K of N; Can't do any. An unticked item
 * names why and that it is blocked; an item lost to another booking (an Accept race, or taken while it rang) can't be
 * ticked. An extension takes every item, so it has no ticks (D24).
 */
function BasketRingingView({
  ring,
  working,
  note,
  unticked,
  lost,
  race,
  onTick,
  onAccept,
  onCantDoIt,
  more,
  onNext,
}: {
  ring: Ring;
  working: "accept" | "refuse" | null;
  note: string | null;
  /** The owner's unticks on this phone, with the reason each was given. */
  unticked: Map<number, string>;
  /** Items the server said lost their unit in an Accept race. */
  lost: ReadonlySet<number>;
  race: { title: string; body: string } | null;
  onTick: (line: ShopLine) => void;
  onAccept: (ticked: number[]) => void;
  onCantDoIt: () => void;
  more: number;
  onNext: () => void;
}) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const lines = ring.lines ?? [];
  const extension = Boolean(ring.extends);
  const ticked = tickedIds(lines, extension ? new Set() : new Set(unticked.keys()), lost);
  const sums = ringMoney(ring, ticked);
  const range = rangeLabel(ring.first_day, ring.last_day);
  const deadline = clock(ring.ring_ends_at);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: space.md, paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.lg, gap: space.md }}
      >
        {more > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${moreText(more)}. See the next one.`}
            activeOpacity={0.7}
            onPress={onNext}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.button,
              backgroundColor: color.brandWash,
            }}
          >
            <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
              {moreText(more)}
            </Text>
            <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
              See next
            </Text>
          </TouchableOpacity>
        ) : null}
        {/* The header stays short, so the items start above the fold (Figma ruling G13). */}
        <View style={{ gap: 2 }}>
          <Text fontSize="text-sm" fontWeight="font-bold" tone="brand">
            {ringEyebrow(ring)}
          </Text>
          <Text fontSize="text-xl" fontWeight="font-bold" accessibilityRole="header">
            {ring.product.title}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {ringDates(ring)}
          </Text>
          <Text fontSize="text-sm" tone="body">
            {[ringWhere(ring), ringCourierLine(ring)].filter(Boolean).join(" · ")}
          </Text>
          {deadline ? (
            <View style={{ marginTop: space.xs }}>
              <LineChip label={`Answer by ${deadline}`} tone="neutral" />
            </View>
          ) : null}
        </View>

        <Panel style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md }}>
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
            <Text fontSize="text-md" fontWeight="font-bold" tone="brand">
              {ring.customer.first_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {customerName(ring.customer)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.xs }}>
              {ring.customer.id_checked === true ? <CheckCircleMini size={16} color={color.success} /> : null}
              <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
                {customerLine(ring.customer)}
              </Text>
            </View>
          </View>
        </Panel>

        {race ? (
          <Notice tone="danger" icon="warning" title={race.title}>
            {race.body}
          </Notice>
        ) : null}

        <Panel>
          <View style={{ padding: space.md, gap: 2 }}>
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
                {extension ? "Every item of the booking" : "Tick what you can give"}
              </Text>
              {extension ? null : (
                <Text fontSize="text-sm" tone="body">
                  {`${ticked.length} of ${lines.length} ticked`}
                </Text>
              )}
            </View>
            <Text fontSize="text-sm" tone="body">
              {extension
                ? "An extension takes every item, or none."
                : "Untick what you can't give. We'll block it for these dates."}
            </Text>
          </View>
          {lines.map((line) => {
            const gone = line.state !== "live" || lost.has(line.id);
            const reason = unticked.get(line.id);
            const off = gone || (!extension && reason !== undefined);
            const free = unitsFree(line.units);
            return (
              <View
                key={line.id}
                style={{ flexDirection: "row", gap: space.md, padding: space.md, borderTopWidth: 1, borderTopColor: color.line }}
              >
                <Thumb uri={line.product.cover_image} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text fontSize="text-md" fontWeight="font-bold" tone={off ? "dim" : "default"}>
                    {line.product.title}
                  </Text>
                  <Text fontSize="text-sm" tone="body">
                    {[line.ref, gone ? `0 of ${line.units?.quantity ?? 0} free` : free].filter(Boolean).join(" · ")}
                  </Text>
                  {!gone && reason !== undefined && !extension ? (
                    <Text fontSize="text-sm" tone="body">
                      {untickedMeta(reason, range)}
                    </Text>
                  ) : null}
                  <LineMoney earn={money(line.owner_earns ?? line.rent)} deposit={`Deposit ${money(line.deposit)}`} off={off} />
                  {gone ? (
                    <LineChip label="No longer free" tone="danger" />
                  ) : off ? (
                    <LineChip label="Not available · dates blocked" tone="neutral" />
                  ) : null}
                </View>
                {extension ? null : (
                  <CheckBox
                    checked={!off}
                    onPress={() => (gone ? undefined : onTick(line))}
                    accessibilityLabel={gone ? `${line.product.title}: no longer free` : `Give ${line.product.title}`}
                  />
                )}
              </View>
            );
          })}
        </Panel>

        <Panel style={{ padding: space.md, gap: space.sm }}>
          <MoneyLine label={sums.rentLabel} amount={sums.rent} />
          {sums.delivery ? <MoneyLine label="Delivery" amount={sums.delivery} /> : null}
          <View style={{ height: 1, backgroundColor: color.line }} />
          <MoneyLine label="You earn" amount={sums.earn} bold />
          <Text fontSize="text-xs" tone="body">
            Amounts as Renit sends them for each item. They change as you tick.
          </Text>
        </Panel>
        {note ? (
          <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger, textAlign: "center" }}>
            {note}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: space.sm,
          paddingBottom: Math.max(insets.bottom, space.md),
          gap: space.xs,
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.canvas,
        }}
      >
        <Text fontSize="text-md" accessibilityLiveRegion="polite">
          <Text fontSize="text-md" fontWeight="font-bold">
            {sums.earn}
          </Text>
          {" · You earn"}
        </Text>
        <Text fontSize="text-sm" tone="body">
          {ticked.length === 0 ? "Tick an item to accept, or say you can't do any." : acceptNote(ring.customer.first_name, ticked.length, lines.length)}
        </Text>
        <Button loading={working === "accept"} disabled={working !== null || ticked.length === 0} onPress={() => onAccept(ticked)}>
          {acceptLabel(ticked.length, lines.length)}
        </Button>
        <TextButton label="Can't do any" disabled={working !== null} onPress={onCantDoIt} />
      </View>
    </View>
  );
}

/** SH-03: a request that is over. Another device's answer, this phone's own, or nobody's. */
function EndedView({
  ending,
  summary,
  onDone,
  onSee,
  more = 0,
  onNext,
  detail,
}: {
  ending: RingEnding;
  summary: RingSummary | null;
  /** A basket answered: what was accepted and what was left out (MR-03b). */
  detail?: string | null;
  onDone: () => void;
  /** An accepted request has a booking to go and see. */
  onSee?: () => void;
  /** Other requests are still ringing: the next one is one tap away. */
  more?: number;
  onNext?: () => void;
}) {
  const { color } = useTheme();
  const copy = endingCopy(ending, summary?.firstName ?? null);
  const accepted = ending.outcome === "accepted" && !ending.system;
  const Icon = accepted ? CheckCircleIcon : InformationCircleIcon;
  const tone = accepted ? color.success : color.textBody;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space["2xl"], gap: space.md, alignItems: "center" }}
      >
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accepted ? color.successWash : color.surfaceRaised,
          }}
        >
          <Icon size={44} color={tone} />
        </View>
        <Text fontSize="text-xl" fontWeight="font-bold" accessibilityRole="header" style={{ textAlign: "center" }}>
          {copy.title}
        </Text>
        <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
          {copy.sub}
        </Text>
        {detail ? (
          <Text fontSize="text-md" tone="body" style={{ textAlign: "center" }}>
            {detail}
          </Text>
        ) : null}
        {summary ? (
          <Panel style={{ alignSelf: "stretch", marginTop: space.md }}>
            <View style={{ flexDirection: "row", gap: space.md, padding: space.md }}>
              <Thumb uri={summary.image} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={2}>
                  {summary.title}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {summary.dates}
                </Text>
                <Text fontSize="text-sm" tone="body">
                  {summary.how}
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: space.md,
                borderTopWidth: 1,
                borderTopColor: color.line,
              }}
            >
              <Text fontSize="text-md" tone="body">
                You earn
              </Text>
              <Text fontSize="text-md" fontWeight="font-bold">
                {summary.earn}
              </Text>
            </View>
          </Panel>
        ) : null}
      </ScrollView>
      <BottomBar>
        {more > 0 && onNext ? <Button onPress={onNext}>{`Next request (${more} waiting)`}</Button> : null}
        {accepted && onSee ? (
          <>
            <Button variant={more > 0 ? "outline" : "primary"} onPress={onSee}>
              See booking
            </Button>
            <Button variant="ghost" onPress={onDone}>
              Done
            </Button>
          </>
        ) : (
          <Button variant={more > 0 ? "ghost" : "primary"} onPress={onDone}>
            Done
          </Button>
        )}
      </BottomBar>
    </View>
  );
}

/**
 * What stands in for the request while it is read, or when it cannot be. No state of
 * this screen is a dead end: while it reads there is a way to close it, and a request
 * the server does not know is said to be one.
 */
function Waiting({
  failed,
  missing,
  onRetry,
  onDone,
}: {
  failed: boolean;
  /** The server answered 404: this request is not this account's, or is gone. */
  missing?: boolean;
  onRetry: () => void;
  onDone: () => void;
}) {
  const { color } = useTheme();
  return failed || missing ? (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <EmptyState
        variant="error"
        icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
        title={missing ? "We couldn't find this request" : "We couldn't load this request"}
        body={missing ? "It may belong to another account, or have been removed." : "Check your connection and try again."}
        actionLabel={missing ? "Close" : "Try again"}
        onAction={missing ? onDone : onRetry}
        secondaryActionLabel={missing ? undefined : "Close"}
        onSecondaryAction={missing ? undefined : onDone}
      />
    </View>
  ) : (
    <View style={{ flex: 1 }}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading the request"
        accessibilityState={{ busy: true }}
        style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.xl, gap: space.md }}
      >
        <Skeleton width="100%" height={148} />
        <Skeleton width="100%" height={120} />
        <Skeleton width="100%" height={80} />
      </View>
      <Text
        fontSize="text-md"
        fontWeight="font-bold"
        tone="brand"
        accessibilityRole="button"
        onPress={onDone}
        style={{ textAlign: "center", paddingVertical: space.lg }}
      >
        Close
      </Text>
    </View>
  );
}

/**
 * The shop's ring (SH-01 to SH-03), opened by a `ring` push (from the tray, or
 * with the app open) or from Today. It holds no verdict about the request: it
 * reads the live answer on open and every 3 seconds while it rings, draws what
 * the server says, and sends one tap at a time. A request that has ended, been
 * answered on the dashboard or another phone, or never rang is shown as that.
 * The ring ends by itself when the server says so.
 */
export default function ShopRingScreen() {
  const { params } = useRoute<RouteProps<"ShopRing">>();
  const navigation = useTypedNavigation();
  const queryClient = useQueryClient();
  const { color, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const active = useAppActive();
  const pushed = useMemo(() => parseRing(params.ring), [params.ring]);

  const [here, setHere] = useState<RingEnding | null>(null);
  const [ended, setEnded] = useState<RingEnding | null>(null);
  const [working, setWorking] = useState<"accept" | "refuse" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // A second tap, before the first has been answered, is dropped here: state is not fast enough.
  const sending = useRef(false);
  const sheet = useRef<BottomSheetModal>(null);
  // A basket's ticks (cart §4.1): the items unticked here with their reason, and those lost in an Accept race.
  const untickSheet = useRef<UntickSheetHandle>(null);
  const [unticked, setUnticked] = useState<Map<number, string>>(() => new Map());
  const [lost, setLost] = useState<Set<number>>(() => new Set());
  const [race, setRace] = useState<{ title: string; body: string } | null>(null);

  // What a `ring_ended` push said, when one arrived (written by the router in `nav.tsx`).
  const pushedEnd =
    useQuery<RingEnding | null>(ringEndedQueryKey(params.number), () => null, { enabled: false }).data ?? null;

  const live = useLive(focused && active && !here && !ended && !pushedEnd, params.number);
  const view = ringView({
    number: params.number,
    pushed,
    live: live.data,
    liveFailed: live.isError,
    here,
    ended: ended ?? pushedEnd,
  });
  // This screen is still waiting for an answer while it rings or a tap is in flight: a new ring then waits
  // behind it as "1 more request". Once there is nothing left to answer here, the next ring may open over it.
  const waitingForAnswer = view.kind === "ringing" || working !== null;
  useEffect(() => markRingOpened(params.number), [params.number]);
  useEffect(() => {
    markAnswering(params.number, waitingForAnswer);
    return () => markAnswering(params.number, false);
  }, [params.number, waitingForAnswer]);
  // Back in front (the app was away, or another screen was on top): the request may
  // have ended meanwhile, and the timer was stopped while it was away.
  const { refetch: refetchLive } = live;
  const watching = focused && active && !here && !ended && !pushedEnd;
  useEffect(() => {
    if (watching) void refetchLive();
  }, [watching, refetchLive]);

  // The request as it was seen ringing, for the card on the ended views.
  const known = live.data?.ringing.find((r) => r.number === params.number) ?? pushed;
  // Neither ringing nor remembered (an old tap, a screen left open): the booking itself
  // says what became of it, whether or not a ring was carried in. An accepted request
  // also reads it, for the time the customer has been given to pay.
  const booking = useShopBooking(params.number, shouldReadBooking(view, Boolean(known)));
  // The booking says it is ringing though the live answer did not list it (the two were read
  // a moment apart): read the live answer again instead of saying it is not ringing.
  const ringingPerBooking =
    booking.data?.stage === "ringing" &&
    !booking.data.exit &&
    ["ringing", "calling", "ringing_again"].includes(booking.data.ring_state);
  useEffect(() => {
    if (view.kind === "unknown" && ringingPerBooking) void refetchLive();
    // Read once per answer of the booking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind, ringingPerBooking, booking.dataUpdatedAt]);
  /** The ending with the pay-by time filled in from the booking, when it has one. */
  const withRent = (ending: RingEnding): RingEnding =>
    ending.outcome === "accepted" && !ending.rentBy && booking.data
      ? { ...ending, rentBy: rentByLabel(booking.data, booking.dataUpdatedAt) }
      : ending;

  // Other requests ringing at the same time wait behind this one: they are shown as a count, and
  // opened by the owner (or after this one is answered), never swapped in under a tap.
  const others = otherRings(live.data, params.number);
  const next = others[0];
  const goNext = () => {
    if (next) navigation.dispatch(StackActions.replace("ShopRing", { number: next.number, ring: next }));
  };

  const close = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs"));
  // The booking takes this screen's place, so "back" from it is not a ring that is over.
  const see = () => navigation.dispatch(StackActions.replace("ShopBooking", { number: params.number }));
  const settle = () => {
    void dismissRingNotifications(params.number);
    // Today, the bookings lists and their counts, and the live answer all moved with this answer.
    refreshShop(queryClient);
  };

  /** One answer at a time. A failed tap shows what the server said, or reads the server when it cannot say. */
  const answer = async (kind: "accept" | "refuse", send: () => Promise<RingEnding>) => {
    if (sending.current) return;
    sending.current = true;
    setWorking(kind);
    setNote(null);
    try {
      setHere(await send());
      sheet.current?.dismiss();
      successFeedback();
      settle();
    } catch (error) {
      const failure = apiError(error);
      const ending = endingFromError(failure);
      sheet.current?.dismiss();
      const taken = raceLost(failure);
      if (taken && view.kind === "ringing") {
        // An Accept race (D9): those items are unticked and named, and the request keeps ringing.
        const lines = view.ring.lines ?? [];
        const gone = new Set([...lost, ...taken]);
        setLost(gone);
        setRace(raceCopy(lines.filter((l) => taken.includes(l.id)), tickedIds(lines, new Set(unticked.keys()), gone).length));
        void live.refetch();
        errorFeedback();
      } else if (ending) {
        setEnded(ending);
        errorFeedback();
        settle();
      } else {
        // No answer, or a fault: the tap may have gone through. Read what the server holds.
        // Cart: a basket's items changed (or a push left them out): the live answer has them as they are now.
        const reread = ["stage_not_allowed", "update_app", "lines_unknown"].includes(failure?.code ?? "");
        if (outcomeUnknown(failure) || reread) void live.refetch();
        if (failure?.code !== "stage_not_allowed") setNote(answerErrorText(failure));
        errorFeedback();
      }
    } finally {
      sending.current = false;
      setWorking(null);
    }
  };

  const accept = (ticked: number[] = []) =>
    answer("accept", async () => {
      const booking = await acceptBooking(params.number, view.kind === "ringing" ? acceptBody(view.ring, ticked) : {});
      // Kept for the answered view: a basket's says what was accepted and what was left out.
      queryClient.setQueryData(shopBookingQueryKey(params.number), booking);
      // The server's clock as it answered: the pay-by time is its, not the phone's.
      return hereEnding("accepted", booking.answered?.at ?? null, null, rentByLabel(booking));
    });

  const refuse = (reason: RefuseReason, blockDates: boolean) =>
    answer("refuse", async () => {
      const result = await refuseBooking(params.number, reason, blockDates);
      return hereEnding(
        "refused",
        result.booking.answered?.at ?? null,
        blockResult(reason === "not_available" && blockDates, result.block)
      );
    });

  // A basket answered: the booking's own card, whose earnings follow what was accepted.
  const summary: RingSummary | null =
    booking.data && isBasket(booking.data) && view.kind !== "ringing"
      ? summaryOfBooking(booking.data)
      : known
        ? summaryOfRing(known)
        : booking.data
          ? summaryOfBooking(booking.data)
          : null;
  const detail = booking.data && view.kind !== "ringing" ? answeredLines(booking.data) : null;

  let body: React.ReactNode;
  if (view.kind === "ringing" && isBasket(view.ring)) {
    body = (
      <BasketRingingView
        ring={view.ring}
        working={working}
        note={note}
        unticked={unticked}
        lost={lost}
        race={race}
        onTick={(line) => {
          if (!unticked.has(line.id)) return untickSheet.current?.present(line);
          const next = new Map(unticked);
          next.delete(line.id);
          setUnticked(next);
        }}
        onAccept={(ticked) => void accept(ticked)}
        onCantDoIt={() => sheet.current?.present()}
        more={others.length}
        onNext={goNext}
      />
    );
  } else if (view.kind === "ringing") {
    body = (
      <RingingView
        ring={view.ring}
        working={working}
        note={note}
        onAccept={() => void accept()}
        onCantDoIt={() => sheet.current?.present()}
        more={others.length}
        onNext={goNext}
      />
    );
  } else if (view.kind === "here" || view.kind === "ended") {
    body = (
      <EndedView
        ending={withRent(view.ending)}
        summary={summary}
        detail={view.ending.outcome === "accepted" ? detail : null}
        onDone={close}
        onSee={see}
        more={others.length}
        onNext={goNext}
      />
    );
  } else if (view.kind === "unknown") {
    const finished = booking.data ? endingFromBooking(booking.data, booking.dataUpdatedAt) : null;
    body = booking.data ? (
      finished ? (
        <EndedView
          ending={finished}
          summary={summary}
          detail={finished.outcome === "accepted" ? detail : null}
          onDone={close}
          onSee={see}
          more={others.length}
          onNext={goNext}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon={<BellIcon size={28} color={color.brandText} />}
            title="This request isn't ringing right now"
            body="If it is waiting for you to open, it rings as soon as you do."
            actionLabel="Done"
            onAction={close}
          />
        </View>
      )
    ) : (
      <Waiting
        failed={booking.isError && apiError(booking.error)?.status !== 404}
        missing={apiError(booking.error)?.status === 404}
        onRetry={() => void booking.refetch()}
        onDone={close}
      />
    );
  } else {
    body = <Waiting failed={view.kind === "failed"} onRetry={() => void live.refetch()} onDone={close} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.canvas, paddingTop: insets.top }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {view.kind === "ringing" ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color.brandPanel }]} />
      ) : null}
      {body}
      <RefuseSheet
        ref={sheet}
        dates={summary?.range ?? ""}
        busy={working === "refuse"}
        onRefuse={(reason, block) => void refuse(reason, block)}
      />
      <UntickSheet
        ref={untickSheet}
        range={summary?.range ?? ""}
        onUntick={(line, reason) => setUnticked(new Map(unticked).set(line.id, reason))}
      />
    </View>
  );
}
