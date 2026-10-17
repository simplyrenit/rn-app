import { SCREEN_GUTTER, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "./button";
import CustomBottomSheetModal from "./custom-bottom-sheet-modal";
import { Text } from "./text";

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  /** `danger` draws the confirm button in the danger fill, for a delete. */
  tone?: "default" | "danger";
  onConfirm: () => void;
  /** The confirmed action is in flight: the button spins and blocks a second tap. */
  loading?: boolean;
}

// Grabber row, title, a body of up to four lines, two buttons and their gaps.
// The sheet's own scroll view takes over if a large text size needs more.
const SHEET_HEIGHT = 300;

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
        <View
          style={{
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: space.sm,
            paddingBottom: insets.bottom + space.sm,
            gap: space.md,
          }}
        >
          <View style={{ gap: space.sm }}>
            <Text role="sectionTitle" accessibilityRole="header">
              {title}
            </Text>
            <Text fontSize="text-md" tone="body">
              {body}
            </Text>
          </View>
          <View style={{ gap: space.sm }}>
            <Button
              variant={tone === "danger" ? "warning" : "primary"}
              loading={loading}
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
            <Button variant="ghost" disabled={loading} onPress={dismiss}>
              Cancel
            </Button>
          </View>
        </View>
      </CustomBottomSheetModal>
    );
  }
);
