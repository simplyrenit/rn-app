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
import { BackHandler, Keyboard, Platform, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "react-native-gesture-handler";

interface CustomBottomSheetModalProps {
  snapPoints?: string[] | number[];
  isDark: boolean;
  children: React.ReactNode;
  scrollView?: boolean;
  /**
   * Dark mode only: the 60% scrim (every other dark sheet keeps 50%). In light
   * mode every sheet draws the 2.1 frames' 40% (#00000066), with or without it.
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
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<BottomSheetModal>(null);
    const { theme } = useGlobalContext();
    const { color, isDark: darkTheme } = themeFor(theme);
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => modalRef.current as BottomSheetModal);

    useEffect(() => {
      // iOS announces the keyboard before it moves, so the sheet makes room alongside it rather than after it has
      // covered the footer; Android only has the did-events.
      const ios = Platform.OS === "ios";
      const keyboardDidShowListener = Keyboard.addListener(
        ios ? "keyboardWillShow" : "keyboardDidShow",
        (event) => {
          setKeyboardHeight(event.endCoordinates.height);
        }
      );
      const keyboardDidHideListener = Keyboard.addListener(
        ios ? "keyboardWillHide" : "keyboardDidHide",
        () => {
          setKeyboardHeight(0);
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
    // With the keyboard up, a percentage sheet goes to 90% (its fields sit high enough to clear the keyboard).
    // A numeric sheet is sized to its content, so it keeps its height and makes room for the keyboard instead; it
    // used to be scaled by 0.9, which made it shorter just when it needed more room (ENG-438: the name, email and
    // phone sheets went behind the keyboard on iOS and lost half their Save button on Android).
    // - iOS: gorhom 4 lifts a sheet over the keyboard only for its own BottomSheetTextInput (useKeyboard's
    //   shouldHandleKeyboardEvents); our fields are plain TextInputs, so the sheet stays on the screen's bottom
    //   edge. It grows by the keyboard less the home-indicator inset (the footer already pads that, and the
    //   keyboard covers it), and the content is padded by the same amount, so the footer ends on the keyboard.
    // - Android: adjustResize already puts the sheet's bottom on the keyboard; only the room above it shrinks.
    // - scrollView={false} sheets keep the old x0.9 path: their content may hold a gorhom BottomSheetTextInput
    //   (the search-results filter sheet's taxonomy search), which gorhom already lifts over the keyboard, and
    //   adding our lift on top pushed that sheet under the status bar with its footer behind the keyboard.
    const keyboardLift =
      keyboardHeight > 0 && scrollView && Platform.OS === "ios" ? Math.max(0, keyboardHeight - insets.bottom) : 0;
    const roomWithKeyboard =
      Platform.OS === "ios" ? maxSheetHeight : maxSheetHeight - keyboardHeight;
    const numericSnaps = fittedSnapPoints.some((point) => typeof point === "number");
    const adjustedSnapPoints =
      keyboardHeight > 0
        ? fittedSnapPoints.map((point) =>
            typeof point === "string"
              ? "90%"
              : scrollView
                ? Math.min(point + keyboardLift, roomWithKeyboard)
                : point * 0.9
          )
        : fittedSnapPoints;
    const contentLift = numericSnaps ? keyboardLift : 0;

    const renderBackdrop = (props: any) => (
      <BottomSheetBackdrop
        {...props}
        // The sheet opens at index 0, but BottomSheetBackdrop's default
        // appearsOnIndex is 1 — so the scrim never faded in and the content
        // behind the sheet stayed fully legible. The sheet did not read as
        // modal at all.
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={sheetScrimOpacity(darkTheme, frame)}
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
            contentContainerStyle={[styles.contentContainer, { paddingBottom: contentLift }]}
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

/**
 * The scrim behind a sheet. Light: 40% black on every sheet, as every 2.1 flow frame draws it (#00000066, ENG-427
 * D1; it was 50%, or 60% with `frame`). Dark is unchanged: 60% with `frame`, else 50%.
 */
export function sheetScrimOpacity(dark: boolean, frame: boolean) {
  if (!dark) return 0.4;
  return frame ? 0.6 : 0.5;
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
});

export default CustomBottomSheetModal;
