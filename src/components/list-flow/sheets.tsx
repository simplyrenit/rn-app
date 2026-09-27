import { Button, Text, usePressFeedback } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { PhotoSource } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import React, { forwardRef } from "react";
import { TouchableOpacity, View } from "react-native";
import { CameraIcon, PhotoIcon } from "react-native-heroicons/outline";

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
          minHeight: MIN_TOUCH_TARGET + 12,
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingHorizontal: space.md,
          borderRadius: radius.button,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
        },
        feedback.pressStyle,
      ]}
    >
      {icon}
      <Text fontSize="text-md" fontWeight="font-bold">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** §8.2: Take photo (camera) / Choose from gallery. */
export const AddPhotoSheet = forwardRef<BottomSheetModal, { onPick: (source: PhotoSource) => void }>(
  ({ onPick }, ref) => {
    const { color, isDark } = useTheme();
    return (
      <CustomBottomSheetModal ref={ref} isDark={isDark} snapPoints={[220]} frame scrollView={false}>
        <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, gap: space.sm }}>
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
  return (
    <CustomBottomSheetModal
      ref={ref}
      isDark={isDark}
      snapPoints={[240]}
      frame
      scrollView={false}
      onDismiss={onDismiss}
    >
      <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: space.sm, gap: space.md }}>
        <Text role="sectionTitle" accessibilityRole="header">
          {`Finish your ${title} listing?`}
        </Text>
        <View style={{ gap: space.sm }}>
          <Button onPress={onContinue}>Continue</Button>
          <Button variant="outline" onPress={onDiscard}>
            Discard
          </Button>
        </View>
      </View>
    </CustomBottomSheetModal>
  );
});
