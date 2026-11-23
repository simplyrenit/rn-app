import { blockReturned, extendBlock, refreshShop, removeBlock, useOpenBlocks, useToday } from "@/backend/shop-today";
import { setOpenState, shopQueryKey, useShop } from "@/backend/shop";
import { acceptRing, ringEndedQueryKey, settleRing } from "@/backend/shop-ring";
import { Notice } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { Button, EmptyState, SectionHeader, Skeleton, StatusPill, Text } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { useButtonLabelColor } from "@/components/core/button";
import { RingPermissionControl, useRingPermission } from "@/backend/ring-permission";
import { BrandNote } from "@/components/shop/brand-note";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { RingPermissionCard } from "@/components/shop/ring-permission-card";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { dayShort, todayIst } from "@/lib/booking";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { OPEN_BUT_QUIET, quietBody, ringCaption, ringsHere } from "@/lib/ring-permission";
import { cannotOpenMessage } from "@/lib/shop";
import { isQuiet } from "@/lib/shop-today";
import { BookingShop } from "@/lib/shop-booking";
import { dayScreen } from "@/lib/shop-handover";
import { isBasket } from "@/lib/shop-lines";
import { Ring, answerErrorText, endingFromError, ringToOpen } from "@/lib/shop-ring";
import {
  Block,
  NeedsRow,
  TodayRow,
  blockErrorText,
  blockRowLine,
  comingBackRow,
  extendFrom,
  feedNow,
  goingOutRow,
  needsRow,
  openLine,
  removableBlocks,
  removeBlockCopy,
  returnedNotice,
  ringingRow,
  waitingLine,
} from "@/lib/shop-today";
import { softBreaks } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { ChevronRightIcon, PlusIcon } from "react-native-heroicons/mini";
import { BellIcon, CameraIcon, ClockIcon, ExclamationTriangleIcon, InformationCircleIcon } from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";
import type { ShopDesign } from "./home";
import { QuickBlockSheet } from "./quick-block";

// Every number below is from the 08 frames (2091:20977, 2094:21684): rows padded 14 above and below, 12 between
// their parts; the bordered cards r12 with rows inset 16.

/** A section of Today: 16 above it, the kit Section header, 12 to its content. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 16, gap: 12 }}>
      <SectionHeader title={title} gutter={false} flush />
      {children}
    </View>
  );
}

/** The bordered card of "Ringing now", "Going out" and "Coming back". "Blocked now" and "Needs you" have none. */
function Card({ children }: { children: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: color.line,
        borderRadius: 12,
        backgroundColor: color.surface,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

/** A list of bookings in one card: a title, a line under it, and a pill on the right. */
function RowList({ rows, onOpen }: { rows: TodayRow[]; onOpen: (number: string) => void }) {
  const { color } = useTheme();
  return (
    <Card>
      {rows.map((row, index) => (
        <TouchableOpacity
          key={row.number}
          accessibilityRole="button"
          accessibilityLabel={[row.title, row.items, row.sub, row.pill?.label].filter(Boolean).join(". ")}
          accessibilityHint="Opens the booking"
          activeOpacity={0.7}
          onPress={() => onOpen(row.number)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: color.line,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} numberOfLines={2}>
              {row.title}
            </Text>
            <Text fontSize="text-sm" lineHeight={20}>
              {row.sub}
            </Text>
            {row.items ? <StatusPill label={row.items} tone="info" style={{ alignSelf: "flex-start", marginTop: 4 }} /> : null}
          </View>
          {row.pill ? <StatusPill label={row.pill.label} tone={row.pill.tone} /> : null}
        </TouchableOpacity>
      ))}
    </Card>
  );
}

/** "+ Rented at the counter": the icon takes the label's colour whatever the button's state. */
function CounterLabel() {
  const label = useButtonLabelColor();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <PlusIcon size={24} color={label} />
      <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} style={{ color: label }}>
        Rented at the counter
      </Text>
    </View>
  );
}

const NEEDS_ICON = {
  warning: ExclamationTriangleIcon,
  clock: ClockIcon,
  info: InformationCircleIcon,
  camera: CameraIcon,
} as const;

/** One item of "Needs you": the server's words, and what the phone can do about it. */
function NeedsItem({
  row,
  busy,
  onBooking,
  onClaim,
  onProducts,
  onHours,
  onAddress,
  onPhotos,
  onReturned,
  onExtend,
}: {
  row: NeedsRow;
  busy: boolean;
  onBooking: (number: string) => void;
  onClaim: (id: number) => void;
  onProducts: () => void;
  onHours: () => void;
  onAddress: () => void;
  onPhotos: () => void;
  onReturned: (block: Block) => void;
  onExtend: (block: Block) => void;
}) {
  const { color } = useTheme();
  const Icon = NEEDS_ICON[row.icon];
  const tint =
    row.icon === "warning" ? color.danger : row.icon === "clock" ? color.warning : row.icon === "camera" ? color.brandText : color.textBody;
  const wash =
    row.icon === "warning"
      ? color.dangerWash
      : row.icon === "clock"
      ? color.warningWash
      : row.icon === "camera"
      ? color.brandPanel
      : color.surfaceMuted;
  const action = row.action;
  // The photos row has its own button ("Start"), so the row itself is not one.
  const open =
    action?.kind === "booking"
      ? () => onBooking(action.number)
      : action?.kind === "claim"
      ? () => onClaim(action.id)
      : action?.kind === "products"
      ? onProducts
      : action?.kind === "hours"
      ? onHours
      : action?.kind === "address"
      ? onAddress
      : null;
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: wash, alignItems: "center", justifyContent: "center" }}
      >
        <Icon size={22} color={tint} strokeWidth={1.5} />
      </View>
      <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ flex: 1 }}>
        {row.text}
      </Text>
      {action?.kind === "photos" ? (
        // Kit Secondary 44: the frame's stroke is the neutral #E6E6E6, the kit's is brandPanelLine (ENG-426).
        <Button size="compact" variant="outline" accessibilityLabel="Start taking photos" onPress={onPhotos}>
          Start
        </Button>
      ) : open ? (
        <ChevronRightIcon size={20} color={color.textDim} />
      ) : null}
    </View>
  );
  return (
    <View style={{ paddingVertical: 14, gap: 8 }}>
      {open ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={row.text} activeOpacity={0.7} onPress={open}>
          {body}
        </TouchableOpacity>
      ) : (
        <View accessible accessibilityLabel={row.text}>
          {body}
        </View>
      )}
      {action?.kind === "block_back" ? (
        <View style={{ flexDirection: "row", gap: 8, paddingLeft: 40 + 12 }}>
          <Button size="compact" variant="outline" loading={busy} disabled={busy} onPress={() => onReturned(action.block)}>
            Returned
          </Button>
          <Button size="compact" variant="outline" disabled={busy} onPress={() => onExtend(action.block)}>
            Extend
          </Button>
        </View>
      ) : null}
    </View>
  );
}

/** One request in "Ringing now". One item answers here; a basket opens the ring screen, where its items are ticked. */
function RingingItem({
  ring,
  first,
  accepting,
  onOpen,
  onAccept,
}: {
  ring: Ring;
  first: boolean;
  accepting: boolean;
  onOpen: () => void;
  onAccept: () => void;
}) {
  const { color } = useTheme();
  const row = ringingRow(ring);
  const basket = isBasket(ring);
  const content = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Ringing. ${row.title}. ${row.sub}. You earn ${row.earn}.`}
      accessibilityHint="Opens the request to answer it"
      activeOpacity={0.7}
      onPress={onOpen}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 16 }}
    >
      <BellIcon size={24} color={color.brandText} strokeWidth={1.5} />
      <View style={{ flex: 1, gap: 4, alignItems: "flex-start" }}>
        <StatusPill label="Ringing" tone="warning" />
        <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24}>
          {row.title}
        </Text>
        <Text fontSize="text-sm" lineHeight={20} tone="body">
          {row.sub}
        </Text>
      </View>
      <Text fontSize="text-base" fontWeight="font-bold" lineHeight={26}>
        {row.earn}
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: color.line }}>
      {content}
      {/* NEW · Accept (inline on ringing card), 2091:20977: a sibling of the row's touchable, not inside it. */}
      {basket ? null : (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Button
            accessibilityLabel={`Accept ${row.title}`}
            loading={accepting}
            disabled={accepting}
            onPress={onAccept}
          >
            Accept
          </Button>
        </View>
      )}
    </View>
  );
}

const noop = async () => undefined;

/**
 * SH-04, the shop's Today: the Open switch, "Rented at the counter", what is
 * ringing, what goes out and comes back today, and what needs the shop. The
 * feed is the server's (`GET /api/shop/today/`) and is read again every time the
 * screen or the app comes into view, every 15 seconds while it stays there, on a
 * pull down and after a push about the shop; a request that starts ringing takes
 * the screen, once. Nothing here keeps a verdict of its own. The Open switch is the dashboard's switch: what it says
 * is what the server holds.
 *
 * `design` (dev builds, design fixtures only) seeds this phone's ring permission and the quick block's day, and stops
 * a ringing request from taking the screen, so a frame draws the same on any device and any day.
 */
export function ShopTodayView({ bottomPad, design }: { bottomPad: number; design?: ShopDesign }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();
  // The feed is read again by itself every 15 seconds while this screen is in front of an active app.
  const focused = useIsFocused();
  const active = useAppActive();
  const today = useToday(focused && active);
  const shopQuery = useShop();
  const shop = shopQuery.data;
  const feed = today.data;
  const quickBlock = useRef<BottomSheetModal>(null);
  // Whether this phone will ring for a request: the system's notification permission. Only a
  // shop whose requests will ring has anything to say about it (review round 1, finding 2).
  // Under a design fixture the state is the fixture's and nothing asks the system (no prompt on any device).
  const realPerm = useRingPermission();
  const designPerm = design?.ringPermission ?? "unavailable";
  const seeded = useMemo<RingPermissionControl>(
    () => ({ ...realPerm, state: designPerm, ask: noop, askOnce: noop, openSettings: () => undefined }),
    // `realPerm` is spread for its shape only; the seeded control must stay the same object for `askOnce`'s effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [designPerm]
  );
  const ringPerm = design ? seeded : realPerm;
  const canTake = shop?.can_take_bookings === true;
  const phone = canTake ? ringPerm.state : null;
  const [refreshing, setRefreshing] = useState(false);
  const [openBusy, setOpenBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState<number | null>(null);
  const [extending, setExtending] = useState<Block | null>(null);
  // A block made by mistake, taken off after the shop has confirmed (it can have begun already).
  const [removing, setRemoving] = useState<Block | null>(null);
  const removeSheet = useRef<BottomSheetModal>(null);
  const blocks = useOpenBlocks();
  const busy = useRef(false);
  // The inline Accept: one at a time, and a second tap before the answer is dropped.
  const accepting = useRef(false);
  const [acceptingNumber, setAcceptingNumber] = useState<string | null>(null);

  const { refetch } = today;
  // When Today last came into view: only an answer fetched since then may open a ring, never a copy kept from before.
  const since = useRef(0);
  useEffect(() => {
    if (!focused || !active) return;
    since.current = Date.now();
    void refetch();
  }, [focused, active, refetch]);

  // A request that starts ringing while this screen is open takes the screen, as a ring push does (once for each).
  // Not while an inline Accept is in flight: its answer opens the ring screen itself. Never under a design fixture.
  const ringing = feed?.ringing;
  const fetchedAt = today.dataUpdatedAt;
  useEffect(() => {
    if (design || accepting.current) return;
    const ring = focused && active && ringing && fetchedAt >= since.current ? ringToOpen(ringing) : null;
    if (ring) navigation.navigate("ShopRing", { number: ring.number, ring });
  }, [design, focused, active, fetchedAt, ringing, navigation]);

  /**
   * Accept on the card (one item), exactly as the ring screen sends it (`acceptRing`). The ring screen then opens on
   * how it ended: the ending is in `ringEndedQueryKey` before it opens, so it never draws a cached ringing view first.
   */
  const acceptInline = async (ring: Ring) => {
    if (accepting.current) return;
    accepting.current = true;
    setAcceptingNumber(ring.number);
    try {
      await acceptRing(queryClient, ring.number, ring);
      settleRing(queryClient, ring.number);
      navigation.navigate("ShopRing", { number: ring.number });
    } catch (error) {
      const failure = apiError(error);
      const ending = endingFromError(failure);
      if (ending) {
        // It ended another way (answered elsewhere, no unit free, it can't be accepted): the ring screen says how.
        queryClient.setQueryData(ringEndedQueryKey(ring.number), ending);
        settleRing(queryClient, ring.number);
        navigation.navigate("ShopRing", { number: ring.number });
      } else {
        // It is still ringing, or the tap may have gone through: Today is read again. The ring screen shows no note
        // for `stage_not_allowed` either.
        if (failure?.code !== "stage_not_allowed") toast.error(answerErrorText(failure));
        void refetch();
      }
    } finally {
      accepting.current = false;
      setAcceptingNumber(null);
    }
  };

  const changeOpen = async (state: "open" | "closed" | "auto") => {
    if (!shop || openBusy) return;
    setOpenBusy(true);
    try {
      const open = await setOpenState(state);
      queryClient.setQueryData(shopQueryKey(userDetails?.username), { ...shop, open });
      refreshShop(queryClient);
      // Open, but this phone cannot ring: the owner must not go on believing it will.
      if (open.is_open && ringsHere(phone) === false) toast.warning(OPEN_BUT_QUIET.title, { message: OPEN_BUT_QUIET.message });
    } catch (error) {
      const failure = apiError(error);
      if (failure?.code === "cannot_open") {
        toast.warning(cannotOpenMessage(failure.details?.reason, shop.closed_until));
      } else {
        toast.error("We couldn't change that", { message: failure?.message ?? "Check your connection and try again." });
      }
    } finally {
      setOpenBusy(false);
    }
  };

  /** One block call at a time; its answer is the server's, and everything is read again. */
  const blockAction = async (
    block: Block,
    run: () => Promise<unknown>,
    done: string | ((answer: unknown) => { title: string; message?: string })
  ) => {
    if (busy.current) return;
    busy.current = true;
    setBlockBusy(block.id);
    try {
      const answer = await run();
      if (typeof done === "string") toast.success(done);
      else {
        const said = done(answer);
        toast.success(said.title, said.message ? { message: said.message } : undefined);
      }
      refreshShop(queryClient);
    } catch (error) {
      toast.error("We couldn't do that", { message: blockErrorText(apiError(error)) });
      // The block may have moved on (ended on another phone): the lists, "Blocked now" too, are read again.
      void refetch();
      void queryClient.invalidateQueries("shop-open-blocks");
    } finally {
      busy.current = false;
      setBlockBusy(null);
    }
  };

  const openBooking = (number: string) => navigation.navigate("ShopBooking", { number });
  // A row of today's lists opens the day's own screen once there is one: the handover
  // for a booking that is ready, the return for one that is out (ENG-223).
  const openDay = (number: string, stage: string | undefined) =>
    navigation.navigate(dayScreen({ stage: stage as BookingShop["stage"], exit: "" }) ?? "ShopBooking", { number });

  if (!feed) {
    // An account with nothing to rent out has no shop: that is not a fault to retry.
    // 2091:21309 / 21412: the empty state sits 160 under the top of the content, not centred.
    const notOwner = today.isError && ["not_owner", "not_shop_owner"].includes(apiError(today.error)?.code ?? "");
    if (notOwner) {
      return (
        <View style={{ flex: 1, paddingTop: 160 }}>
          <EmptyState
            icon={<BellIcon size={32} color={color.brandText} strokeWidth={1.5} />}
            title="Nothing here yet"
            body="Today and bookings show up here once you have listed something to rent out."
          />
        </View>
      );
    }
    return today.isError ? (
      <View style={{ flex: 1, paddingTop: 160 }}>
        <EmptyState
          variant="error"
          icon={<ExclamationTriangleIcon size={32} color={color.dangerStrong} strokeWidth={1.5} />}
          title="We couldn't load today"
          body="Check your connection and try again."
          actionLabel="Try again"
          onAction={() => void refetch()}
        />
      </View>
    ) : (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading today"
        accessibilityState={{ busy: true }}
        style={{ paddingHorizontal: SCREEN_GUTTER, gap: 16 }}
      >
        <Skeleton width="100%" height={55} />
        <Skeleton width="100%" height={52} />
        <Skeleton width="100%" height={180} />
      </View>
    );
  }

  // The switch reads the shop's own answer, which is the one the settings screen and
  // the dashboard share; the feed's copy fills in until that has loaded.
  const open = shop?.open ?? feed.open;
  // Day words ("today", "yesterday") from the server's date, not the phone's clock (P3-17).
  const now = feedNow(feed);
  const copy = openLine(open, shop?.closed_until ?? null, now);
  const quiet = isQuiet(feed);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([refetch(), shopQuery.refetch()]);
              } finally {
                setRefreshing(false);
              }
            }}
            tintColor={color.textBody}
            colors={[color.brand]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: bottomPad + 32,
          gap: 16,
        }}
      >
        {/* Shop header: the name and the Open switch in a row, the line under them full width, 4 apart. */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Text role="screenTitle" accessibilityRole="header" numberOfLines={2} style={{ flex: 1 }}>
              {shop?.name ? softBreaks(shop.name) : "Your shop"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone={open.is_open ? "success" : "body"}>
                {open.is_open ? "Open" : "Closed"}
              </Text>
              <AppSwitch
                accessibilityLabel="Open"
                value={open.is_open}
                disabled={!shop || openBusy}
                onValueChange={(next) => void changeOpen(next ? "open" : "closed")}
                trackColor={{ true: color.brand, false: color.line }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            {ringCaption(copy.line, open.is_open, phone)}
          </Text>
          {open.reason === "manual" ? (
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.6}
              hitSlop={12}
              onPress={() => void changeOpen("auto")}
              style={{ alignSelf: "flex-start" }}
            >
              <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
                Follow my hours again
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {copy.hint ? <Notice tone="warning" icon="warning">{copy.hint}</Notice> : null}

        <RingPermissionCard enabled={canTake} permission={ringPerm} layout="inline" />

        {/* Fix pass b3-07: the kit Secondary, not a filled primary. */}
        <Button variant="outline" accessibilityLabel="Rented at the counter" onPress={() => quickBlock.current?.present()}>
          <CounterLabel />
        </Button>

        {/* The blocks the shop has made that are not over: one made by mistake is taken off here, also after it began. */}
        {removableBlocks(blocks.data).length > 0 ? (
          <Section title="Blocked now">
            <View>
              {removableBlocks(blocks.data).map((block) => (
                <View key={block.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}>
                  <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${block.product.title}. ${blockRowLine(block, todayIst(now))}`}>
                    <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} numberOfLines={1}>
                      {block.product.title}
                    </Text>
                    <Text fontSize="text-sm" lineHeight={20}>
                      {blockRowLine(block, todayIst(now))}
                    </Text>
                  </View>
                  {/* The frame's Secondary with a #D92D20 label on a #E6E6E6 stroke: the kit's compact Destructive. */}
                  <Button
                    size="compact"
                    variant="warning"
                    accessibilityLabel={`Take off the block on ${block.product.title}`}
                    loading={blockBusy === block.id}
                    disabled={blockBusy !== null}
                    onPress={() => {
                      setRemoving(block);
                      removeSheet.current?.present();
                    }}
                  >
                    Take off
                  </Button>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {feed.ringing.length > 0 ? (
          <Section title="Ringing now">
            <Card>
              {feed.ringing.map((ring, index) => (
                <RingingItem
                  key={ring.number}
                  ring={ring}
                  first={index === 0}
                  accepting={acceptingNumber === ring.number}
                  onOpen={() => navigation.navigate("ShopRing", { number: ring.number, ring })}
                  onAccept={() => void acceptInline(ring)}
                />
              ))}
            </Card>
          </Section>
        ) : null}

        {feed.waiting_to_ring.length > 0 ? (
          <View style={{ gap: 8 }}>
            {feed.waiting_to_ring.map((group) => (
              <BrandNote key={group.ring_at} icon="clock">
                {waitingLine(group, now)}
              </BrandNote>
            ))}
          </View>
        ) : null}

        {feed.going_out.length > 0 ? (
          <Section title="Going out today">
            <RowList
              rows={feed.going_out.map((item) => goingOutRow(item, now))}
              onOpen={(number) => openDay(number, feed.going_out.find((item) => item.number === number)?.stage)}
            />
          </Section>
        ) : null}

        {feed.coming_back.length > 0 ? (
          <Section title="Coming back today">
            <RowList
              rows={feed.coming_back.map((item) => comingBackRow(item, now))}
              onOpen={(number) => openDay(number, feed.coming_back.find((item) => item.number === number)?.stage)}
            />
          </Section>
        ) : null}

        {feed.needs_you.length > 0 ? (
          <Section title="Needs you">
            <View>
              {feed.needs_you.map((item, index) => {
                const row = needsRow(item, index);
                return (
                  <NeedsItem
                    key={row.key}
                    row={row}
                    busy={row.action?.kind === "block_back" && blockBusy === row.action.block.id}
                    onBooking={openBooking}
                    onClaim={(id) => navigation.navigate("Claim", { id })}
                    onProducts={() => navigation.navigate("myProducts")}
                    onHours={() => navigation.navigate("RentalHours")}
                    onAddress={() => navigation.navigate("ShopAddress")}
                    onPhotos={() => navigation.navigate("DraftPhotos")}
                    onReturned={(block) =>
                      // What is said after follows the server's answer: a block that has not ended keeps today's unit taken.
                      void blockAction(block, () => blockReturned(block.id), (answer) =>
                        returnedNotice(answer as Block, feed?.date ?? todayIst())
                      )
                    }
                    onExtend={setExtending}
                  />
                );
              })}
            </View>
          </Section>
        ) : null}

        {quiet ? (
          // 2091:20870: 24 above the empty state, whose words run the content's full 342 (it pads its own gutter).
          <View style={{ paddingTop: 24, marginHorizontal: -SCREEN_GUTTER }}>
            <EmptyState
              icon={<BellIcon size={32} color={color.brandText} strokeWidth={1.5} />}
              title="Nothing needs you right now"
              body={quietBody(phone)}
            />
          </View>
        ) : null}
      </ScrollView>

      <QuickBlockSheet ref={quickBlock} today={design?.today} />
      {/* Always mounted, so its ref is there when a row asks for it; the words are the block's that was asked about. */}
      <ConfirmSheet
        ref={removeSheet}
        title={removing ? removeBlockCopy(removing, todayIst(now)).title : "Take this block off?"}
        body={removing ? removeBlockCopy(removing, todayIst(now)).body : ""}
        confirmLabel="Take it off"
        tone="danger"
        loading={removing !== null && blockBusy === removing.id}
        onConfirm={() => {
          const block = removing;
          removeSheet.current?.dismiss();
          setRemoving(null);
          if (block) void blockAction(block, () => removeBlock(block.id), "Block taken off");
        }}
      />
      {extending ? (
        <DayPickerModal
          title="Extend until"
          line={(picked) =>
            picked ? `${extending.product.title} stays blocked through ${dayShort(picked)}.` : "Pick the new last day."
          }
          value={null}
          minDate={extendFrom(extending, now)}
          onCancel={() => setExtending(null)}
          onPick={(day) => {
            const block = extending;
            setExtending(null);
            void blockAction(block, () => extendBlock(block.id, day), `Blocked through ${dayShort(day)}`);
          }}
        />
      ) : null}
    </>
  );
}
