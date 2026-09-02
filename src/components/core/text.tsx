import {
  FontSizeToken,
  fontFamily,
  fontSize as fontSizeScale,
  lineHeight as lineHeightScale,
  typeRole,
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
  | "onBrand"
  | "onPhoto";

export type TypeRole = keyof typeof typeRole;

// `role` shadows the ARIA prop RN inherited from the web. Nothing in the app
// uses that one, and `accessibilityRole` is the API this codebase already
// speaks, so the name is better spent on the type role.
interface CustomTextProps extends Omit<TextProps, "role"> {
  className?: string;
  fontSize?: TailwindFontSize;
  fontWeight?: TailwindFontWeight;
  lineHeight?: number;
  tone?: TextTone;
  /**
   * What this text is *for*. Resolves size, weight and a default tone in one
   * prop, so a section heading cannot accidentally ship at screen-title volume.
   * Prefer this over hand-picking `fontSize` + `fontWeight` + `tone`.
   */
  role?: TypeRole;
}

/**
 * Presentation a role implies beyond size and weight.
 *
 * A grouped-list header is not just small text: iOS sets it in caps with open
 * tracking, and that treatment is a large part of what tells the reader it
 * labels a group rather than titling the screen.
 */
const roleExtras: Record<
  TypeRole,
  { tone: TextTone; uppercase?: boolean; letterSpacing?: number }
> = {
  screenTitle: { tone: "default" },
  sectionTitle: { tone: "default" },
  groupHeader: { tone: "dim", uppercase: true, letterSpacing: 0.6 },
  fieldLabel: { tone: "hi" },
  fieldHint: { tone: "body" },
};

const StyledText = styled(RNText);

/**
 * The new type system has two weights, not five: Regular 400 and Bold 700.
 * Every style in the Figma resolves to one of those, so the three in-between
 * faces have nothing to map to.
 *
 * The public `fontWeight` prop keeps all five names — 269 call sites use them
 * and renaming would be churn without meaning — but they resolve onto two
 * families. `font-medium` reads as Regular and `font-semibold` as Bold, which
 * is the weight the design intends at those sites.
 */
const fontWeightMap: Record<TailwindFontWeight, string> = {
  "font-light": fontFamily.regular,
  "font-normal": fontFamily.regular,
  "font-medium": fontFamily.regular,
  "font-semibold": fontFamily.bold,
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
  fontWeight,
  lineHeight,
  tone,
  role,
  children,
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
    onBrand: color.onBrand,
    onPhoto: color.onPhoto,
  };

  // Precedence, most specific first:
  //   style.color  >  className colour  >  tone  >  role's tone  >  "default"
  //   fontSize     >  role's size       >  17pt base
  //   fontWeight   >  role's weight     >  regular
  // A role only ever supplies defaults, so a call site can adopt `role` and
  // still override one axis of it without losing the rest.
  const spec = role ? typeRole[role] : undefined;
  const extras = role ? roleExtras[role] : undefined;

  const resolvedTone: TextTone = tone ?? extras?.tone ?? "default";
  const resolvedWeight: TailwindFontWeight =
    fontWeight ?? spec?.weight ?? "font-normal";
  const resolvedSizeClass: TailwindFontSize | undefined =
    fontSize ?? (spec ? (`text-${spec.size}` as TailwindFontSize) : undefined);

  // An explicit colour on `style` still wins, so existing call sites that pass
  // one keep working; `tone` only supplies the default.
  const customColor = StyleSheet.flatten(style)?.color;

  // NativeWind resolves className into a style that this component's own `style`
  // array would otherwise sit on top of. A call site that says `text-muted-dark`
  // means it, so stand down and let the class win rather than silently
  // overriding it with the tone default.
  // A role's tone is a default too, so a call site that spelled out a colour
  // class still wins over it.
  const classNameSetsColor = hasColorClass(className);
  const toneIsExplicit = tone !== undefined && tone !== "default";

  const token = sizeTokenMap[resolvedSizeClass ?? "text-base"];
  const resolvedSize = resolvedSizeClass ? fontSizeScale[token] : undefined;
  const resolvedLeading = lineHeight ?? lineHeightScale[token];

  return (
    <StyledText
      className={className}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        classNameSetsColor && !toneIsExplicit
          ? null
          : { color: toneColor[resolvedTone] },
        extras?.letterSpacing ? { letterSpacing: extras.letterSpacing } : null,
        style,
        customColor ? { color: customColor } : null,
        { fontFamily: fontWeightMap[resolvedWeight] },
        resolvedSize ? { fontSize: resolvedSize } : null,
        { lineHeight: resolvedLeading },
      ]}
      {...props}
    >
      {/* Caps are a presentation choice, so they are applied here rather than
          asked of every call site — and `textTransform` is unreliable on
          Android, which is where this app's headers lost their treatment. */}
      {extras?.uppercase && typeof children === "string"
        ? children.toUpperCase()
        : children}
    </StyledText>
  );
}
