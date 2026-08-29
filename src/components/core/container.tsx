import { useTheme } from "@/lib/theme";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  children: React.ReactNode;
  /** Supply both to give the screen pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Container({ children, onRefresh, refreshing = false }: Props) {
  const { color, isDark } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.canvas }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        // Without this, the first tap while a keyboard is open is swallowed to
        // dismiss it and never reaches the button underneath, so every submit
        // needs two taps.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, width: "100%" }}
        style={{ backgroundColor: color.canvas }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={color.textBody}
              colors={[color.brand]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
