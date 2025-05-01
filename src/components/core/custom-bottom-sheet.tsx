import React, { forwardRef, Ref } from "react";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

interface CustomBottomSheetProps {
  snapPoints: string[];
  isDark: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

const CustomBottomSheet = forwardRef(
  (
    {
      snapPoints,
      isDark,
      onCancel,
      onSubmit,
      children,
    }: CustomBottomSheetProps,
    ref: Ref<BottomSheet>
  ) => {
    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: isDark ? "black" : "white" }}
        handleIndicatorStyle={{ backgroundColor: "#292929" }}
        handleStyle={{
          borderWidth: 2,
          borderTopColor: "#292929",
          borderLeftColor: "#292929",
          borderRightColor: "#292929",
          borderTopRightRadius: 12,
          borderTopLeftRadius: 12,
        }}
      >
        <BottomSheetView style={{ padding: 16 }}>{children}</BottomSheetView>
      </BottomSheet>
    );
  }
);

export default CustomBottomSheet;
