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
import { Platform, Text as RNText, StyleSheet, TextProps, TextStyle } from "react-native";

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
 * The tone a role implies. The 2.1 kit sets a grouped-list header in sentence
 * case at 60% with no tracking (SPEC "List rows"), so the caps-and-tracking
 * treatment the old iOS-style header had is gone, and a field label is 100%.
 */
const roleTone: Record<TypeRole, TextTone> = {
  screenTitle: "default",
  sectionTitle: "default",
  groupHeader: "dim",
  fieldLabel: "default",
  fieldHint: "dim",
};

const StyledText = styled(RNText);

/**
 * The 2.1 kit uses four weights — Regular, Medium, SemiBold, Bold — and each
 * resolves to its own face. Until ENG-426 `font-medium` read as Regular and
 * `font-semibold` as Bold, because the previous design had only two weights;
 * the kit's chips, tab labels and button labels need the real faces.
 *
 * `font-light` has no use in the kit and stays on Regular.
 */
const fontWeightMap: Record<TailwindFontWeight, string> = {
  "font-light": fontFamily.regular,
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

/** The last `text-<size>` utility in a className, if it carries one. */
function classNameSize(className: string): TailwindFontSize | undefined {
  let found: TailwindFontSize | undefined;
  for (const token of className.split(/\s+/)) {
    if (Object.prototype.hasOwnProperty.call(sizeTokenMap, token)) found = token as TailwindFontSize;
  }
  return found;
}

/**
 * Face, size and leading for a `Text`, as plain data so it can be tested
 * without rendering.
 *
 * Precedence, most specific first:
 *   fontWeight  >  role's weight  >  regular
 *   fontSize    >  role's size    (else NativeWind's className size applies)
 *   lineHeight  >  the leading of fontSize / role / className `text-*`  >  base
 *
 * The className step matters because this component always sets `lineHeight`
 * as style, which beats the leading NativeWind attaches to a `text-sm` class:
 * before it, `className="text-sm"` drew 14pt text on the 18pt line box.
 */
export function resolveTextMetrics({
  className = "",
  fontSize,
  fontWeight,
  lineHeight,
  role,
}: Pick<CustomTextProps, "className" | "fontSize" | "fontWeight" | "lineHeight" | "role">) {
  const spec = role ? typeRole[role] : undefined;
  const weight: TailwindFontWeight = fontWeight ?? spec?.weight ?? "font-normal";
  const sizeClass: TailwindFontSize | undefined =
    fontSize ?? (spec ? (`text-${spec.size}` as TailwindFontSize) : undefined);
  const fromClass = classNameSize(className);
  const token = sizeTokenMap[sizeClass ?? fromClass ?? "text-base"];
  return {
    fontFamily: fontWeightMap[weight],
    fontSize: sizeClass ? fontSizeScale[token] : undefined,
    lineHeight: lineHeight ?? lineHeightScale[token],
    /** The size the text actually renders at: the prop, the role, the className, else React Native's 14. */
    renderedSize: sizeClass || fromClass ? fontSizeScale[token] : 14,
  };
}

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

// Android draws Plus Jakarta Sans glyphs of 14pt and up about 2/3pt lower in their line than Figma and iOS do
// (ENG-426 kit diffs: List row, Notice, Price row and Section header all matched best 2/3pt higher; 12pt pills
// already matched, and moving them made them fail). Line boxes are already
// right, so only the glyphs move: a transform never changes layout. includeFontPadding: false was tried and
// rejected, because it also shrinks every line box (a 20pt line measured 17.67). Skipped when the caller sets its
// own transform, so an animated Text keeps working.
const ANDROID_GLYPH_SHIFT: TextStyle = { transform: [{ translateY: -2 / 3 }] };

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

  // Colour precedence, most specific first:
  //   style.color  >  className colour  >  tone  >  role's tone  >  "default"
  // Size, weight and leading: see `resolveTextMetrics`. A role only ever
  // supplies defaults, so a call site can adopt `role` and still override one
  // axis of it without losing the rest.
  const resolvedTone: TextTone = tone ?? (role ? roleTone[role] : "default");
  const metrics = resolveTextMetrics({ className, fontSize, fontWeight, lineHeight, role });

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

  return (
    <StyledText
      className={className}
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        classNameSetsColor && !toneIsExplicit
          ? null
          : { color: toneColor[resolvedTone] },
        style,
        customColor ? { color: customColor } : null,
        { fontFamily: metrics.fontFamily },
        metrics.fontSize ? { fontSize: metrics.fontSize } : null,
        { lineHeight: metrics.lineHeight },
        Platform.OS === "android" && metrics.renderedSize >= 14 && !StyleSheet.flatten(style)?.transform
          ? ANDROID_GLYPH_SHIFT
          : null,
      ]}
      {...props}
    >
      {children}
    </StyledText>
  );
}
