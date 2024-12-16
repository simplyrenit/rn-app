import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import React from "react";
import { TouchableOpacity, View } from "react-native";

interface AttachmentSheetProps {
  bottomSheetModalRef: React.RefObject<any>;
  isDarkMode: boolean;
  onClose: () => void;
  onSelectDocuments: () => void;
  onSelectImagesVideos: () => void;
}

const AttachmentSheet: React.FC<AttachmentSheetProps> = ({
  bottomSheetModalRef,
  isDarkMode,
  onClose,
  onSelectDocuments,
  onSelectImagesVideos,
}) => {
  return (
    <CustomBottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={["40%"]}
      isDark={isDarkMode}
    >
      <View className="p-4">
        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={onSelectDocuments}
        >
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Select Documents
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={onSelectImagesVideos}
        >
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Select Images/Videos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row justify-between py-3"
          onPress={onClose}
        >
          <Text
            fontSize="text-md"
            fontWeight="font-bold"
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </CustomBottomSheetModal>
  );
};

export default AttachmentSheet;
