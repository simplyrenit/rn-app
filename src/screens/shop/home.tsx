import { SubpageHeader } from "@/components/core";
import { NonScrollableContainer } from "@/components/core/non-scrollable-container";
import { Segments } from "@/components/shop/segments";
import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import React, { useContext, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShopBookingsView } from "./bookings";
import { ShopTodayView } from "./today";

type Mode = "today" | "bookings" | "mine";

const SHOP_MODES = [
  { key: "today", label: "Today" },
  { key: "bookings", label: "Bookings" },
] as const;

const WITH_MINE = [...SHOP_MODES, { key: "mine", label: "My rentals" }] as const;

/**
 * The shop's side of the phone: Today (SH-04) and Bookings (SH-06), side by side.
 * For a merchant it is the Rentals tab, with the customer's own rentals one tap
 * away (`mine`), since the same account can rent too. Any other owner reaches it
 * from Profile, as a screen of its own with a back arrow. The tab bar's height
 * is read from where it is drawn: a tab has one, a stack screen does not.
 */
export default function ShopHome({ mine }: { mine?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const tabBar = useContext(BottomTabBarHeightContext);
  const [mode, setMode] = useState<Mode>("today");
  const bottomPad = tabBar ?? insets.bottom;

  return (
    <NonScrollableContainer>
      {mine ? null : <SubpageHeader title="Your shop" />}
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm }}>
        <Segments options={mine ? WITH_MINE : SHOP_MODES} value={mode} onChange={setMode} />
      </View>
      <View style={{ flex: 1 }}>
        {mode === "today" ? (
          <ShopTodayView bottomPad={bottomPad} />
        ) : mode === "bookings" ? (
          <ShopBookingsView bottomPad={bottomPad} />
        ) : (
          mine
        )}
      </View>
    </NonScrollableContainer>
  );
}

/** The stack screen: Today and Bookings for an owner who is not a merchant. */
export function ShopTodayScreen() {
  return <ShopHome />;
}
