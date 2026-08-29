import { useGlobalContext } from "@/context/global-context";
import {
  ColorTokens,
  ThemeName,
  colors,
  radius,
  shadow,
  space,
} from "@/lib/design-tokens";

export interface Theme {
  name: ThemeName;
  isDark: boolean;
  color: ColorTokens;
  space: typeof space;
  radius: typeof radius;
  /** Elevation for a card/sheet. Dark elevates with a hairline, light with a shadow. */
  shadow: (typeof shadow)["light"] | (typeof shadow)["dark"];
}

/**
 * The one place a component should get colour from. Returns the resolved token
 * set for the active theme, so call sites never branch on a hex literal.
 */
export function useTheme(): Theme {
  const { theme } = useGlobalContext();
  const name: ThemeName = theme === "dark" ? "dark" : "light";
  return {
    name,
    isDark: name === "dark",
    color: colors[name],
    space,
    radius,
    shadow: shadow[name],
  };
}

/** Non-hook access, for modules outside the React tree (e.g. toast config). */
export function themeFor(name: string | undefined): Theme {
  const resolved: ThemeName = name === "dark" ? "dark" : "light";
  return {
    name: resolved,
    isDark: resolved === "dark",
    color: colors[resolved],
    space,
    radius,
    shadow: shadow[resolved],
  };
}
