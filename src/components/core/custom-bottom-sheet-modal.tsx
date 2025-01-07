import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useState } from "react";
import { Keyboard, StyleSheet } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

interface CustomBottomSheetModalProps {
  snapPoints?: string[] | number[];
  isDark: boolean;
  children: React.ReactNode;
  scrollView?: boolean;
}

const CustomBottomSheetModal = forwardRef<
  BottomSheetModal,
  CustomBottomSheetModalProps
>(({ snapPoints = ["30%", "50%", "70%"], children, isDark, scrollView = true }, ref) => {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const adjustedSnapPoints = isKeyboardVisible
    ? snapPoints.map((point) =>
      typeof point === "string" ? "90%" : point * 0.9
    )
    : snapPoints;

  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      opacity={0.8}
    />
  );

  return (
    <BottomSheetModal
      backgroundStyle={{ backgroundColor: isDark ? "black" : "white" }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "#fff" : "#000",
        width: 50,
        borderRadius: 50,
        padding: 2,
      }}
      ref={ref}
      snapPoints={adjustedSnapPoints}
      backdropComponent={renderBackdrop}
      enableOverDrag={false}
      handleStyle={{
        borderTopWidth: 2,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderTopColor: isDark ? "#292929" : "#fff",
        borderLeftColor: isDark ? "#292929" : "#fff",
        borderRightColor: isDark ? "#292929" : "#fff",
        borderTopRightRadius: 12,
        borderTopLeftRadius: 12,
      }}
    >
      {scrollView ? <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        // enableOnAndroid={true}
        // extraHeight={Platform.OS === "android" ? 100 : 0}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {children}
      </ScrollView> : children}
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
});

export default CustomBottomSheetModal;
