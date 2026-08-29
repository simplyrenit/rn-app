import { useGlobalContext } from "@/context/global-context";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/core";
import { Button } from "../core";
import { ink } from "@/lib/design-tokens";

type AddressChoiceModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (choice: "current" | "selected") => void;
};

const AddressChoiceModal: React.FC<AddressChoiceModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
}) => {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        className="flex-1 justify-center items-center"
      >
        <View
          className={`w-4/5 ${
            isDarkMode ? "bg-surface-dark" : "bg-surface-light"
          } p-5 rounded-button items-center`}
        >
          <View
            className={`relative w-full items-center border-b-[1px] ${
              isDarkMode ? "border-gray-600" : "border-gray-300"
            }`}
          >
            {/* Text Section */}
            <Text
              className={`text-lg font-bold mb-4 ${
                isDarkMode ? "text-white" : "text-black"
              }`}
            >
              Choose Address
            </Text>

            {/* Icon Section */}
            <TouchableOpacity
              style={{ position: "absolute", right: 8, top: 2 }}
              onPress={onClose}
            >
              <Feather
                name="x"
                size={24}
                color={ink.text(isDarkMode)}
              />
            </TouchableOpacity>
          </View>

          <Text
            tone="body"
            fontSize="text-md"
            className="text-center mb-6 mt-3"
          >
            Do you want to go with the current address or the selected address?
          </Text>
          <View className="flex-row justify-between w-full">
            <Button
              variant="primary"
              className="w-2/5"
              onPress={() => onConfirm("current")}
            >
              Current Address
            </Button>
            <Button
              variant="primary"
              className="w-2/5"
              onPress={() => onConfirm("selected")}
            >
              Selected Address
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AddressChoiceModal;
