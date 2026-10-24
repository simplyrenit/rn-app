import { useBookings } from "@/backend/bookings";
import { Pill, SummaryCard } from "@/components/booking/parts";
import { EmptyState, NonScrollableContainer, Skeleton, Text } from "@/components/core";
import ProfilePreAuth from "@/components/profile/pre-auth/profile-pre-auth";
import { useGlobalContext } from "@/context/global-context";
import {
  BookingCustomer,
  bookingLabel,
  RENTALS_LISTS,
  RentalsList,
  rentalNextLine,
  rentalSubLine,
  rentalsEmpty,
  stagePill,
} from "@/lib/booking";
import { basketNextLine, moreBadge } from "@/lib/booking-lines";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import ShopHome from "@/screens/shop/home";
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
  // A partial accept names how many of the items the rent is for (cart plan §3.7).
  const next = basketNextLine(booking) ?? rentalNextLine(booking);
  const sub = rentalSubLine(booking);
  const number = bookingLabel(booking.number);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={[booking.product.title, pill.label, sub, number, next].filter(Boolean).join(". ")}
      accessibilityHint="Opens the booking"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <SummaryCard
        title={booking.product.title}
        image={booking.product.cover_image}
        more={moreBadge(booking)}
        lines={[sub, number]}
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
 * Two lists, as the server keeps them: Active (every booking still open,
 * soonest first) and Past. Each is asked for by itself, a page at a time; the
 * phone never fetches everything and sorts it into lists. The one on screen is
 * read again every time the tab comes into view, so a booking that moved on
 * while the customer was elsewhere is never shown at its old stage.
 */
/**
 * The screen's frame: a safe-area container of its own, or, inside the shop's own
 * container (a merchant's third segment), none. Two safe-area views on top of each
 * other each pad for the status bar, which left a blank band under the segments
 * (review round 1, finding 8).
 */
function Frame({ embedded, children }: { embedded?: boolean; children: React.ReactNode }) {
  return embedded ? <View style={{ flex: 1 }}>{children}</View> : <NonScrollableContainer>{children}</NonScrollableContainer>;
}

function MyRentals({ embedded = false }: { embedded?: boolean }) {
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useTypedNavigation();
  const { color, isDark } = useTheme();
  const { authTokens, isAuthenticated, userDetailsFailed, fetchUserDetails } = useGlobalContext();
  const [list, setList] = useState<RentalsList>("open");
  const open = useBookings(true, list === "open");
  const past = useBookings(false, list === "past");
  const query = list === "open" ? open : past;
  const { refetch } = query;
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Disabled (signed out, or the profile is not in yet) there is nothing to read.
      if (isAuthenticated) void refetch();
    }, [isAuthenticated, refetch])
  );

  const shown = useMemo(() => (query.data?.pages ?? []).flatMap((page) => page.results), [query.data]);
  // The same on every answer, whichever list it was for.
  const counts = (open.data ?? past.data)?.pages[0]?.counts;

  const heading = (
    <Text accessibilityRole="header" role="screenTitle" style={{ paddingVertical: TOPBAR_PADDING }}>
      Rentals
    </Text>
  );

  if (!authTokens || !isAuthenticated) {
    return (
      <Frame embedded={embedded}>
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: SCREEN_GUTTER }}>{heading}</View>
          <ProfilePreAuth isDarkMode={isDark} />
        </View>
      </Frame>
    );
  }

  // The list cannot start without the profile's username; if the profile failed
  // nothing retries it, which is an error and not a long wait.
  const profileFailed = query.isIdle && userDetailsFailed;
  const loading = (query.isLoading || query.isIdle) && !profileFailed;
  const failed = !query.data && (query.isError || profileFailed);
  const retry = () => void (profileFailed ? fetchUserDetails() : refetch());
  const empty = rentalsEmpty(list);

  return (
    <Frame embedded={embedded}>
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
          {RENTALS_LISTS.map(({ key, label }) => {
            const selected = key === list;
            const count = counts?.[key];
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={count === undefined ? label : `${label}, ${count}`}
                activeOpacity={0.8}
                onPress={() => {
                  if (!selected) selectionFeedback();
                  setList(key);
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
            // The next page, when the end of this one comes into view.
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
            }}
            ListFooterComponent={
              query.isFetchingNextPage ? <Skeleton width="100%" height={88} /> : null
            }
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
                actionLabel={list === "open" ? "Browse listings" : undefined}
                onAction={list === "open" ? () => navigation.navigate("MainTabs", { screen: "Home" }) : undefined}
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
    </Frame>
  );
}

/**
 * The Rentals tab. A merchant's phone opens it on the shop (Today and Bookings,
 * ENG-210) with their own rentals one tap away; everyone else sees their rentals
 * as before. An owner who is not a merchant reaches the shop from Profile.
 */
export default function Rentals() {
  const { userDetails } = useGlobalContext();
  return userDetails?.account_type === "merchant" ? <ShopHome mine={<MyRentals embedded />} /> : <MyRentals />;
}
