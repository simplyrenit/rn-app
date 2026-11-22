import { SCREEN_GUTTER } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";
import CustomBottomSheetModal from "./custom-bottom-sheet-modal";
import { SheetHeader } from "./sheet-header";
import { Text } from "./text";

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  /**
   * `danger` draws the kit's Destructive button (red label on a neutral box,
   * never filled), for a delete or an archive.
   */
  tone?: "default" | "danger";
  onConfirm: () => void;
  /** The confirmed action is in flight: the button spins and blocks a second tap. */
  loading?: boolean;
}

// The 2.1 kit's `Sheet · Confirm destructive` (figma/00 2110:30387), less the
// home indicator: the 21pt grabber row, the 52pt title row, a body of up to
// four 20pt lines with 8 under it, and the 124pt action column (16 + 56 + 4 +
// 44 + 4). The height is fixed because gorhom 4 needs one; the sheet's own
// scroll view takes over if a large text size needs more.
const SHEET_HEIGHT = 21 + 52 + 4 * 20 + 8 + 124;

/**
 * "Are you sure?" as a Renit sheet rather than `Alert.alert`: the system alert
 * cannot carry the app's type or its danger colour, and reads as the OS asking
 * rather than the app. Present it through the ref; Cancel and the scrim dismiss it.
 */
export const ConfirmSheet = forwardRef<BottomSheetModal, Props>(
  ({ title, body, confirmLabel, tone = "default", onConfirm, loading = false }, ref) => {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const dismiss = () => {
      if (ref && "current" in ref) ref.current?.dismiss();
    };

    return (
      <CustomBottomSheetModal
        ref={ref}
        isDark={isDark}
        snapPoints={[SHEET_HEIGHT + insets.bottom]}
        frame
      >
        {/* gorhom draws the grabber above this. */}
        <SheetHeader title={title} grabber={false} />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8 }}>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            {body}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 16,
            paddingBottom: 4 + insets.bottom,
            alignItems: "center",
            gap: 4,
          }}
        >
          <Button
            variant={tone === "danger" ? "warning" : "primary"}
            loading={loading}
            onPress={onConfirm}
            style={{ alignSelf: "stretch" }}
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" tone="muted" disabled={loading} onPress={dismiss}>
            Cancel
          </Button>
        </View>
      </CustomBottomSheetModal>
    );
  }
);
