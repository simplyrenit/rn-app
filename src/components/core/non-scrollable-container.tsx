import { useGlobalContext } from "@/context/global-context";
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
  const isDarkMode = theme === "dark";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      height: "100%",
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
        style={styles.container}
        className={isDarkMode ? "bg-black" : "bg-white"}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
