import { useNotifications } from "@/backend/useNotification";
import { PinnedHeader, StaticContainer } from "@/components/core";
import { Categories } from "@/components/home/categories";
import { Disclaimer } from "@/components/home/disclaimer";
import { SearchBar } from "@/components/home/search-bar";
import { Experiences } from "@/components/home/sections/experiences";
import { Popular } from "@/components/home/sections/popular";
import { RailDedupeProvider } from "@/components/home/sections/rail-dedupe";
import { RecentlyAdded } from "@/components/home/sections/top-picks";
import { useAuthContext } from "@/context/auth-context";
import { useGlobalContext } from "@/context/global-context";
import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

export default function Home() {
  const { isAuthenticated } = useGlobalContext();
  const { getUser } = useAuthContext();
  const { getNotifications } = useNotifications();
  const { color } = useTheme();

  // Remounting the sections is the simplest correct refresh: each rail owns its
  // own fetch, and this is the gesture an iOS customer reaches for first.
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
    if (isAuthenticated) void getNotifications();
    // The rails resolve independently; release the control once they have all
    // had a chance to start rather than tying it to the slowest one.
    setTimeout(() => setRefreshing(false), 600);
  }, [isAuthenticated]);

  useEffect(() => {
    void getUser();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void getNotifications();
  }, [isAuthenticated]);

  const tabBarHeight = useBottomTabBarHeight();

  return (
    <StaticContainer width={100}>
      {/* The search field is a pinned header, not a sibling floating above the
          list. Without the header's material the scroll view's top edge cut
          card titles and price lines through the middle of the letterforms and
          read as a rendering fault rather than as content passing behind. */}
      <PinnedHeader gutter={false}>
        <SearchBar />
      </PinnedHeader>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        // Without this the last section renders behind the tab bar. The height
        // is measured rather than hardcoded because the bar is a different
        // height on iOS and Android and includes the safe-area inset.
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.textBody}
            colors={[color.brand]}
          />
        }
      >
        <Categories />
        <View key={refreshKey}>
          <RailDedupeProvider key={refreshKey}>
            <Experiences />
            <Popular />
            <RecentlyAdded />
          </RailDedupeProvider>
        </View>
        <View style={{ paddingHorizontal: SCREEN_GUTTER }}>
          <Disclaimer />
        </View>
      </ScrollView>
    </StaticContainer>
  );
}
