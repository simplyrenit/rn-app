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
  /**
   * The tone that sits ON the brand fill — a primary button's label, a sent
   * chat bubble's text. Identical to `onPhoto` today; they are separate tokens
   * because a redesign that lightens the brand must be able to darken this one
   * without also darkening every label that sits over a photograph.
   */
  onBrand: string;
  /**
   * The tone that sits ON a photograph or a scrim — a close button over a hero
   * image, a favourite heart on a product tile. Never resolves against the
   * theme's own surface, so it does not flip between light and dark.
   */
  onPhoto: string;
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
  canvas: "#0F0F0F", // Black and White/1200
  surface: "#1A1A1A", // Black and White/1100
  surfaceRaised: "#292929", // Black and White/1000
  line: "#292929", // Black and White/1000
  text: "#FFFFFF", // Text - Dark mode/Primary, 18.9:1 AAA
  textHi: "rgba(255,255,255,0.70)", // Text/Secondary
  textBody: "rgba(255,255,255,0.70)",
  textDim: "rgba(255,255,255,0.50)", // Text/Tertiary
  brand: "#635BE8", // Purple/400
  brandText: "#827CED", // Purple/400 itself fails on #0F0F0F; this is the readable tint
  brandTextHi: "#928CEF",
  brandWash: "rgba(99,91,232,0.12)",
  inputLine: "#767676", // Black and White/700
  placeholder: "rgba(255,255,255,0.50)",
  focus: "#928CEF",
  onBrand: "#FFFFFF",
  onPhoto: "#FFFFFF",
  scrim: "rgba(0,0,0,0.60)",
  skeleton: "#1A1A1A",
  skeletonHighlight: "#292929",
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
  canvas: "#FFFFFF", // Black and White/50
  surface: "#FFFFFF",
  surfaceRaised: "#F5F5F5", // Black and White/100
  line: "#E6E6E6", // Black and White/200
  text: "#000000", // Text - Light mode/Primary, 21:1 AAA
  textHi: "rgba(0,0,0,0.70)", // Text/Secondary
  textBody: "rgba(0,0,0,0.70)",
  textDim: "rgba(0,0,0,0.58)", // Text/Tertiary — design says 0.50 (3.95:1, below AA); 0.58 is the smallest step that clears 4.5 on both light grounds
  brand: "#635BE8", // Purple/400
  brandText: "#635BE8", // 4.85:1 AA on white
  brandTextHi: "#363280", // Purple/700
  brandWash: "rgba(99,91,232,0.07)",
  inputLine: "#C4C4C4", // Black and White/300
  placeholder: "rgba(0,0,0,0.58)", // as textDim — 0.50 fails AA on white
  focus: "#635BE8",
  onBrand: "#FFFFFF",
  onPhoto: "#FFFFFF",
  scrim: "rgba(0,0,0,0.45)",
  skeleton: "#F5F5F5",
  skeletonHighlight: "#E6E6E6",
  success: "#1E7A47",
  warning: "#7A5200",
  danger: "#B3261E",
  info: "#1F5F94",
  successWash: "rgba(30,122,71,0.08)",
  warningWash: "rgba(122,82,0,0.08)",
  dangerWash: "rgba(179,38,30,0.08)",
  infoWash: "rgba(31,95,148,0.08)",
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
  base: 18, // Body Large
  lg: 20,
  xl: 24,
  "2xl": 28,
  "3xl": 34,
} as const;

export const lineHeight = {
  // The new system sets body text at 1.5 and headings at 1.2.
  xs: 18, // 1.5
  sm: 21, // 1.5
  md: 24, // 1.5
  base: 27, // 1.5
  lg: 24, // 1.2  H3
  xl: 29, // 1.2  H2
  "2xl": 34, // 1.2 — no Figma equivalent above 24; retained for existing call sites
  "3xl": 41, // 1.2 — as above
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
  button: 11, // measured off the Figma Button component (Primary, 358x44)
  input: 11,
  card: 16,
  group: 14,
  /**
   * The top corners of a bottom sheet. Three files hardcoded this as a bare 20;
   * the design measures 16, matching `card` — sheets and tiles share a radius.
   */
  sheet: 16,
  full: 999,
} as const;

/**
 * Fixed proportions.
 *
 * The product tile's ratio was written out longhand in two different card
 * components. Naming it is the only thing that keeps the customer's shelf and
 * the browse grid rendering the same tile.
 */
export const aspect = {
  /** Product photo on a card — very slightly taller than it is wide. */
  productImage: 41.5 / 44.5,
} as const;

/** Apple's minimum comfortable target. Not a guideline — a floor. */
export const MIN_TOUCH_TARGET = 44;

/** Standard horizontal page gutter. One value, every screen. */
export const SCREEN_GUTTER = 24;

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
  /**
   * Space below the last row of a list that the tab bar overlaps. Replaces
   * `hp("10%")`, which resolved to 84 on the reference device and to whatever
   * the launch height happened to be everywhere else.
   */
  listFooter: 84,
  /** As above, for a list with no tab bar under it. Was `hp("5%")` ≈ 42. */
  listFooterCompact: 44,
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
 * Press feedback.
 *
 * 149 of the app's touchables took React Native's default opacity dip, which
 * nobody chose. These are the numbers that replace it: small enough to read as
 * the control acknowledging a finger rather than as an animation, and applied
 * by the shared wrappers so no screen has to pick its own `activeOpacity`.
 *
 * The scale is dropped under Reduce Motion; the opacity dip is not, because it
 * is the feedback itself and not movement.
 */
export const press = {
  scale: 0.97,
  opacity: 0.86,
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
  /** On the brand fill. Theme-invariant — takes no argument by design. */
  onBrand: () => lightColors.onBrand,
  /** On a photograph or scrim. Theme-invariant — takes no argument by design. */
  onPhoto: () => lightColors.onPhoto,
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
