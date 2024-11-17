import { useGlobalContext } from "@/context/global-context";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

interface Props {
  children: React.ReactNode;
}

export function ScrollContainer({ children }: Props) {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      className={isDarkMode ? "bg-black" : "bg-white"}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: wp("5%"),
  },
});
