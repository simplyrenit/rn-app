import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, { forwardRef, Ref } from "react";

interface CustomBottomSheetProps {
  snapPoints: string[];
  isDark: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
}

/**
 * The non-modal sheet. It shares its chrome with CustomBottomSheetModal so the
 * two do not drift: the version this replaces hardcoded its grabber to #292929
 * (invisible on a black sheet) and declared no backdrop at all.
 */
const CustomBottomSheet = forwardRef(
  (
    { snapPoints, children }: CustomBottomSheetProps,
    ref: Ref<BottomSheet>
  ) => {
    const { color } = useTheme();

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.5}
            pressBehavior="close"
          />
        )}
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
        handleStyle={{
          paddingTop: 10,
          paddingBottom: 6,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}
      >
        <BottomSheetView style={{ padding: 16 }}>{children}</BottomSheetView>
      </BottomSheet>
    );
  }
);

export default CustomBottomSheet;
