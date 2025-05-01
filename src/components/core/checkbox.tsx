import React from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckIcon } from "react-native-heroicons/outline";

interface CheckBoxProps {
  checked: boolean;
  onPress: () => void;
}

export const CheckBox: React.FC<CheckBoxProps> = ({ checked, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <View
      className={`w-5 h-5 border rounded ${
        checked ? "bg-brand-blue border-brand-blue" : "border-gray-300"
      }`}
    >
      {checked && (
        <CheckIcon
          size={20}
          color="white"
        />
      )}
    </View>
  </TouchableOpacity>
);
