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
  canvas: "#FBFAF9",
  surface: "#FFFFFF",
  "surface-raised": "#F4F2EF",
  line: "#E6E4E0",
  text: "#16151A",
  ink: "#16151A",
  "text-hi": "#35333D",
  strong: "#35333D",
  "text-body": "#55535E",
  muted: "#55535E",
  "text-dim": "#6F6D7A",
  subtle: "#6F6D7A",
  "brand-text": "#635BE8",
  "input-line": "#949089",
  placeholder: "#6F6D7A",
  success: "#1E7A47",
  warning: "#7A5200",
  danger: "#B3261E",
  info: "#1F5F94",
  "success-wash": "#EAF6EE",
  "warning-wash": "#FFF6E0",
  "danger-wash": "#FBEAE8",
  "info-wash": "#EAF2F9",
  "brand-wash": "rgba(99,91,232,0.07)",
  skeleton: "#E9E7E3",
};

const dark = {
  canvas: "#0A0A0F",
  surface: "#12121A",
  "surface-raised": "#1A1A24",
  line: "#22222E",
  text: "#FFFFFF",
  ink: "#FFFFFF",
  "text-hi": "#B4B4C0",
  strong: "#B4B4C0",
  "text-body": "#9B9BA8",
  muted: "#9B9BA8",
  "text-dim": "#7A7A8E",
  subtle: "#7A7A8E",
  "brand-text": "#827CED",
  "input-line": "#6A6A7E",
  placeholder: "#8A8A9E",
  success: "#6FCF97",
  warning: "#FFD479",
  danger: "#EB6F62",
  info: "#7FB4E8",
  "success-wash": "rgba(111,207,151,0.10)",
  "warning-wash": "rgba(255,212,121,0.10)",
  "danger-wash": "rgba(235,111,98,0.10)",
  "info-wash": "rgba(127,180,232,0.10)",
  "brand-wash": "rgba(99,91,232,0.12)",
  skeleton: "#1A1A24",
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
        base: ["17px", "24px"],
        lg: ["20px", "26px"],
        xl: ["24px", "30px"],
        "2xl": ["28px", "34px"],
        "3xl": ["34px", "40px"],
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
        gutter: "20px",
        touch: "44px",
      },
      borderRadius: {
        button: "9px",
        input: "11px",
        card: "12px",
        group: "14px",
        full: "999px",
      },
    },
  },
  plugins: [],
};
