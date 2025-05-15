import { useGlobalContext } from "@/context/global-context";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

interface ContainerProps {
  children: React.ReactNode;
  width?: number;
}

export function StaticContainer({
  children,
  width,
}: ContainerProps): JSX.Element {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";

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
        style={styles.container}
        className={isDarkMode ? "bg-black" : "bg-white"}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
