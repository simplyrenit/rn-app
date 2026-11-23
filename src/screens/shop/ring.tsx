import { acceptRing, refuseBooking, ringEndedQueryKey, settleRing, useLive, useShopBooking } from "@/backend/shop-ring";
import { MoneyLine, Notice, Panel } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { BottomBar, Button, EmptyState, Skeleton, StatusPill, Text } from "@/components/core";
import { LineChip, LineMoney } from "@/components/shop/lines";
import { RefuseSheet } from "@/components/shop/refuse-sheet";
import { UntickSheet, UntickSheetHandle } from "@/components/shop/untick-sheet";
import { apiError } from "@/lib/api-error";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { errorFeedback, successFeedback, tapFeedback } from "@/lib/haptics";
import { clock, money, rangeLabel } from "@/lib/booking";
import { ringCourierLine } from "@/lib/shop-courier";
import {
  ShopLine,
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
import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MapPinIcon,
} from "react-native-heroicons/outline";
import { CheckCircleIcon as CheckCircleMini, ChevronRightIcon } from "react-native-heroicons/mini";
import { CheckIcon } from "react-native-heroicons/solid";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "react-query";

// The 08 frames (2092:21207 …) draw every card r12 with a hairline; `Panel` is the hairline card, at the frames' radius.
const CARD = { borderRadius: 12 } as const;
// The scrolling content of the ringing views: 12 above, 24 below and at the sides, 16 between blocks.
const CONTENT = { paddingTop: 12, paddingHorizontal: SCREEN_GUTTER, paddingBottom: 24, gap: 16 } as const;

/**
 * The product's photo at the frames' size (48 on a basket line, 64 on the answered card), or the frames' plain
 * #F2F2F2 tile. `booking/parts` `Thumb` is fixed at 56 with a camera glyph (ENG-429 owns it).
 */
function ItemPhoto({ uri, size }: { uri: string | null; size: number }) {
  const { color } = useTheme();
  const box = { width: size, height: size, borderRadius: 8, backgroundColor: color.surfaceMuted } as const;
  return uri ? <Image source={{ uri }} style={box} contentFit="cover" transition={150} accessible={false} /> : <View style={box} />;
}

/** "1 more request is waiting · See next" (2092:21207 `More requests banner`). */
function MoreBanner({ more, onNext }: { more: number; onNext: () => void }) {
  const { color } = useTheme();
  return (
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
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: color.brandPanel,
      }}
    >
      <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
        {moreText(more)}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
          See next
        </Text>
        <ChevronRightIcon size={20} color={color.brandText} />
      </View>
    </TouchableOpacity>
  );
}

/** The bell inside two rings (2092:21207 `Bell (ringing)`): neutral since the fix pass (b3-07), not brand-filled. */
function RingBell() {
  const { color, isDark } = useTheme();
  const circle = (size: number) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  });
  return (
    <View accessible accessibilityLabel="New booking request" style={[circle(148), { borderWidth: 1.5, borderColor: color.line }]}>
      {/* #F7F7F8 has no token; dark mode takes the raised surface. */}
      <View style={[circle(112), { backgroundColor: isDark ? color.surfaceRaised : "#F7F7F8" }]}>
        <View style={[circle(84), { backgroundColor: color.surfaceMuted }]}>
          <BellIcon size={36} color={color.textBody} strokeWidth={1.5} />
        </View>
      </View>
    </View>
  );
}

/** One 10pt dot a unit, 4 apart: brand for those in use, the hairline grey for those free. */
function UnitDots({ dots }: { dots: boolean[] }) {
  const { color } = useTheme();
  return (
    <View accessible={false} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {dots.map((used, i) => (
        <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: used ? color.brand : color.line }} />
      ))}
    </View>
  );
}

/** Who asks: the initial, the name and the ID line (2092:21207 `Customer`, 78 high). */
function CustomerRow({ customer }: { customer: Ring["customer"] }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 16 }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: color.brandPanel,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} tone="brand">
          {customer.first_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24}>
          {customerName(customer)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {customer.id_checked === true ? <CheckCircleMini size={16} color={color.success} /> : null}
          <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1 }}>
            {customerLine(customer)}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** A basket line's tick (2092:21288 `Checkbox`): 24, r6, in a 44 touch area that does not move the row. */
function LineTick({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: checked ? color.brand : color.surface,
        borderWidth: checked ? 0 : 1.5,
        borderColor: color.textDim,
      }}
    >
      {checked ? <CheckIcon size={16} color={color.onBrand} /> : null}
    </TouchableOpacity>
  );
}

/** SH-01 (2092:21207): the request, who asks, how many units are in use, and what the shop earns. */
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
  const dots = unitDots(ring.units);
  const fee = feeText(ring);
  const courier = ringCourierLine(ring);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[CONTENT, { alignItems: "center" }]}>
        {more > 0 ? <MoreBanner more={more} onNext={onNext} /> : null}
        <RingBell />
        <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
          New booking
        </Text>
        <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center", alignSelf: "stretch" }}>
          {ring.product.title}
        </Text>
        <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} style={{ textAlign: "center" }}>
          {ringDates(ring)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <MapPinIcon size={16} color={color.textDim} strokeWidth={1.5} />
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            {ringWhere(ring)}
          </Text>
        </View>
        {courier ? (
          <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ textAlign: "center" }}>
            {courier}
          </Text>
        ) : null}

        <Panel style={[CARD, { alignSelf: "stretch" }]}>
          <CustomerRow customer={ring.customer} />
          <View
            accessible
            accessibilityLabel={unitsLine(ring.units)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderTopWidth: 1,
              borderTopColor: color.line,
            }}
          >
            <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1 }}>
              {unitsLine(ring.units)}
            </Text>
            {dots ? <UnitDots dots={dots} /> : null}
          </View>
        </Panel>

        <Panel style={[CARD, { alignSelf: "stretch" }]}>
          <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", padding: 16 }}>
            <View style={{ gap: 2 }}>
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                You earn
              </Text>
              <Text fontSize="text-lg" fontWeight="font-bold" lineHeight={28}>
                {summaryOfRing(ring).earn}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Text fontSize="text-xs" lineHeight={16} tone="dim">
                Renit's fee
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {fee.struck ? (
                  <Text fontSize="text-sm" lineHeight={20} tone="dim" style={{ textDecorationLine: "line-through" }}>
                    {fee.struck}
                  </Text>
                ) : null}
                <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="success">
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

      <BottomBar
        layout="secondary-primary"
        secondary={{ label: "Can't do it", disabled: working !== null, onPress: onCantDoIt }}
        primary={{ label: "Accept", loading: working === "accept", disabled: working !== null, onPress: onAccept }}
      />
    </View>
  );
}

/**
 * MR-01 to MR-03 (2092:21288), a request for several items: a row a line with its tick (ticked by default), the units
 * free, what it earns and its deposit; "You earn" as the ticks stand; Accept all, or Accept K of N; Can't do any. An
 * unticked item names why and that it is blocked; an item lost to another booking (an Accept race, or taken while it
 * rang) can't be ticked. An extension takes every item, so it has no ticks (D24).
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
  const lines = ring.lines ?? [];
  const extension = Boolean(ring.extends);
  const ticked = tickedIds(lines, extension ? new Set() : new Set(unticked.keys()), lost);
  const sums = ringMoney(ring, ticked);
  const range = rangeLabel(ring.first_day, ring.last_day);
  const deadline = clock(ring.ring_ends_at);
  const divider = { borderTopWidth: 1, borderTopColor: color.line } as const;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={CONTENT}>
        {more > 0 ? <MoreBanner more={more} onNext={onNext} /> : null}
        {/* The header stays short, so the items start above the fold (Figma ruling G13). */}
        <View style={{ gap: 2 }}>
          <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
            {ringEyebrow(ring)}
          </Text>
          <Text role="screenTitle" accessibilityRole="header">
            {ring.product.title}
          </Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            {ringDates(ring)}
          </Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            {[ringWhere(ring), ringCourierLine(ring)].filter(Boolean).join(" · ")}
          </Text>
          {deadline ? (
            <View style={{ paddingTop: 4 }}>
              <StatusPill label={`Answer by ${deadline}`} tone="neutral" style={{ alignSelf: "flex-start" }} />
            </View>
          ) : null}
        </View>

        <Panel style={CARD}>
          <CustomerRow customer={ring.customer} />
        </Panel>

        {race ? (
          <Notice tone="danger" icon="warning" title={race.title}>
            {race.body}
          </Notice>
        ) : null}

        <Panel style={CARD}>
          <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} style={{ flex: 1 }}>
                {extension ? "Every item of the booking" : "Tick what you can give"}
              </Text>
              {extension ? null : (
                <Text fontSize="text-sm" lineHeight={20} tone="body">
                  {`${ticked.length} of ${lines.length} ticked`}
                </Text>
              )}
            </View>
            <Text fontSize="text-sm" lineHeight={20} tone="body">
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
              <View key={line.id} style={[{ flexDirection: "row", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }, divider]}>
                <ItemPhoto uri={line.product.cover_image} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} tone={off ? "dim" : "default"}>
                    {line.product.title}
                  </Text>
                  <Text fontSize="text-sm" lineHeight={20} tone="body">
                    {[line.ref, gone ? `0 of ${line.units?.quantity ?? 0} free` : free].filter(Boolean).join(" · ")}
                  </Text>
                  {!gone && reason !== undefined && !extension ? (
                    <Text fontSize="text-sm" lineHeight={20} tone="body">
                      {untickedMeta(reason, range)}
                    </Text>
                  ) : null}
                  <LineMoney earn={money(line.owner_earns ?? line.rent)} deposit={`Deposit ${money(line.deposit)}`} off={off} />
                  {gone ? (
                    <View style={{ paddingTop: 4 }}>
                      <LineChip label="No longer free" tone="danger" />
                    </View>
                  ) : off ? (
                    <View style={{ paddingTop: 4 }}>
                      <LineChip label="Not available · dates blocked" tone="neutral" />
                    </View>
                  ) : null}
                </View>
                {extension ? null : (
                  <LineTick
                    checked={!off}
                    onPress={() => (gone ? undefined : onTick(line))}
                    label={gone ? `${line.product.title}: no longer free` : `Give ${line.product.title}`}
                  />
                )}
              </View>
            );
          })}
        </Panel>

        <Panel style={[CARD, { padding: 16, gap: 12 }]}>
          <MoneyLine label={sums.rentLabel} amount={sums.rent} />
          {sums.delivery ? <MoneyLine label="Delivery" amount={sums.delivery} /> : null}
          <MoneyLine label="You earn" amount={sums.earn} total />
          <Text fontSize="text-xs" lineHeight={16} tone="dim">
            Amounts as Renit sends them for each item. They change as you tick.
          </Text>
        </Panel>
        {note ? (
          <Text fontSize="text-sm" accessibilityRole="alert" style={{ color: color.danger, textAlign: "center" }}>
            {note}
          </Text>
        ) : null}
      </ScrollView>

      {/* 2092:21288 `Sticky footer`: the summary (76) over the kit Bottom bar CTA+Text, one hairline above both. */}
      <View style={[divider, { backgroundColor: color.canvas }]}>
        <View style={{ paddingTop: 12, paddingHorizontal: SCREEN_GUTTER, gap: 4 }}>
          <View accessible accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text fontSize="text-lg" fontWeight="font-bold" lineHeight={28}>
              {sums.earn}
            </Text>
            <Text fontSize="text-sm" lineHeight={20} tone="body">
              · You earn
            </Text>
          </View>
          <Text fontSize="text-xs" lineHeight={16} tone="dim">
            {ticked.length === 0
              ? "Tick an item to accept, or say you can't do any."
              : acceptNote(ring.customer.first_name, ticked.length, lines.length)}
          </Text>
        </View>
        <BottomBar
          layout="cta-text"
          style={{ borderTopWidth: 0 }}
          primary={{
            label: acceptLabel(ticked.length, lines.length),
            loading: working === "accept",
            disabled: working !== null || ticked.length === 0,
            onPress: () => onAccept(ticked),
          }}
          secondary={{ label: "Can't do any", disabled: working !== null, onPress: onCantDoIt }}
        />
      </View>
    </View>
  );
}

/** SH-03 (2092:21395, 2092:21444): a request that is over. Another device's answer, this phone's own, or nobody's. */
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
  const seeBooking = accepted && onSee ? onSee : undefined;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 64, paddingHorizontal: SCREEN_GUTTER, paddingBottom: 24, gap: 12, alignItems: "center" }}
      >
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accepted ? color.successWash : color.surfaceMuted,
          }}
        >
          <Icon size={44} color={accepted ? color.success : color.textDim} strokeWidth={1.5} />
        </View>
        {/* The frames' 4pt spacer: 28 from the circle to the title. */}
        <View style={{ height: 4 }} />
        <Text role="screenTitle" accessibilityRole="header" style={{ textAlign: "center", alignSelf: "stretch" }}>
          {copy.title}
        </Text>
        <Text fontSize="text-md" lineHeight={24} tone="body" style={{ textAlign: "center", alignSelf: "stretch" }}>
          {copy.sub}
        </Text>
        {detail ? (
          <Text fontSize="text-md" lineHeight={24} tone="body" style={{ textAlign: "center", alignSelf: "stretch" }}>
            {detail}
          </Text>
        ) : null}
        {summary ? (
          <Panel style={[CARD, { alignSelf: "stretch" }]}>
            <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
              <ItemPhoto uri={summary.image} size={64} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} numberOfLines={2}>
                  {summary.title}
                </Text>
                <Text fontSize="text-sm" lineHeight={20} tone="body">
                  {summary.dates}
                </Text>
                <Text fontSize="text-sm" lineHeight={20} tone="body">
                  {summary.how}
                </Text>
              </View>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderTopWidth: 1,
                borderTopColor: color.line,
              }}
            >
              <Text fontSize="text-sm" lineHeight={20} tone="body">
                You earn
              </Text>
              <Text fontSize="text-md" fontWeight="font-bold" lineHeight={24}>
                {summary.earn}
              </Text>
            </View>
          </Panel>
        ) : null}
      </ScrollView>
      {more > 0 && onNext ? (
        // Three ways on: no kit layout holds them, so the bar's passthrough carries three kit Buttons (no frame draws it).
        <BottomBar>
          <Button onPress={onNext}>{`Next request (${more} waiting)`}</Button>
          {seeBooking ? (
            <Button variant="outline" onPress={seeBooking}>
              See booking
            </Button>
          ) : null}
          <Button variant="ghost" onPress={onDone}>
            Done
          </Button>
        </BottomBar>
      ) : seeBooking ? (
        <BottomBar
          layout="cta-text"
          primary={{ label: "See booking", onPress: seeBooking }}
          secondary={{ label: "Done", onPress: onDone }}
        />
      ) : (
        <BottomBar layout="full-cta" primary={{ label: "Done", onPress: onDone }} />
      )}
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
  // Today, the bookings lists and their counts, and the live answer all moved with this answer.
  const settle = () => settleRing(queryClient, params.number);

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
      // The shared accept (Today's inline Accept sends the same): the booking is kept for the answered view, where a
      // basket's says what was accepted and what was left out.
      const booking = await acceptRing(queryClient, params.number, view.kind === "ringing" ? view.ring : null, ticked);
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
