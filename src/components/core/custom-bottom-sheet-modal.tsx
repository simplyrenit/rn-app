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
import { BackHandler, Keyboard, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "react-native-gesture-handler";

interface CustomBottomSheetModalProps {
  snapPoints?: string[] | number[];
  isDark: boolean;
  children: React.ReactNode;
  scrollView?: boolean;
  /**
   * Opt-in: the 60% scrim the Figma sheets draw. Every other sheet keeps 50%.
   * (It used to opt into the Figma grabber too; every sheet has the 2.1 kit
   * grabber now.)
   */
  frame?: boolean;
  /** Opt-in: runs when the sheet has closed, however it was closed. */
  onDismiss?: () => void;
}

const CustomBottomSheetModal = forwardRef<
  BottomSheetModal,
  CustomBottomSheetModalProps
>(
  (
    {
      snapPoints = ["30%", "50%", "70%"],
      children,
      isDark,
      scrollView = true,
      frame = false,
      onDismiss,
    },
    ref
  ) => {
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<BottomSheetModal>(null);
    const { theme } = useGlobalContext();
    const { color } = themeFor(theme);
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

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

    // A fixed-height sheet sized on a 390x844 phone (600-640pt) is taller than
    // a 360x640 Android or an SE once the status bar is taken off, and gorhom
    // then pins it at y=0 with the grabber and title under the status bar.
    // Cap every numeric point to the space below the top inset; the sheet's own
    // scroll view takes the overflow.
    const maxSheetHeight = windowHeight - insets.top;
    const fittedSnapPoints = snapPoints.map((point) =>
      typeof point === "number" ? Math.min(point, maxSheetHeight) : point
    );
    const adjustedSnapPoints = isKeyboardVisible
      ? fittedSnapPoints.map((point) =>
          typeof point === "string" ? "90%" : point * 0.9
        )
      : fittedSnapPoints;

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop
        {...props}
        // The sheet opens at index 0, but BottomSheetBackdrop's default
        // appearsOnIndex is 1 — so the scrim never faded in and the content
        // behind the sheet stayed fully legible. The sheet did not read as
        // modal at all.
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={frame ? 0.6 : 0.5}
        pressBehavior="close"
      />
    );

    return (
      <BottomSheetModal
        // The window already shrinks for the keyboard (adjustResize); gorhom's
        // default adjustPan lifted the sheet by the keyboard height again.
        android_keyboardInputMode="adjustResize"
        // The radius has to sit on the background, not only on the handle:
        // gorhom clips the sheet to backgroundStyle, so a rounded handle over a
        // square background still rendered square top corners.
        backgroundStyle={{
          backgroundColor: color.surface,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
        }}
        // The 2.1 kit's grabber (Sheet header, figma/00 2071:14471) on every
        // sheet: 44x5 in the hairline tone on a 21pt row, 8 above and below.
        // `SheetHeader` is drawn with `grabber={false}` under it.
        handleIndicatorStyle={{
          backgroundColor: color.line,
          width: 44,
          height: 5,
          borderRadius: radius.full,
        }}
        ref={modalRef}
        snapPoints={adjustedSnapPoints}
        backdropComponent={renderBackdrop}
        onChange={(index) => setIsOpen(index >= 0)}
        onDismiss={onDismiss}
        enablePanDownToClose
        enableOverDrag={false}
        handleStyle={{
          paddingTop: 8,
          paddingBottom: 8,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
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
