import { radius } from "@/lib/design-tokens";
import { themeFor } from "@/lib/theme";
import { useGlobalContext } from "@/context/global-context";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
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
>(
  (
    { snapPoints = ["30%", "50%", "70%"], children, isDark, scrollView = true },
    ref
  ) => {
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<BottomSheetModal>(null);
    const { theme } = useGlobalContext();
    const { color } = themeFor(theme);

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
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (!isOpen) {
            return false;
          }

          modalRef.current?.dismiss();
          return true;
        }
      );

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
        // The sheet opens at index 0, but BottomSheetBackdrop's default
        // appearsOnIndex is 1 — so the scrim never faded in and the content
        // behind the sheet stayed fully legible. The sheet did not read as
        // modal at all.
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    );

    return (
      <BottomSheetModal
        // The radius has to sit on the background, not only on the handle:
        // gorhom clips the sheet to backgroundStyle, so a rounded handle over a
        // square background still rendered square top corners.
        backgroundStyle={{
          backgroundColor: color.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
        handleIndicatorStyle={{
          backgroundColor: color.inputLine,
          width: 40,
          height: 4,
          borderRadius: radius.full,
        }}
        ref={modalRef}
        snapPoints={adjustedSnapPoints}
        backdropComponent={renderBackdrop}
        onChange={(index) => setIsOpen(index >= 0)}
        enablePanDownToClose
        enableOverDrag={false}
        handleStyle={{
          paddingTop: 10,
          paddingBottom: 6,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        {scrollView ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
});

export default CustomBottomSheetModal;
