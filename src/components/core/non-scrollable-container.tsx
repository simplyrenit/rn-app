import { useGlobalContext } from "@/context/global-context";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ContainerProps {
  children: React.ReactNode;
  height?: number;
}

export function NonScrollableContainer({
  children,
  height,
}: ContainerProps): JSX.Element {
  const { theme } = useGlobalContext();
  // Screens here pin a submit button to the bottom, which the iOS keyboard
  // covered. Unlike StaticContainer the safe-area inset is NOT subtracted,
  // because this SafeAreaView excludes the "bottom" edge and so reserves
  // nothing there. Returns 0 on Android, where adjustResize already handles it.
  const keyboardInset = useKeyboardInset();
  const isDarkMode = theme === "dark";

  const styles = StyleSheet.create({
    container: {
      // flex: 1 only. A height of "100%" resolves against the parent and so
      // ignores the padding below, leaving the submit button under the keyboard.
      flex: 1,
    },
  });

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className={isDarkMode ? "bg-black" : "bg-white"}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View
        style={[styles.container, { paddingBottom: keyboardInset }]}
        className={isDarkMode ? "bg-black" : "bg-white"}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
