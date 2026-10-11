import { useBookings } from "@/backend/bookings";
import { Pill, SummaryCard } from "@/components/booking/parts";
import { EmptyState, NonScrollableContainer, Skeleton, Text } from "@/components/core";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import {
  BookingCustomer,
  RENTALS_TABS,
  RentalsTab,
  rentalNextLine,
  rentalSubLine,
  rentalsEmpty,
  rentalsTab,
  stagePill,
} from "@/lib/booking";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, TouchableOpacity, View } from "react-native";
import { CalendarIcon, ClockIcon, ExclamationTriangleIcon } from "react-native-heroicons/outline";

// The frame's topbar, as on Saved: an H2 with 16 above and below it.
const TOPBAR_PADDING = 16;

/** One booking: the product, the shop and dates, its stage, and the next thing to do. */
function RentalCard({ booking, onPress }: { booking: BookingCustomer; onPress: () => void }) {
  const { color } = useTheme();
  const pill = stagePill(booking);
  const next = rentalNextLine(booking);
  const sub = rentalSubLine(booking);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={[booking.product.title, pill.label, sub, next].filter(Boolean).join(". ")}
      accessibilityHint="Opens the booking"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <SummaryCard
        title={booking.product.title}
        image={booking.product.cover_image}
        lines={[sub]}
        right={<Pill label={pill.label} tone={pill.tone} />}
        footer={
          next ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <ClockIcon size={18} color={color.brandText} />
              <Text fontSize="text-sm" style={{ flex: 1 }}>
                {next}
              </Text>
            </View>
          ) : undefined
        }
      />
    </TouchableOpacity>
  );
}

/**
 * BK-12, the Rentals tab: the customer's bookings and where each one stands.
 * It has the place the Chat tab had (decision T-01). Tapping a booking opens
 * the `Booking` screen, which draws whatever stage the server says it is in.
 *
 * The list is read again every time the tab comes into view, so a booking that
 * moved on while the customer was elsewhere is never shown at its old stage.
 */
export default function Rentals() {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useTypedNavigation();
  const { color, isDark } = useTheme();
  const { authTokens, isAuthenticated, userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const query = useBookings();
  const { refetch } = query;
  const [tab, setTab] = useState<RentalsTab>("upcoming");
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Disabled (signed out, or the profile is not in yet) there is nothing to read.
      if (isAuthenticated) void refetch();
    }, [isAuthenticated, refetch])
  );

  const lists = useMemo(() => {
    const out: Record<RentalsTab, BookingCustomer[]> = { upcoming: [], active: [], past: [] };
    for (const booking of query.data ?? []) out[rentalsTab(booking)].push(booking);
    return out;
  }, [query.data]);

  const heading = (
    <Text accessibilityRole="header" role="screenTitle" style={{ paddingVertical: TOPBAR_PADDING }}>
      Rentals
    </Text>
  );

  if (!authTokens || !isAuthenticated) {
    return (
      <NonScrollableContainer>
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>{heading}</View>
          <ProfilePreAuth isDarkMode={isDark} />
        </View>
      </NonScrollableContainer>
    );
  }

  // The list cannot start without the profile's username; if the profile failed
  // nothing retries it, which is an error and not a long wait.
  const profileFailed = query.isIdle && userDetailsFailed;
  const loading = (query.isLoading || query.isIdle) && !profileFailed;
  const failed = !query.data && (query.isError || profileFailed);
  const retry = () => void (profileFailed ? fetchUserDetails() : refetch());
  const shown = lists[tab];
  const empty = rentalsEmpty(tab);

  return (
    <NonScrollableContainer>
      <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}>
        {heading}

        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            padding: 3,
            borderRadius: radius.button,
            backgroundColor: color.surfaceRaised,
            marginBottom: space.md,
          }}
        >
          {RENTALS_TABS.map(({ key, label }) => {
            const selected = key === tab;
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`${label}, ${lists[key].length}`}
                activeOpacity={0.8}
                onPress={() => {
                  if (!selected) selectionFeedback();
                  setTab(key);
                }}
                style={{
                  flex: 1,
                  minHeight: MIN_TOUCH_TARGET - 6,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.button - 3,
                  backgroundColor: selected ? color.canvas : "transparent",
                  borderWidth: selected ? 1 : 0,
                  borderColor: color.line,
                }}
              >
                <Text
                  fontSize="text-md"
                  fontWeight={selected ? "font-bold" : "font-normal"}
                  tone={selected ? "default" : "body"}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your rentals"
            accessibilityState={{ busy: true }}
            style={{ gap: space.md }}
          >
            <Skeleton width="100%" height={124} />
            <Skeleton width="100%" height={124} />
            <Skeleton width="100%" height={88} />
          </View>
        ) : failed ? (
          <View style={{ flex: 1, justifyContent: "center", paddingBottom: tabBarHeight }}>
            <EmptyState
              variant="error"
              icon={<ExclamationTriangleIcon size={28} color={color.danger} />}
              title="We couldn't load your rentals"
              body="Check your connection and try again."
              actionLabel="Try again"
              onAction={retry}
            />
          </View>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(booking) => booking.number}
            renderItem={({ item }) => (
              <RentalCard booking={item} onPress={() => navigation.navigate("Booking", { number: item.number })} />
            )}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  try {
                    await refetch();
                  } finally {
                    setRefreshing(false);
                  }
                }}
                tintColor={color.textBody}
                colors={[color.brand]}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon={<CalendarIcon size={26} color={color.brandText} />}
                title={empty.title}
                body={empty.body}
                actionLabel={tab === "upcoming" ? "Browse listings" : undefined}
                onAction={tab === "upcoming" ? () => navigation.navigate("MainTabs", { screen: "Home" }) : undefined}
              />
            }
            contentContainerStyle={{
              gap: space.md,
              paddingBottom: tabBarHeight,
              flexGrow: shown.length ? 0 : 1,
              justifyContent: shown.length ? "flex-start" : "center",
            }}
          />
        )}
      </View>
    </NonScrollableContainer>
  );
}
