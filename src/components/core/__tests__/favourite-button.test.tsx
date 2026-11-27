import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
// @ts-ignore: no type package for it is installed (it comes with jest-expo).
import TestRenderer from "react-test-renderer";

jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ isAuthenticated: true }) }));
jest.mock("@/backend/useSaved", () => ({ __esModule: true, default: () => ({ saveFavorite: jest.fn(), deleteFavorite: jest.fn() }) }));
jest.mock("@/lib/haptics", () => ({ tapFeedback: () => {} }));
jest.mock("@/lib/toast", () => ({ toast: { info: () => {}, error: () => {} } }));
jest.mock("../use-press-feedback", () => ({
  usePressFeedback: () => ({ onPressIn: () => {}, onPressOut: () => {}, pressStyle: null }),
}));
jest.mock("react-native-heroicons/outline", () => ({ HeartIcon: (props: any) => require("react").createElement("Outline", props) }));
jest.mock("react-native-heroicons/solid", () => ({ HeartIcon: (props: any) => require("react").createElement("Solid", props) }));

// eslint-disable-next-line import/first
import { FavouriteButton } from "../favourite-button";
// eslint-disable-next-line import/first
import { darkColors } from "@/lib/design-tokens";

const heart = (props: Partial<React.ComponentProps<typeof FavouriteButton>>) => {
  const root = TestRenderer.create(<FavouriteButton id="PS5" isFavorite={false} {...props} />).root;
  const [glyph] = [...root.findAll((n: any) => n.type === "Solid"), ...root.findAll((n: any) => n.type === "Outline")];
  return { type: glyph.type, color: glyph.props.color };
};

// ENG-427 D4: Saved (2089:27772) fills the card heart #635BE8.
describe("FavouriteButton", () => {
  it("tile: saved is a brand-purple solid heart, unsaved a black outline", () => {
    expect(heart({ tile: true, isFavorite: true })).toEqual({ type: "Solid", color: "#635BE8" });
    expect(heart({ tile: true })).toEqual({ type: "Outline", color: "#000000" });
  });

  it("the PDP chip keeps the red saved heart", () => {
    expect(heart({ isFavorite: true })).toEqual({ type: "Solid", color: darkColors.danger });
  });
});
