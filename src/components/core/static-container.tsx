import { useGlobalContext } from "@/context/global-context";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface ContainerProps {
  children: React.ReactNode;
  width?: number;
}

export function StaticContainer({
  children,
  width,
}: ContainerProps): JSX.Element {
  const { theme } = useGlobalContext();
  const keyboardInset = useKeyboardInset();
  const safeAreaInsets = useSafeAreaInsets();

  const isDarkMode = theme === "dark";

  // Screens built on this container pin an action bar to the bottom, which the
  // iOS keyboard would otherwise cover completely. The safe-area inset is
  // subtracted because SafeAreaView has already reserved that space, and the
  // keyboard height is measured from the physical bottom of the screen.
  // useKeyboardInset returns 0 on Android, where adjustResize already handles
  // this, so the padding stays 0 there.
  const keyboardPadding = Math.max(0, keyboardInset - safeAreaInsets.bottom);

  const styles = StyleSheet.create({
    container: {
      flexGrow: 1,
      width: width ? wp(`${width}%`) : wp("90%"),
      marginHorizontal: "auto",
    },
  });

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className={isDarkMode ? "bg-black" : "bg-white"}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View
        style={[styles.container, { paddingBottom: keyboardPadding }]}
        className={isDarkMode ? "bg-black" : "bg-white"}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
