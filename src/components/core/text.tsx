import { useGlobalContext } from "@/context/global-context";
import { styled } from "nativewind";
import React from "react";
import { Text as RNText, StyleSheet, TextProps } from "react-native";
import { widthPercentageToDP as wp } from "react-native-responsive-screen";
type TailwindFontSize =
  | "text-xs"
  | "text-sm"
  | "text-md"
  | "text-base"
  | "text-lg"
  | "text-xl"
  | "text-2xl";

type TailwindFontWeight =
  | "font-light"
  | "font-normal"
  | "font-medium"
  | "font-semibold"
  | "font-bold";

interface CustomTextProps extends TextProps {
  className?: string;
  fontSize?: TailwindFontSize;
  fontWeight?: TailwindFontWeight;
  lineHeight?: number;
}

const StyledText = styled(RNText);

const fontWeightMap: Record<TailwindFontWeight, string> = {
  "font-light": "PlusJakartaSans-Light",
  "font-normal": "PlusJakartaSans-Regular",
  "font-medium": "PlusJakartaSans-Medium",
  "font-semibold": "PlusJakartaSans-SemiBold",
  "font-bold": "PlusJakartaSans-Bold",
};

const fontSizeMap: Record<TailwindFontSize, number> = {
  "text-xs": wp("3.2%"), //12.666
  "text-sm": wp("3.8%"), //15
  "text-md": wp("4.15%"), //16.33
  "text-base": wp("4.3%"), //17
  "text-lg": wp("4.75%"), //18.66
  "text-xl": wp("5.2%"), //20.333
  "text-2xl": wp("6.5%"), //25.666
};

export function Text({
  className = "",
  style,
  fontSize,
  fontWeight = "font-normal",
  lineHeight,
  ...props
}: CustomTextProps) {
  const { theme } = useGlobalContext();

  const isDarkMode = theme === "dark";

  const baseColorClass = isDarkMode ? "text-white" : "text-black";

  const combinedClasses = `${baseColorClass} ${className}`.trim();

  const customColor = StyleSheet.flatten(style)?.color;

  const fontFamily = fontWeightMap[fontWeight];

  const fontSizeValue = fontSize ? fontSizeMap[fontSize] : undefined;

  return (
    <StyledText
      className={combinedClasses}
      style={[
        style,
        customColor ? { color: customColor } : null,
        { fontFamily },
        fontSizeValue ? { fontSize: fontSizeValue } : null,
        {
          lineHeight: lineHeight
            ? lineHeight
            : fontSize === "text-2xl"
            ? 30
            : fontSize === "text-xl"
            ? 22
            : fontSize === "text-lg"
            ? 25
            : 18,
        },
      ]}
      {...props}
    />
  );
}
