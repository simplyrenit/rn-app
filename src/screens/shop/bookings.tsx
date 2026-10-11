import { useShopBookings, useShopCounts } from "@/backend/shop-bookings";
import { Panel, Pill, Thumb } from "@/components/booking/parts";
import { EmptyState, Skeleton, Text } from "@/components/core";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { BookingCard, SHOP_TABS, ShopTab, bookingCard, defaultTab, emptyTab } from "@/lib/shop-booking";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, TouchableOpacity, View } from "react-native";
import { CalendarDaysIcon, ClockIcon, ExclamationTriangleIcon } from "react-native-heroicons/outline";

/** One booking: the item, who and how, its stage, the next thing to do, and what the shop earns. */
function BookingRow({ card, onPress }: { card: BookingCard; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={[card.title, card.pill.label, card.dates, card.who, card.note, `You earn ${card.earn}`]
        .filter(Boolean)
        .join(". ")}
      accessibilityHint="Opens the booking"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Panel>
        <View style={{ flexDirection: "row", gap: space.md, padding: space.md }}>
          <Thumb uri={card.image} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <Text fontSize="text-md" fontWeight="font-bold" numberOfLines={2} style={{ flex: 1 }}>
                {card.title}
              </Text>
              <Pill label={card.pill.label} tone={card.pill.tone} />
            </View>
            <Text fontSize="text-sm" tone="body">
              {card.dates}
            </Text>
            <Text fontSize="text-sm" tone="body">
              {card.who}
            </Text>
          </View>
        </View>
        {card.note ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.sm,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              backgroundColor: color.brandPanel,
            }}
          >
            <ClockIcon size={18} color={color.brandText} />
            <Text fontSize="text-sm" fontWeight="font-bold" tone="brand" style={{ flex: 1 }}>
              {card.note}
            </Text>
          </View>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: space.md,
            borderTopWidth: 1,
            borderTopColor: color.line,
          }}
        >
          <Text fontSize="text-sm" tone="body">
            You earn
          </Text>
          <Text fontSize="text-md" fontWeight="font-bold">
            {card.earn}
          </Text>
        </View>
      </Panel>
    </TouchableOpacity>
  );
}

/**
 * SH-06, the shop's bookings by stage, with the counts on the tabs. Every list is
 * the server's: a tab is asked for by itself, a page at a time, and read again each
 * time the screen comes into view. A booking that is still ringing opens the ring.
 */
export function ShopBookingsView({ bottomPad }: { bottomPad: number }) {
  const navigation = useTypedNavigation();
  const { color } = useTheme();
  const counts = useShopCounts();
  // Until the shop picks a tab it opens on the first stage with something in it.
  const [picked, setPicked] = useState<ShopTab | null>(null);
  const tab: ShopTab = picked ?? (counts.data || counts.isError ? defaultTab(counts.data) : "confirmed");
  const countsReady = Boolean(counts.data) || counts.isError;
  const list = useShopBookings(tab, countsReady || picked !== null);
  const { refetch } = list;
  const { refetch: refetchCounts } = counts;
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchCounts();
    }, [refetch, refetchCounts])
  );

  const rows = useMemo(() => (list.data?.pages ?? []).flatMap((page) => page.results), [list.data]);
  const empty = emptyTab(tab);
  const loading = (list.isLoading || list.isIdle) && !list.data;
  const failed = !list.data && list.isError;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: 52 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: space.sm, alignItems: "center" }}
        >
          {SHOP_TABS.map(({ key, label }) => {
            const selected = key === tab;
            const count = counts.data?.[key];
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
                activeOpacity={0.8}
                onPress={() => {
                  if (!selected) selectionFeedback();
                  setPicked(key);
                }}
                style={{
                  minHeight: MIN_TOUCH_TARGET,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  paddingHorizontal: space.md,
                  borderRadius: radius.full,
                  borderWidth: 1,
                  borderColor: selected ? color.brand : color.line,
                  backgroundColor: selected ? color.brand : color.surface,
                }}
              >
                <Text fontSize="text-md" fontWeight="font-bold" style={{ color: selected ? color.onBrand : color.text }}>
                  {label}
                </Text>
                {count !== undefined ? (
                  <View
                    style={{
                      minWidth: 22,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: radius.full,
                      alignItems: "center",
                      backgroundColor: selected ? "rgba(255,255,255,0.22)" : color.surfaceRaised,
                    }}
                  >
                    <Text fontSize="text-xs" fontWeight="font-bold" style={{ color: selected ? color.onBrand : color.textBody }}>
                      {count}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
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
          style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.md, gap: space.md }}
        >
          <Skeleton width="100%" height={150} />
          <Skeleton width="100%" height={150} />
        </View>
      ) : failed ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            variant="error"
            icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
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
              card={bookingCard(item)}
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
          ListFooterComponent={list.isFetchingNextPage ? <Skeleton width="100%" height={120} /> : null}
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
            <EmptyState icon={<CalendarDaysIcon size={26} color={color.brandText} />} title={empty.title} body={empty.body} />
          }
          contentContainerStyle={{
            gap: space.md,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: space.sm,
            paddingBottom: bottomPad + space.lg,
            flexGrow: rows.length ? 0 : 1,
            justifyContent: rows.length ? "flex-start" : "center",
          }}
        />
      )}
    </View>
  );
}
