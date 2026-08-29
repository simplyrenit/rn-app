import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface ContainerProps {
  children: React.ReactNode;
  /**
   * Kept for the call sites that pass 100 to opt out of the gutter (screens
   * that manage their own edge-to-edge content). Anything else uses the app's
   * single 20pt gutter — five different left margins is what made the home
   * screen's headings and its cards disagree by 3pt.
   */
  width?: number;
}

export function StaticContainer({
  children,
  width,
}: ContainerProps): JSX.Element {
  const { color, isDark } = useTheme();
  const keyboardInset = useKeyboardInset();
  const safeAreaInsets = useSafeAreaInsets();

  // Screens built on this container pin an action bar to the bottom, which the
  // iOS keyboard would otherwise cover completely. The safe-area inset is
  // subtracted because SafeAreaView has already reserved that space, and the
  // keyboard height is measured from the physical bottom of the screen.
  // useKeyboardInset returns 0 on Android, where adjustResize already handles
  // this, so the padding stays 0 there.
  const keyboardPadding = Math.max(0, keyboardInset - safeAreaInsets.bottom);
  const gutter = width === 100 ? 0 : SCREEN_GUTTER;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          // flex, not flexGrow: a ScrollView nested in here needs a bounded
          // height or it sizes to its content and never scrolls.
          flex: 1,
          width: "100%",
          paddingHorizontal: gutter,
          paddingBottom: keyboardPadding,
          backgroundColor: color.canvas,
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
