import { SheetFooter, SheetHeader, Text, usePressFeedback } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { PhotoSource } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { CameraIcon, PhotoIcon } from "react-native-heroicons/outline";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Snap heights from the frames, less their 21pt home strip: the safe-area inset is added where they are used.
// Add a photo (2094:25168): 73 header + 8 + 2 × 60 rows 8 apart + 24 = 233.
const ADD_PHOTO_HEIGHT = 233;
// Finish your last listing? (2094:25236): 73 header + 8 spacer + 113 footer (hairline, 16, 52, 8, 20, 16) = 194.
const RESUME_HEIGHT = 194;

function SheetRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { color } = useTheme();
  const feedback = usePressFeedback();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          minHeight: 60,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingHorizontal: 16,
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: color.line,
        },
        feedback.pressStyle,
      ]}
    >
      {icon}
      <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** §8.2: Take photo (camera) / Choose from gallery. */
export const AddPhotoSheet = forwardRef<BottomSheetModal, { onPick: (source: PhotoSource) => void }>(
  ({ onPick }, ref) => {
    const { color, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    return (
      <CustomBottomSheetModal
        ref={ref}
        isDark={isDark}
        snapPoints={[ADD_PHOTO_HEIGHT + insets.bottom]}
        frame
        scrollView={false}
      >
        {/* gorhom draws the grabber above this. */}
        <SheetHeader title="Add a photo" grabber={false} />
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 24, gap: 8 }}>
          <SheetRow
            icon={<CameraIcon size={24} color={color.text} />}
            label="Take photo"
            onPress={() => onPick("camera")}
          />
          <SheetRow
            icon={<PhotoIcon size={24} color={color.text} />}
            label="Choose from gallery"
            onPress={() => onPick("gallery")}
          />
        </View>
      </CustomBottomSheetModal>
    );
  }
);

/** §8.2 draft resume: "Finish your {title or 'last'} listing?" */
export const ResumeDraftSheet = forwardRef<
  BottomSheetModal,
  { title: string; onContinue: () => void; onDiscard: () => void; onDismiss: () => void }
>(({ title, onContinue, onDiscard, onDismiss }, ref) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <CustomBottomSheetModal
      ref={ref}
      isDark={isDark}
      snapPoints={[RESUME_HEIGHT + insets.bottom]}
      frame
      scrollView={false}
      onDismiss={onDismiss}
    >
      <SheetHeader title={`Finish your ${title} listing?`} grabber={false} />
      <View style={{ height: 8 }} />
      {/* The frame draws Discard red; the kit footer's link has no danger tone yet (ENG-440). */}
      <SheetFooter
        primary={{ label: "Continue", onPress: onContinue }}
        secondary={{ label: "Discard", onPress: onDiscard }}
      />
    </CustomBottomSheetModal>
  );
});
