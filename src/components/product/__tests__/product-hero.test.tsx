import { expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// @ts-expect-error -- no @types/react-test-renderer in this project.
import renderer, { act } from "react-test-renderer";

// ENG-429 pass 2: the hero is the frame's contained gallery (01 2083:15973), not an edge-to-edge photo.
jest.mock("pinar", () => {
  const { View } = require("react-native");
  return ({ children }: any) => <View testID="carousel">{children}</View>;
});
jest.mock("expo-image", () => {
  const { View } = require("react-native");
  return { Image: (props: any) => <View testID="photo" {...props} /> };
});
jest.mock("@/components/core/favourite-button", () => {
  const { View } = require("react-native");
  return { FavouriteButton: (props: any) => <View testID="heart" {...props} /> };
});
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@/components/core/back-button", () => ({ BackButton: () => null }));
jest.mock("@/components/core/icon-button", () => ({ IconButton: () => null }));
jest.mock("@/components/core/text", () => {
  const { Text } = require("react-native");
  return { Text: (props: any) => <Text {...props} /> };
});
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 54, bottom: 0, left: 0, right: 0 }) }));
jest.mock("@react-navigation/native", () => ({ NavigationContext: require("react").createContext(undefined) }));

import { GALLERY_HEIGHT, ProductHero } from "../product-hero";

const render = (images: string[]) => {
  let tree: any;
  act(() => {
    tree = renderer.create(<ProductHero productId="p" images={images} title="1984" />);
  });
  return tree.root;
};

// The mocks' own elements, not the host Views they render into.
const byTestId = (root: any, id: string) =>
  root.findAll((n: any) => typeof n.type === "function" && n.props.testID === id);
const texts = (root: any): string[] => root.findAllByType(Text).map((t: any) => [].concat(t.props.children).join(""));

it("draws the frame's gallery: 390 high, a 177×300 photo 36 down, the tile heart, 5 dots and a 1/5 pill", () => {
  const root = render(["a", "b", "c", "d", "e"]);
  expect(GALLERY_HEIGHT).toBe(390);
  const photos = byTestId(root, "photo");
  expect(photos).toHaveLength(5);
  // 300 high across the content width; `contain` puts the frame's 177×300 cover at exactly 177×300.
  expect(photos[0].props.style).toMatchObject({ height: 300, marginTop: 36 });
  expect(photos[0].props.contentFit).toBe("contain");
  expect(byTestId(root, "heart")[0].props.tile).toBe(true);
  expect(texts(root)).toContain("1/5");
  const dots = root.findAll((n: any) => typeof n.type === "string" && n.props.style?.width === 6 && n.props.style?.height === 6);
  expect(dots).toHaveLength(5);
});

it("draws no dots or count for a single photo", () => {
  const root = render(["a"]);
  expect(texts(root)).not.toContain("1/1");
  expect(root.findAll((n: any) => typeof n.type === "string" && n.props.style?.width === 6)).toHaveLength(0);
});

it("keeps the 1/5 pill inside the gallery when an earlier photo fails to load", () => {
  const root = render(["a", "b", "c", "d", "e"]);
  const carousel = root.findAll((n: any) => typeof n.type === "function" && n.props.onIndexChanged)[0];
  act(() => carousel.props.onIndexChanged({ index: 4 }));
  act(() => byTestId(root, "photo")[0].props.onError());
  expect(texts(root)).toContain("4/4");
});
