/**
 * Renit design tokens — the single source of truth for colour, type, spacing,
 * radius and elevation.
 *
 * Values come from the Renit design system (v4, WCAG 2.2 AA). Every colour pair
 * below has a measured contrast ratio recorded beside it; do not add a colour
 * here without measuring it first, and do not write a colour literal anywhere
 * else in the app.
 *
 * Two rules from the system that are easy to break by accident:
 *   1. `brand` is a FILL, never a text colour. Text that needs to read as brand
 *      uses `brandText`, which is lightened on dark so it clears AA.
 *   2. Control borders use `inputLine`, never `line`. A hairline is a divider;
 *      it fails WCAG 1.4.11 (3:1) as the edge of an interactive control.
 */

export type ThemeName = "light" | "dark";

export interface ColorTokens {
  /** Page background. */
  canvas: string;
  /** Cards, inputs, nav, sheets — one step above the canvas. */
  surface: string;
  /** Second elevation step: sheets over cards, pressed rows. */
  surfaceRaised: string;
  /** Hairlines, borders, dividers. Never the edge of a control. */
  line: string;
  /** Headlines and primary copy. */
  text: string;
  /** Body copy on tinted/busy surfaces. */
  textHi: string;
  /** Body minimum and secondary copy. */
  textBody: string;
  /** Dimmed clauses, captions, disabled labels. */
  textDim: string;
  /** Brand fill — buttons, active indicators, key surfaces. Never text. */
  brand: string;
  /** Brand as a text/icon colour, contrast-corrected per theme. */
  brandText: string;
  /** Small brand accents: eyebrows, focus ring, active tab tint. */
  brandTextHi: string;
  /** Brand wash behind tinted surfaces (12% dark / 7% light). */
  brandWash: string;
  /** Border of an interactive control — WCAG 1.4.11, ≥3:1 vs its surface. */
  inputLine: string;
  /** Placeholder text. Shipped, never left to the browser/OS default. */
  placeholder: string;
  /** Keyboard focus ring. */
  focus: string;
  /** Modal scrim behind sheets and dialogs. */
  scrim: string;
  /** Neutral fill for skeletons, image placeholders, avatar rings. */
  skeleton: string;
  skeletonHighlight: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Tinted grounds for status pills — paired with the matching semantic hue. */
  successWash: string;
  warningWash: string;
  dangerWash: string;
  infoWash: string;
}

export const darkColors: ColorTokens = {
  canvas: "#0A0A0F",
  surface: "#12121A",
  surfaceRaised: "#1A1A24",
  line: "#22222E",
  text: "#FFFFFF", // 19.6:1 AAA
  textHi: "#B4B4C0", // 9.62:1 AAA
  textBody: "#9B9BA8", // 7.19:1 AA
  textDim: "#7A7A8E", // 4.70:1 AA
  brand: "#635BE8", // white on it 5.01:1
  brandText: "#827CED", // 5.70:1 AA
  brandTextHi: "#928CEF", // 6.79:1 AA
  brandWash: "rgba(99,91,232,0.12)",
  inputLine: "#6A6A7E", // 3.53:1 vs surface
  placeholder: "#8A8A9E", // 5.51:1 AA
  focus: "#928CEF",
  scrim: "rgba(0,0,0,0.60)",
  skeleton: "#1A1A24",
  skeletonHighlight: "#262634",
  success: "#6FCF97",
  warning: "#FFD479",
  danger: "#EB6F62",
  info: "#7FB4E8",
  successWash: "rgba(111,207,151,0.10)",
  warningWash: "rgba(255,212,121,0.10)",
  dangerWash: "rgba(235,111,98,0.10)",
  infoWash: "rgba(127,180,232,0.10)",
};

export const lightColors: ColorTokens = {
  canvas: "#FBFAF9",
  surface: "#FFFFFF",
  surfaceRaised: "#F4F2EF",
  line: "#E6E4E0",
  text: "#16151A", // 16.8:1 AAA
  textHi: "#35333D", // 11.4:1 AAA
  textBody: "#55535E", // 7.31:1 AA
  textDim: "#6F6D7A", // 4.91:1 AA
  brand: "#635BE8", // white on it 5.01:1
  brandText: "#635BE8", // 4.85:1 AA
  brandTextHi: "#635BE8",
  brandWash: "rgba(99,91,232,0.07)",
  inputLine: "#949089", // 3.17:1 vs #FFF
  placeholder: "#6F6D7A", // 4.91:1 AA
  focus: "#635BE8",
  scrim: "rgba(22,21,26,0.45)",
  skeleton: "#E9E7E3",
  skeletonHighlight: "#F6F5F3",
  success: "#1E7A47",
  warning: "#7A5200",
  danger: "#B3261E",
  info: "#1F5F94",
  successWash: "#EAF6EE",
  warningWash: "#FFF6E0",
  dangerWash: "#FBEAE8",
  infoWash: "#EAF2F9",
};

export const colors: Record<ThemeName, ColorTokens> = {
  light: lightColors,
  dark: darkColors,
};

/**
 * Type ramp. Fixed point sizes — never a percentage of screen width. Reading
 * distance does not change with device size, so type size must not either.
 *
 * Leading loosens as size shrinks, which is the direction it has to run: body
 * copy needs the most air, display type the least.
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  base: 17,
  lg: 20,
  xl: 24,
  "2xl": 28,
  "3xl": 34,
} as const;

export const lineHeight = {
  xs: 16, // 1.33
  sm: 20, // 1.43
  md: 24, // 1.50
  base: 24, // 1.41
  lg: 26, // 1.30
  xl: 30, // 1.25
  "2xl": 34, // 1.21
  "3xl": 40, // 1.18
} as const;

export type FontSizeToken = keyof typeof fontSize;

/**
 * iOS chrome sits outside the content ramp: tab-bar labels and nav titles
 * follow the HIG, not the reading scale.
 */
export const chromeFontSize = {
  tabLabel: 11,
  navTitle: 17,
} as const;

export const fontFamily = {
  light: "PlusJakartaSans-Light",
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
} as const;

/** 4pt-derived spacing scale from the design system. */
export const space = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 34,
  "2xl": 52,
  "3xl": 74,
} as const;

/**
 * Four radii and a chip. Anything not on this list is drift.
 * `full` is for pills and avatars only — never a card.
 */
export const radius = {
  button: 9,
  input: 11,
  card: 12,
  group: 14,
  full: 999,
} as const;

/** Apple's minimum comfortable target. Not a guideline — a floor. */
export const MIN_TOUCH_TARGET = 44;

/** Standard horizontal page gutter. One value, every screen. */
export const SCREEN_GUTTER = 20;

/**
 * Vertical density.
 *
 * The app had a colour system and no spacing system, so every screen invented
 * its own rhythm and the whole thing read ~1.4× the scale iOS expects. Measured
 * on an iPhone 17 Pro, Home spent 411pt — 47% of an 874pt viewport — before the
 * first product pixel, and a single form field group cost 146pt.
 *
 * These are the numbers that fix that. They are deliberately close to the
 * platform's own: a list row is 44pt because that is what iOS ships, not because
 * 44 looked nice. Do not add a vertical constant anywhere else.
 */
export const density = {
  /** Single-line list row. The platform standard, and still a full target. */
  row: MIN_TOUCH_TARGET,
  /** Row carrying a two-line stack — a title over a subtitle. */
  rowStacked: 62,
  /** Space between two sections of a scrolling screen. */
  section: 20,
  /** Space under a section heading, before the content it introduces. */
  sectionHeaderGap: 8,
  /** Space between form field groups. Was 44; the label ramp absorbed the rest. */
  fieldGap: 18,
  /** Inset for a list separator, so it aligns to the label and not the icon. */
  separatorInset: 33,
  /** Height of a filter/category chip. */
  chip: 36,
  /** Padding inside a content block (card body, section body). */
  block: 14,
} as const;

/**
 * Type roles.
 *
 * The ramp above says how big; this says what for. Several screens were setting
 * a section heading at the size iOS reserves for a screen title, so a screen
 * with four sections had four things all shouting at title volume.
 */
export const typeRole = {
  /** The one title of a screen. At most one per screen. */
  screenTitle: { size: "xl", weight: "font-bold" },
  /** A section inside a screen. There may be several. */
  sectionTitle: { size: "lg", weight: "font-semibold" },
  /** A grouped-list header — "Account", "Support". Quiet, not a title. */
  groupHeader: { size: "xs", weight: "font-semibold" },
  /** A form field's label. Must never outrank the value the reader types. */
  fieldLabel: { size: "sm", weight: "font-semibold" },
  /** Helper text under a field label. */
  fieldHint: { size: "sm", weight: "font-normal" },
} as const;

/** Light theme elevates with a shadow; dark elevates with a hairline only. */
export const shadow = {
  light: {
    shadowColor: "#16151A",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dark: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
} as const;

export const duration = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

/**
 * Non-hook token lookups, for the handful of places that build a style object
 * outside the React tree (calendar marking maps, StyleSheet.create bodies) but
 * already know which theme is active.
 */
export const ink = {
  canvas: (isDark?: boolean) => (isDark ? darkColors.canvas : lightColors.canvas),
  surface: (isDark?: boolean) =>
    isDark ? darkColors.surface : lightColors.surface,
  surfaceRaised: (isDark?: boolean) =>
    isDark ? darkColors.surfaceRaised : lightColors.surfaceRaised,
  line: (isDark?: boolean) => (isDark ? darkColors.line : lightColors.line),
  scrim: (isDark?: boolean) => (isDark ? darkColors.scrim : lightColors.scrim),
  inputLine: (isDark?: boolean) =>
    isDark ? darkColors.inputLine : lightColors.inputLine,
  text: (isDark?: boolean) => (isDark ? darkColors.text : lightColors.text),
  textHi: (isDark?: boolean) => (isDark ? darkColors.textHi : lightColors.textHi),
  body: (isDark?: boolean) =>
    isDark ? darkColors.textBody : lightColors.textBody,
  dim: (isDark?: boolean) => (isDark ? darkColors.textDim : lightColors.textDim),
  placeholder: (isDark?: boolean) =>
    isDark ? darkColors.placeholder : lightColors.placeholder,
  brand: () => darkColors.brand,
  skeleton: (isDark?: boolean) =>
    isDark ? darkColors.skeleton : lightColors.skeleton,
  brandWash: (isDark?: boolean) =>
    isDark ? darkColors.brandWash : lightColors.brandWash,
  brandText: (isDark?: boolean) =>
    isDark ? darkColors.brandText : lightColors.brandText,
  danger: (isDark?: boolean) => (isDark ? darkColors.danger : lightColors.danger),
  dangerWash: (isDark?: boolean) =>
    isDark ? darkColors.dangerWash : lightColors.dangerWash,
  success: (isDark?: boolean) =>
    isDark ? darkColors.success : lightColors.success,
  warning: (isDark?: boolean) =>
    isDark ? darkColors.warning : lightColors.warning,
  info: (isDark?: boolean) => (isDark ? darkColors.info : lightColors.info),
} as const;
