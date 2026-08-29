import { Text } from "@/components/core";
import { density } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  AdjustmentsHorizontalIcon,
  ArrowRightStartOnRectangleIcon,
  BanknotesIcon,
  CalendarIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  InboxArrowDownIcon,
  LockClosedIcon,
  MoonIcon,
  PencilIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  UsersIcon,
} from "react-native-heroicons/outline";

/**
 * Icons that mean what the row says.
 *
 * "Switch theme" was a phone. "Feedback & review" was a briefcase. Terms and
 * Privacy were two near-identical document glyphs offering no differentiation,
 * and "My products" reused the same generic cube as every category in the
 * listing flow.
 */
const IconsMap = {
  ArrowRightStartOnRectangleIcon,
  CubeIcon,
  PencilIcon,
  MoonIcon,
  CurrencyRupeeIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  EnvelopeIcon,
  UsersIcon,
  InboxArrowDownIcon,
  LockClosedIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon,
  BanknotesIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
};

interface IconButtonProps {
  onPress: () => void;
  leftIcon: keyof typeof IconsMap;
  rightIcon?: React.ReactNode;
  text: string;
  isDarkMode?: boolean;
  /** Draw an inset hairline under the row. Off for the last row in a section. */
  divider?: boolean;
}

const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  leftIcon,
  rightIcon,
  text,
  divider = true,
}) => {
  const { color } = useTheme();
  const LeftIconComponent = IconsMap[leftIcon];

  const row = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={text}
      activeOpacity={0.6}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        // 44, the platform row. Was 52 with 12pt padding on top of it, which
        // across ~15 rows cost 120pt of avoidable scrolling.
        minHeight: density.row,
        paddingVertical: 6,
      }}
      onPress={onPress}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center", flex: 1 }}>
        {LeftIconComponent && (
          <LeftIconComponent size={21} color={color.textBody} strokeWidth={1.6} />
        )}
        <Text fontSize="text-md" numberOfLines={1} style={{ flex: 1 }}>
          {text}
        </Text>
      </View>
      {rightIcon || <ChevronRightIcon size={17} color={color.textDim} />}
    </TouchableOpacity>
  );

  if (!divider) return row;

  return (
    <>
      {row}
      {/* iOS insets a list separator to the label, not to the screen edge, so
          the icon column reads as one continuous rail. This ran under the icon
          and out to the gutter. */}
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          marginLeft: density.separatorInset,
          backgroundColor: color.line,
        }}
      />
    </>
  );
};

export default IconButton;
