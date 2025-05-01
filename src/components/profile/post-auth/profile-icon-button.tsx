import { Text } from "@/components/core";
import React from "react";
import { View, TouchableOpacity } from "react-native";

import { widthPercentageToDP as wp } from "react-native-responsive-screen";

import {
  CubeIcon,
  ChevronRightIcon,
  PencilIcon,
  DevicePhoneMobileIcon,
  CurrencyRupeeIcon,
  QuestionMarkCircleIcon,
  FlagIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  UsersIcon,
  DocumentIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CalendarIcon,
  Square3Stack3DIcon,
} from "react-native-heroicons/outline";

interface IconButtonProps {
  onPress: () => void;
  leftIcon: keyof typeof IconsMap;
  rightIcon?: React.ReactNode;
  text: string;
  isDarkMode: boolean;
}

const IconsMap = {
  CubeIcon,
  PencilIcon,
  DevicePhoneMobileIcon,
  CurrencyRupeeIcon,
  QuestionMarkCircleIcon,
  FlagIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  UsersIcon,
  DocumentIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CalendarIcon,
  Square3Stack3DIcon,
};

const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  leftIcon,
  rightIcon,
  text,
  isDarkMode,
}) => {
  const LeftIconComponent = IconsMap[leftIcon];

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-4"
      onPress={onPress}
    >
      <View className="flex-row gap-3 items-center justify-center">
        <View className="items-center justify-center">
          {LeftIconComponent && (
            <LeftIconComponent size={18} color={isDarkMode ? "#fff" : "#000"} />
          )}
        </View>
        <View>
          <Text
            fontSize="text-base"
            style={{
              color: isDarkMode ? "#fff" : "#000",
              // fontSize: wp("3.5%"),
            }}
          >
            {text}
          </Text>
        </View>
      </View>
      <View>
        {rightIcon || (
          <ChevronRightIcon size={18} color={isDarkMode ? "#fff" : "#000"} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default IconButton;
