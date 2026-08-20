import { useGlobalContext } from "@/context/global-context";
import React from "react";
import { ScrollView, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";

interface Props {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function ScrollContainer({ children, containerStyle }: Props) {
  const { theme } = useGlobalContext();
  const isDarkMode = theme === "dark";

  return (
    <ScrollView
      nestedScrollEnabled
      // Without this, the first tap while a keyboard is open is swallowed to
      // dismiss it and never reaches the button underneath, so every submit
      // needs two taps.
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.container, containerStyle]}
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
