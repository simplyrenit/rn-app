/**
 * Tailwind/NativeWind theme, generated from the Renit design system.
 *
 * The token values live in src/lib/design-tokens.ts; this file mirrors them so
 * they are reachable from className strings too. Keep the two in step.
 *
 * NativeWind v2 resolves classes at build time by scanning for literal strings,
 * so a class name can never be built by interpolation. Theme-dependent colours
 * are therefore exposed twice — `bg-surface-light` / `bg-surface-dark` — and
 * chosen with a ternary over two literals. Where a component already reaches
 * for a style object, prefer `useTheme()` from src/lib/theme.ts instead.
 */
const light = {
  canvas: "#FFFFFF",
  surface: "#FFFFFF",
  "surface-raised": "#F5F5F5",
  "surface-muted": "#F2F2F2",
  line: "#E6E6E6",
  text: "#000000",
  ink: "#000000",
  "text-hi": "rgba(0,0,0,0.70)",
  strong: "rgba(0,0,0,0.70)",
  "text-body": "rgba(0,0,0,0.70)",
  muted: "rgba(0,0,0,0.70)",
  "text-dim": "rgba(0,0,0,0.60)",
  subtle: "rgba(0,0,0,0.60)",
  "brand-text": "#635BE8",
  "brand-panel": "#EDEDFC",
  "brand-panel-line": "#CAC8F7",
  "input-line": "#C4C4C4",
  placeholder: "rgba(0,0,0,0.60)",
  success: "#067647",
  warning: "#B54708",
  danger: "#B42318",
  "danger-strong": "#D92D20",
  info: "#175CD3",
  "success-wash": "#ECFDF3",
  "warning-wash": "#FFFAEB",
  "danger-wash": "#FEF3F2",
  "info-wash": "#EFF8FF",
  "brand-wash": "rgba(99,91,232,0.07)",
  skeleton: "#F5F5F5",
};

const dark = {
  // Mirrors darkColors in src/lib/design-tokens.ts: the Figma canvas is true
  // black with inputs one step up. These lagged a step lighter (#0F0F0F/#1A1A1A),
  // so a `bg-*-dark` class beside a token drew two different greys.
  canvas: "#000000",
  surface: "#0F0F0F",
  "surface-raised": "#292929",
  "surface-muted": "#1A1A1A",
  line: "#292929",
  text: "#FFFFFF",
  ink: "#FFFFFF",
  "text-hi": "rgba(255,255,255,0.70)",
  strong: "rgba(255,255,255,0.70)",
  "text-body": "rgba(255,255,255,0.70)",
  muted: "rgba(255,255,255,0.70)",
  "text-dim": "rgba(255,255,255,0.50)",
  subtle: "rgba(255,255,255,0.50)",
  "brand-text": "#827CED",
  "brand-panel": "rgba(99,91,232,0.12)",
  "brand-panel-line": "#292929",
  "input-line": "#767676",
  placeholder: "rgba(255,255,255,0.50)",
  success: "#6FCF97",
  warning: "#FFD479",
  danger: "#EB6F62",
  "danger-strong": "#F97066",
  info: "#7FB4E8",
  "success-wash": "rgba(111,207,151,0.16)",
  "warning-wash": "rgba(255,212,121,0.16)",
  "danger-wash": "rgba(235,111,98,0.16)",
  "info-wash": "rgba(127,180,232,0.16)",
  "brand-wash": "rgba(99,91,232,0.12)",
  skeleton: "#1A1A1A",
};

const suffixed = (obj, suffix) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${k}-${suffix}`, v]));

module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand fill. Identical in both themes so the brand reads the same in
        // a screenshot. `brand-blue` is kept as an alias for existing call sites.
        brand: "#635BE8",
        "brand-blue": "#635BE8",
        "brand-hi": "#928CEF",
        ...suffixed(light, "light"),
        ...suffixed(dark, "dark"),
      },
      fontFamily: {
        light: ["PlusJakartaSans-Light"],
        normal: ["PlusJakartaSans-Regular"],
        medium: ["PlusJakartaSans-Medium"],
        semibold: ["PlusJakartaSans-SemiBold"],
        bold: ["PlusJakartaSans-Bold"],
      },
      fontSize: {
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        md: ["16px", "24px"],
        base: ["18px", "24px"],
        lg: ["20px", "28px"],
        xl: ["24px", "29px"],
        "2xl": ["28px", "34px"],
        "3xl": ["34px", "41px"],
      },
      spacing: {
        // 4pt-derived scale from the design system.
        xs: "4px",
        sm: "8px",
        md: "14px",
        lg: "22px",
        xl: "34px",
        "2xl": "52px",
        "3xl": "74px",
        gutter: "24px",
        touch: "44px",
      },
      borderRadius: {
        button: "12px",
        "button-primary": "11px",
        input: "12px",
        card: "16px",
        group: "14px",
        sheet: "24px",
        full: "999px",
      },
    },
  },
  plugins: [],
};
