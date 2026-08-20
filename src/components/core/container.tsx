import { useGlobalContext } from "@/context/global-context";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  children: React.ReactNode;
}

export function Container({ children }: Props) {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      className={isDarkMode ? "bg-[#000]" : "bg-white"}
    >
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <ScrollView
        // Without this, the first tap while a keyboard is open is swallowed to
        // dismiss it and never reaches the button underneath, so every submit
        // needs two taps.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.container}
        className={isDarkMode ? "bg-[#000]" : "bg-white"}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: wp("100%"),
    marginHorizontal: "auto",
  },
});
