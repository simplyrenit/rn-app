import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { BackHandler, Keyboard, StyleSheet } from "react-native";
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
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => modalRef.current as BottomSheetModal);

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

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isOpen) {
        return false;
      }

      modalRef.current?.dismiss();
      return true;
    });

    return () => subscription.remove();
  }, [isOpen]);

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
      ref={modalRef}
      snapPoints={adjustedSnapPoints}
      backdropComponent={renderBackdrop}
      onChange={(index) => setIsOpen(index >= 0)}
      enableOverDrag={false}
      handleStyle={{
        borderTopWidth: 1,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderTopColor: isDark ? "#292929" : "#E6E6E6",
        borderLeftColor: isDark ? "#292929" : "#E6E6E6",
        borderRightColor: isDark ? "#292929" : "#E6E6E6",
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
