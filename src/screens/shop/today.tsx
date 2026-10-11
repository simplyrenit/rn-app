import { blockReturned, extendBlock, refreshShop, useToday } from "@/backend/shop-today";
import { setOpenState, shopQueryKey, useShop } from "@/backend/shop";
import { Notice, Panel } from "@/components/booking/parts";
import { Button, EmptyState, Skeleton, Text } from "@/components/core";
import { useButtonLabelColor } from "@/components/core/button";
import { DayPickerModal } from "@/components/shop/day-picker-modal";
import { useGlobalContext } from "@/context/global-context";
import { apiError } from "@/lib/api-error";
import { dayShort } from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { cannotOpenMessage } from "@/lib/shop";
import { isQuiet } from "@/lib/shop-today";
import {
  Block,
  NeedsRow,
  RowPill,
  TodayRow,
  blockErrorText,
  comingBackRow,
  extendFrom,
  goingOutRow,
  needsRow,
  openLine,
  ringingRow,
  waitingLine,
} from "@/lib/shop-today";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useTypedNavigation } from "@/lib/types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { RefreshControl, ScrollView, Switch, TouchableOpacity, View } from "react-native";
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
 * screen comes into view and after a push about the shop; nothing here keeps a
 * verdict of its own. The Open switch is the dashboard's switch: what it says
 * is what the server holds.
 */
export function ShopTodayView({ bottomPad }: { bottomPad: number }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const queryClient = useQueryClient();
  const { userDetails } = useGlobalContext();
  const today = useToday();
  const shopQuery = useShop();
  const shop = shopQuery.data;
  const feed = today.data;
  const quickBlock = useRef<BottomSheetModal>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openBusy, setOpenBusy] = useState(false);
  const [blockBusy, setBlockBusy] = useState<number | null>(null);
  const [extending, setExtending] = useState<Block | null>(null);
  const busy = useRef(false);

  const { refetch } = today;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const changeOpen = async (state: "open" | "closed" | "auto") => {
    if (!shop || openBusy) return;
    setOpenBusy(true);
    try {
      const open = await setOpenState(state);
      queryClient.setQueryData(shopQueryKey(userDetails?.username), { ...shop, open });
      refreshShop(queryClient);
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
  const blockAction = async (block: Block, run: () => Promise<unknown>, done: string) => {
    if (busy.current) return;
    busy.current = true;
    setBlockBusy(block.id);
    try {
      await run();
      toast.success(done);
      refreshShop(queryClient);
    } catch (error) {
      toast.error("We couldn't do that", { message: blockErrorText(apiError(error)) });
      void refetch();
    } finally {
      busy.current = false;
      setBlockBusy(null);
    }
  };

  const openBooking = (number: string) => navigation.navigate("ShopBooking", { number });

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
  const copy = openLine(open, shop?.closed_until ?? null);
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
            {shop?.name || "Your shop"}
          </Text>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Text fontSize="text-md" fontWeight="font-bold" tone={open.is_open ? "success" : "body"}>
                {open.is_open ? "Open" : "Closed"}
              </Text>
              <Switch
                accessibilityLabel="Open"
                value={open.is_open}
                disabled={!shop || openBusy}
                onValueChange={(next) => void changeOpen(next ? "open" : "closed")}
                trackColor={{ true: color.brand, false: color.inputLine }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text fontSize="text-sm" tone="body" style={{ maxWidth: 190, textAlign: "right" }}>
              {copy.line}
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

        <Button accessibilityLabel="Rented at the counter" onPress={() => quickBlock.current?.present()}>
          <CounterLabel />
        </Button>

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
                {waitingLine(group)}
              </Notice>
            ))}
          </View>
        ) : null}

        {feed.going_out.length > 0 ? (
          <Section title="Going out today">
            <RowList rows={feed.going_out.map(goingOutRow)} onOpen={openBooking} />
          </Section>
        ) : null}

        {feed.coming_back.length > 0 ? (
          <Section title="Coming back today">
            <RowList rows={feed.coming_back.map((item) => comingBackRow(item))} onOpen={openBooking} />
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
                    onProducts={() => navigation.navigate("myProducts")}
                    onHours={() => navigation.navigate("RentalHours")}
                    onPhotos={() => navigation.navigate("DraftPhotos")}
                    onReturned={(block) =>
                      void blockAction(block, () => blockReturned(block.id), `${block.product.title} is back`)
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
            body="New requests ring this phone. What goes out and comes back today shows up here."
          />
        ) : null}
      </ScrollView>

      <QuickBlockSheet ref={quickBlock} />
      {extending ? (
        <DayPickerModal
          title="Extend until"
          line={(picked) =>
            picked ? `${extending.product.title} stays blocked through ${dayShort(picked)}.` : "Pick the new last day."
          }
          value={null}
          minDate={extendFrom(extending)}
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
