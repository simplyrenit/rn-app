import { useTheme } from "@/lib/theme";
import { useKeyboardInset } from "@/lib/use-keyboard-inset";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ContainerProps {
  children: React.ReactNode;
  height?: number;
}

export function NonScrollableContainer({
  children,
}: ContainerProps): JSX.Element {
  const { color, isDark } = useTheme();
  // Screens here pin a submit button to the bottom, which the iOS keyboard
  // covered. Unlike StaticContainer the safe-area inset is NOT subtracted,
  // because this SafeAreaView excludes the "bottom" edge and so reserves
  // nothing there. Returns 0 on Android, where adjustResize already handles it.
  const keyboardInset = useKeyboardInset();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: color.canvas }}
      edges={["top", "left", "right"]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View
        style={{
          // flex: 1 only. A height of "100%" resolves against the parent and so
          // ignores the padding below, leaving the submit button under the keyboard.
          flex: 1,
          paddingBottom: keyboardInset,
          backgroundColor: color.canvas,
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
