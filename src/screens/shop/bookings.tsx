import { useShopBookings, useShopCounts } from "@/backend/shop-bookings";
import { Chip, EmptyState, Skeleton, StatusPill, Text } from "@/components/core";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { correctedNow } from "@/lib/server-clock";
import { BookingCard, SHOP_TABS, ShopTab, bookingCard, defaultTab, emptyTab, revealChipAt } from "@/lib/shop-booking";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { CalendarIcon } from "react-native-heroicons/mini";
import { CalendarDaysIcon, CameraIcon, ExclamationTriangleIcon } from "react-native-heroicons/outline";
import type { ShopDesign } from "./home";

/**
 * The card's 64 thumb (2083:16747 `Thumb`): a `surfaceMuted` tile, r8, with the photo 52 inside it, 6 in. The
 * `booking/parts` Thumb is the 56 edge-to-edge photo of the customer's cards (ENG-429), so the shop's is its own.
 */
function CardThumb({ uri }: { uri: string | null }) {
  const { color } = useTheme();
  return (
    <View
      style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: color.surfaceMuted, alignItems: "center", justifyContent: "center" }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: 52, height: 52 }} contentFit="contain" transition={150} accessible={false} />
      ) : (
        <CameraIcon size={24} color={color.textDim} />
      )}
    </View>
  );
}

/**
 * One booking (2083:16747 `Booking card`): the item, who and how, its stage, the next thing to do, and what the shop
 * earns. A card r12 with a hairline; the top padded 16, the next step a `brandPanel` band, "You earn" under a hairline.
 */
function BookingRow({ card, onPress }: { card: BookingCard; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={[card.title, card.items, card.pill.label, card.dates, card.who, card.note, `You earn ${card.earn}`]
        .filter(Boolean)
        .join(". ")}
      accessibilityHint="Opens the booking"
      activeOpacity={0.7}
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: color.line, borderRadius: 12, backgroundColor: color.surface, overflow: "hidden" }}
    >
      <View style={{ flexDirection: "row", gap: 12, padding: 16 }}>
        <CardThumb uri={card.image} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} numberOfLines={2} style={{ flex: 1 }}>
              {card.title}
            </Text>
            <StatusPill label={card.pill.label} tone={card.pill.tone} />
          </View>
          <Text fontSize="text-sm" lineHeight={20}>
            {card.dates}
          </Text>
          <Text fontSize="text-sm" lineHeight={20}>
            {card.who}
          </Text>
          {card.items ? <StatusPill label={card.items} tone="info" style={{ alignSelf: "flex-start", marginTop: 4 }} /> : null}
        </View>
      </View>
      {card.note ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: color.brandPanel,
          }}
        >
          <CalendarIcon size={16} color={color.brandText} />
          <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ flex: 1 }}>
            {card.note}
          </Text>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: color.line,
        }}
      >
        <Text fontSize="text-sm" lineHeight={20}>
          You earn
        </Text>
        <Text fontSize="text-md" fontWeight="font-bold" lineHeight={24}>
          {card.earn}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * SH-06, the shop's bookings by stage, with the counts on the tabs. Every list is
 * the server's: a tab is asked for by itself, a page at a time, and read again each
 * time the screen comes into view. A booking that is still ringing opens the ring.
 */
export function ShopBookingsView({ bottomPad, design }: { bottomPad: number; design?: ShopDesign }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const counts = useShopCounts();
  // Until the shop picks a tab it opens on the first stage with something in it (a design fixture may name one).
  const [picked, setPicked] = useState<ShopTab | null>(design?.tab ?? null);
  const tab: ShopTab = picked ?? (counts.data || counts.isError ? defaultTab(counts.data) : "confirmed");
  const countsReady = Boolean(counts.data) || counts.isError;
  const list = useShopBookings(tab, countsReady || picked !== null);
  const { refetch } = list;
  const { refetch: refetchCounts } = counts;
  const [refreshing, setRefreshing] = useState(false);

  // The chip row scrolls sideways: the chosen chip (the default one included) is kept in view, not half off the edge.
  const chipRow = useRef<ScrollView>(null);
  const chipAt = useRef<Partial<Record<ShopTab, { x: number; width: number }>>>({});
  const rowWidth = useRef(0);
  const rowOffset = useRef(0);
  const revealTab = useCallback((key: ShopTab) => {
    const chip = chipAt.current[key];
    if (!chip) return;
    const to = revealChipAt(chip, rowWidth.current, rowOffset.current, SCREEN_GUTTER);
    if (to !== rowOffset.current) chipRow.current?.scrollTo({ x: to, animated: true });
  }, []);
  useEffect(() => revealTab(tab), [tab, revealTab]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchCounts();
    }, [refetch, refetchCounts])
  );

  const rows = useMemo(() => (list.data?.pages ?? []).flatMap((page) => page.results), [list.data]);
  // Day words on the cards ("Collects today") by the server's clock as the last page said it (P3-17).
  const lastPage = list.data?.pages[list.data.pages.length - 1];
  const now = correctedNow(lastPage?.results[0]?.server_time, list.dataUpdatedAt);
  const empty = emptyTab(tab);
  const loading = (list.isLoading || list.isIdle) && !list.data;
  const failed = !list.data && list.isError;

  return (
    <View style={{ flex: 1 }}>
      {/* 2083:16747: a 52 row of 40 kit Chips, 8 apart on the gutter, then 8 to the list. */}
      <View style={{ height: 52 }}>
        <ScrollView
          ref={chipRow}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={(event) => {
            rowOffset.current = event.nativeEvent.contentOffset.x;
          }}
          onLayout={(event) => {
            rowWidth.current = event.nativeEvent.layout.width;
            revealTab(tab);
          }}
          accessibilityRole="tablist"
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: 8, alignItems: "center" }}
        >
          {SHOP_TABS.map(({ key, label }) => {
            const selected = key === tab;
            const count = counts.data?.[key];
            // The frames draw the count in the label, two spaces after it ("Ready  3").
            const label_ = count === undefined ? label : `${label}  ${count}`;
            return (
              <Chip
                key={key}
                label={label_}
                selected={selected}
                accessibilityRole="tab"
                accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
                accessibilityState={{ selected }}
                hitSlop={{ top: 2, bottom: 2 }}
                onLayout={(event) => {
                  chipAt.current[key] = { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width };
                  if (key === tab) revealTab(key);
                }}
                onPress={() => {
                  if (!selected) selectionFeedback();
                  setPicked(key);
                }}
              />
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading bookings"
          accessibilityState={{ busy: true }}
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, gap: 12 }}
        >
          <Skeleton width="100%" height={191} />
          <Skeleton width="100%" height={191} />
        </View>
      ) : failed ? (
        <View style={{ flex: 1, paddingTop: 128 }}>
          <EmptyState
            variant="error"
            icon={<ExclamationTriangleIcon size={32} color={color.dangerStrong} strokeWidth={1.5} />}
            title="We couldn't load your bookings"
            body="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(b) => b.number}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <BookingRow
              card={bookingCard(item, now)}
              onPress={() =>
                item.stage === "ringing" && !item.exit
                  ? navigation.navigate("ShopRing", { number: item.number })
                  : navigation.navigate("ShopBooking", { number: item.number })
              }
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          ListFooterComponent={list.isFetchingNextPage ? <Skeleton width="100%" height={191} /> : null}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await Promise.all([refetch(), refetchCounts()]);
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor={color.textBody}
              colors={[color.brand]}
            />
          }
          ListEmptyComponent={
            // 2091:21610: 120 under the top of the list; the empty state pads its own gutter, so it takes the list's back.
            <View style={{ paddingTop: 120, marginHorizontal: -SCREEN_GUTTER }}>
              <EmptyState
                icon={<CalendarDaysIcon size={32} color={color.brandText} strokeWidth={1.5} />}
                title={empty.title}
                body={empty.body}
              />
            </View>
          }
          contentContainerStyle={{
            gap: 12,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 8,
            paddingBottom: bottomPad + 32,
          }}
        />
      )}
    </View>
  );
}
