import { Text } from "@/components/core";
import CustomBottomSheetModal from "@/components/core/custom-bottom-sheet-modal";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { DocumentIcon, PhotoIcon } from "react-native-heroicons/outline";

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
      snapPoints={["25%"]}
      isDark={isDarkMode}
    >
      <View className="p-4 flex-1 flex-col items-center justify-center space-y-4">
        <Text
          fontSize="text-xl"
          fontWeight="font-bold"
        >
          Select Attachment
        </Text>
        <View className="w-full space-y-2 px-2">
          <TouchableOpacity
            className="flex-row justify-between py-3 border border-gray-300 rounded-lg w-full px-2"
            onPress={onSelectDocuments}
          >
            <Text
              lineHeight={20}
              fontSize="text-md"
            >
              Select Documents
            </Text>
            <DocumentIcon
              size={20}
              color={"#635BE8"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row justify-between py-3 border border-gray-300 rounded-lg w-full px-2"
            onPress={onSelectImagesVideos}
          >
            <Text
              lineHeight={20}
              fontSize="text-md"
            >
              Select Images/Videos
            </Text>
            <PhotoIcon
              size={20}
              color={"#635BE8"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </CustomBottomSheetModal>
  );
};

export default AttachmentSheet;
