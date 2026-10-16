import { blockReturned, extendBlock, refreshShop, removeBlock, useOpenBlocks, useToday } from "@/backend/shop-today";
import { setOpenState, shopQueryKey, useShop } from "@/backend/shop";
import { Notice, Panel } from "@/components/booking/parts";
import { useAppActive } from "@/components/booking/use-app-active";
import { Button, EmptyState, Skeleton, Text } from "@/components/core";
import { ConfirmSheet } from "@/components/core/confirm-sheet";
import { useButtonLabelColor } from "@/components/core/button";
import { useRingPermission } from "@/backend/ring-permission";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { RingPermissionCard } from "@/components/shop/ring-permission-card";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { dayShort, todayIst } from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { OPEN_BUT_QUIET, quietBody, ringCaption, ringsHere } from "@/lib/ring-permission";
import { cannotOpenMessage } from "@/lib/shop";
import { isQuiet } from "@/lib/shop-today";
import { BookingShop } from "@/lib/shop-booking";
import { dayScreen } from "@/lib/shop-handover";
import { ringToOpen } from "@/lib/shop-ring";
import {
  Block,
  NeedsRow,
  RowPill,
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
import React, { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { AppSwitch } from "@/components/core/switch";
import { ChevronRightIcon } from "react-native-heroicons/mini";
import {
  BellIcon,
  CameraIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
} from "react-native-heroicons/outline";
import { useQueryClient } from "react-query";
import { QuickBlockSheet } from "./quick-block";

function PillView({ pill }: { pill: RowPill }) {
  const { color } = useTheme();
  const tint = {
    success: { fg: color.success, bg: color.successWash },
    warning: { fg: color.warning, bg: color.warningWash },
    danger: { fg: color.danger, bg: color.dangerWash },
    neutral: { fg: color.textBody, bg: color.surfaceRaised },
  }[pill.tone];
  return (
    <View style={{ backgroundColor: tint.bg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text fontSize="text-xs" fontWeight="font-bold" style={{ color: tint.fg }}>
        {pill.label}
      </Text>
    </View>
  );
}

/** A list of bookings in one card: a title, a quiet line, and a pill on the right. */
function RowList({ rows, onOpen }: { rows: TodayRow[]; onOpen: (number: string) => void }) {
  const { color } = useTheme();
  return (
    <Panel>
      {rows.map((row, index) => (
        <TouchableOpacity
          key={row.number}
          accessibilityRole="button"
          accessibilityLabel={[row.title, row.sub, row.pill?.label].filter(Boolean).join(". ")}
          accessibilityHint="Opens the booking"
          activeOpacity={0.7}
          onPress={() => onOpen(row.number)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.sm,
            padding: space.md,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: color.line,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={2}>
              {row.title}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {row.sub}
            </Text>
          </View>
          {row.pill ? <PillView pill={row.pill} /> : null}
        </TouchableOpacity>
      ))}
    </Panel>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** "+ Rented at the counter": the icon takes the label's colour whatever the button's state. */
function CounterLabel() {
  const label = useButtonLabelColor();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
      <PlusIcon size={20} color={label} />
      <Text fontSize="text-md" fontWeight="font-bold" style={{ color: label }}>
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
  first,
  busy,
  onBooking,
  onClaim,
  onProducts,
  onHours,
  onPhotos,
  onReturned,
  onExtend,
}: {
  row: NeedsRow;
  first: boolean;
  busy: boolean;
  onBooking: (number: string) => void;
  onClaim: (id: number) => void;
  onProducts: () => void;
  onHours: () => void;
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
      ? color.brandWash
      : color.surfaceRaised;
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
      : null;
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <View
        style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: wash, alignItems: "center", justifyContent: "center" }}
      >
        <Icon size={22} color={tint} />
      </View>
      <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
        {row.text}
      </Text>
      {action?.kind === "photos" ? (
        <Button size="compact" variant="outline" accessibilityLabel="Start taking photos" onPress={onPhotos}>
          Start
        </Button>
      ) : open ? (
        <ChevronRightIcon size={20} color={color.textBody} />
      ) : null}
    </View>
  );
  return (
    <View
      style={{ padding: space.md, gap: space.sm, borderTopWidth: first ? 0 : 1, borderTopColor: color.line }}
    >
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
        <View style={{ flexDirection: "row", gap: space.sm, paddingLeft: 40 + space.md }}>
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

/**
 * SH-04, the shop's Today: the Open switch, "Rented at the counter", what is
 * ringing, what goes out and comes back today, and what needs the shop. The
 * feed is the server's (`GET /api/shop/today/`) and is read again every time the
 * screen or the app comes into view, every 15 seconds while it stays there, on a
 * pull down and after a push about the shop; a request that starts ringing takes
 * the screen, once. Nothing here keeps a verdict of its own. The Open switch is the dashboard's switch: what it says
 * is what the server holds.
 */
export function ShopTodayView({ bottomPad }: { bottomPad: number }) {
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
  const ringPerm = useRingPermission();
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

  const { refetch } = today;
  // When Today last came into view: only an answer fetched since then may open a ring, never a copy kept from before.
  const since = useRef(0);
  useEffect(() => {
    if (!focused || !active) return;
    since.current = Date.now();
    void refetch();
  }, [focused, active, refetch]);

  // A request that starts ringing while this screen is open takes the screen, as a ring push does (once for each).
  const ringing = feed?.ringing;
  const fetchedAt = today.dataUpdatedAt;
  useEffect(() => {
    const ring = focused && active && ringing && fetchedAt >= since.current ? ringToOpen(ringing) : null;
    if (ring) navigation.navigate("ShopRing", { number: ring.number, ring });
  }, [focused, active, fetchedAt, ringing, navigation]);

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
    const notOwner = today.isError && ["not_owner", "not_shop_owner"].includes(apiError(today.error)?.code ?? "");
    if (notOwner) {
      return (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon={<BellIcon size={28} color={color.brandText} />}
            title="Nothing here yet"
            body="Today and bookings show up here once you have listed something to rent out."
          />
        </View>
      );
    }
    return today.isError ? (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <EmptyState
          variant="error"
          icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
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
        style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, gap: space.md }}
      >
        <Skeleton width="100%" height={64} />
        <Skeleton width="100%" height={48} />
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
          paddingTop: space.sm,
          paddingBottom: bottomPad + space.lg,
          gap: space.lg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Text role="screenTitle" accessibilityRole="header" numberOfLines={2} style={{ flex: 1 }}>
            {shop?.name ? softBreaks(shop.name) : "Your shop"}
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Text fontSize="text-md" fontWeight="font-bold" tone={open.is_open ? "success" : "body"}>
                {open.is_open ? "Open" : "Closed"}
              </Text>
              <AppSwitch
                accessibilityLabel="Open"
                value={open.is_open}
                disabled={!shop || openBusy}
                onValueChange={(next) => void changeOpen(next ? "open" : "closed")}
                trackColor={{ true: color.brand, false: color.inputLine }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text fontSize="text-sm" tone="body" style={{ maxWidth: 190, textAlign: "right" }}>
              {ringCaption(copy.line, open.is_open, phone)}
            </Text>
            {open.reason === "manual" ? (
              <Text
                fontSize="text-sm"
                fontWeight="font-bold"
                tone="brand"
                accessibilityRole="button"
                onPress={() => void changeOpen("auto")}
                style={{ paddingVertical: space.xs }}
              >
                Follow my hours again
              </Text>
            ) : null}
          </View>
        </View>

        {copy.hint ? <Notice tone="warning" icon="warning">{copy.hint}</Notice> : null}

        <RingPermissionCard enabled={canTake} permission={ringPerm} />

        <Button accessibilityLabel="Rented at the counter" onPress={() => quickBlock.current?.present()}>
          <CounterLabel />
        </Button>

        {/* The blocks the shop has made that are not over: one made by mistake is taken off here, also after it began. */}
        {removableBlocks(blocks.data).length > 0 ? (
          <Section title="Blocked now">
            <Panel>
              {removableBlocks(blocks.data).map((block, index) => (
                <View
                  key={block.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space.md,
                    padding: space.md,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: color.line,
                  }}
                >
                  <View style={{ flex: 1, gap: 2 }} accessible accessibilityLabel={`${block.product.title}. ${blockRowLine(block, todayIst(now))}`}>
                    <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
                      {block.product.title}
                    </Text>
                    <Text fontSize="text-sm" tone="body">
                      {blockRowLine(block, todayIst(now))}
                    </Text>
                  </View>
                  <Button
                    size="compact"
                    variant="outline"
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
            </Panel>
          </Section>
        ) : null}

        {feed.ringing.length > 0 ? (
          <Section title="Ringing now">
            <Panel>
              {feed.ringing.map((ring, index) => {
                const row = ringingRow(ring);
                return (
                  <TouchableOpacity
                    key={ring.number}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.title}. ${row.sub}. You earn ${row.earn}.`}
                    accessibilityHint="Opens the request to answer it"
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate("ShopRing", { number: ring.number, ring })}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: space.md,
                      padding: space.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: color.line,
                      backgroundColor: color.brandPanel,
                    }}
                  >
                    <BellIcon size={24} color={color.brandText} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={1}>
                        {row.title}
                      </Text>
                      <Text fontSize="text-sm" tone="body">
                        {row.sub}
                      </Text>
                    </View>
                    <Text fontSize="text-md" fontWeight="font-bold">
                      {row.earn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </Panel>
          </Section>
        ) : null}

        {feed.waiting_to_ring.length > 0 ? (
          <View style={{ gap: space.sm }}>
            {feed.waiting_to_ring.map((group) => (
              <Notice key={group.ring_at} tone="brand" icon="clock">
                {waitingLine(group, now)}
              </Notice>
            ))}
          </View>
        ) : null}

        {feed.going_out.length > 0 ? (
          <Section title="Going out today">
            <RowList
              rows={feed.going_out.map(goingOutRow)}
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
            <Panel>
              {feed.needs_you.map((item, index) => {
                const row = needsRow(item, index);
                return (
                  <NeedsItem
                    key={row.key}
                    row={row}
                    first={index === 0}
                    busy={row.action?.kind === "block_back" && blockBusy === row.action.block.id}
                    onBooking={openBooking}
                    onClaim={(id) => navigation.navigate("Claim", { id })}
                    onProducts={() => navigation.navigate("myProducts")}
                    onHours={() => navigation.navigate("RentalHours")}
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
            </Panel>
          </Section>
        ) : null}

        {quiet ? (
          <EmptyState
            compact
            icon={<BellIcon size={26} color={color.brandText} />}
            title="Nothing needs you right now"
            body={quietBody(phone)}
          />
        ) : null}
      </ScrollView>

      <QuickBlockSheet ref={quickBlock} />
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
