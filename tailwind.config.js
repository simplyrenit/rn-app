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
  line: "#E6E6E6",
  text: "#000000",
  ink: "#000000",
  "text-hi": "rgba(0,0,0,0.70)",
  strong: "rgba(0,0,0,0.70)",
  "text-body": "rgba(0,0,0,0.70)",
  muted: "rgba(0,0,0,0.70)",
  "text-dim": "rgba(0,0,0,0.58)",
  subtle: "rgba(0,0,0,0.58)",
  "brand-text": "#635BE8",
  "input-line": "#C4C4C4",
  placeholder: "rgba(0,0,0,0.58)",
  success: "#1E7A47",
  warning: "#7A5200",
  danger: "#B3261E",
  info: "#1F5F94",
  "success-wash": "rgba(30,122,71,0.08)",
  "warning-wash": "rgba(122,82,0,0.08)",
  "danger-wash": "rgba(179,38,30,0.08)",
  "info-wash": "rgba(31,95,148,0.08)",
  "brand-wash": "rgba(99,91,232,0.07)",
  skeleton: "#F5F5F5",
};

const dark = {
  canvas: "#0F0F0F",
  surface: "#1A1A1A",
  "surface-raised": "#292929",
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
  "input-line": "#767676",
  placeholder: "rgba(255,255,255,0.50)",
  success: "#6FCF97",
  warning: "#FFD479",
  danger: "#EB6F62",
  info: "#7FB4E8",
  "success-wash": "rgba(111,207,151,0.10)",
  "warning-wash": "rgba(255,212,121,0.10)",
  "danger-wash": "rgba(235,111,98,0.10)",
  "info-wash": "rgba(127,180,232,0.10)",
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
        xs: ["12px", "18px"],
        sm: ["14px", "21px"],
        md: ["16px", "24px"],
        base: ["18px", "27px"],
        lg: ["20px", "24px"],
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
        input: "11px",
        card: "16px",
        group: "14px",
        sheet: "16px",
        full: "999px",
      },
    },
  },
  plugins: [],
};
