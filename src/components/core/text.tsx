import {
  FontSizeToken,
  fontFamily,
  fontSize as fontSizeScale,
  lineHeight as lineHeightScale,
} from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { styled } from "nativewind";
import React from "react";
import { Text as RNText, StyleSheet, TextProps } from "react-native";

type TailwindFontSize =
  | "text-xs"
  | "text-sm"
  | "text-md"
  | "text-base"
  | "text-lg"
  | "text-xl"
  | "text-2xl"
  | "text-3xl";

type TailwindFontWeight =
  | "font-light"
  | "font-normal"
  | "font-medium"
  | "font-semibold"
  | "font-bold";

/**
 * Semantic colour role. Prefer this over a className colour: it resolves from
 * the design tokens, so it is correct in both themes by construction.
 */
export type TextTone =
  | "default"
  | "hi"
  | "body"
  | "dim"
  | "brand"
  | "danger"
  | "success"
  | "warning"
  | "info"
  | "onBrand";

interface CustomTextProps extends TextProps {
  className?: string;
  fontSize?: TailwindFontSize;
  fontWeight?: TailwindFontWeight;
  lineHeight?: number;
  tone?: TextTone;
}

const StyledText = styled(RNText);

const fontWeightMap: Record<TailwindFontWeight, string> = {
  "font-light": fontFamily.light,
  "font-normal": fontFamily.regular,
  "font-medium": fontFamily.medium,
  "font-semibold": fontFamily.semibold,
  "font-bold": fontFamily.bold,
};

const sizeTokenMap: Record<TailwindFontSize, FontSizeToken> = {
  "text-xs": "xs",
  "text-sm": "sm",
  "text-md": "md",
  "text-base": "base",
  "text-lg": "lg",
  "text-xl": "xl",
  "text-2xl": "2xl",
  "text-3xl": "3xl",
};

/**
 * Dynamic Type is honoured but capped. Uncapped, an accessibility-size setting
 * turns a 34pt headline into ~120pt and every fixed-height row in the app
 * clips; 1.4 keeps large-text users served without breaking layout.
 */
const MAX_FONT_SCALE = 1.4;

/** `text-*` utilities that set something other than colour. */
const NON_COLOR_TEXT_UTILITIES = new Set([
  "text-center",
  "text-left",
  "text-right",
  "text-justify",
  "text-auto",
  "text-xs",
  "text-sm",
  "text-md",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
]);

function hasColorClass(className: string): boolean {
  return className
    .split(/\s+/)
    .filter(Boolean)
    .some(
      (token) =>
        token.startsWith("text-") &&
        !NON_COLOR_TEXT_UTILITIES.has(token.split("/")[0]) &&
        !/^text-\[\d/.test(token)
    );
}

export function Text({
  className = "",
  style,
  fontSize,
  fontWeight = "font-normal",
  lineHeight,
  tone = "default",
  allowFontScaling = true,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  ...props
}: CustomTextProps) {
  const { color } = useTheme();

  const toneColor: Record<TextTone, string> = {
    default: color.text,
    hi: color.textHi,
    body: color.textBody,
    dim: color.textDim,
    brand: color.brandText,
    danger: color.danger,
    success: color.success,
    warning: color.warning,
    info: color.info,
    onBrand: "#FFFFFF",
  };

  // An explicit colour on `style` still wins, so existing call sites that pass
  // one keep working; `tone` only supplies the default.
  const customColor = StyleSheet.flatten(style)?.color;

  // NativeWind resolves className into a style that this component's own `style`
  // array would otherwise sit on top of. A call site that says `text-muted-dark`
  // means it, so stand down and let the class win rather than silently
  // overriding it with the tone default.
  const classNameSetsColor = hasColorClass(className);

  const token = sizeTokenMap[fontSize ?? "text-base"];
  const resolvedSize = fontSize ? fontSizeScale[token] : undefined;
  const resolvedLeading = lineHeight ?? lineHeightScale[token];

  return (
    <StyledText
      className={className}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        classNameSetsColor && tone === "default"
          ? null
          : { color: toneColor[tone] },
        style,
        customColor ? { color: customColor } : null,
        { fontFamily: fontWeightMap[fontWeight] },
        resolvedSize ? { fontSize: resolvedSize } : null,
        { lineHeight: resolvedLeading },
      ]}
      {...props}
    />
  );
}
