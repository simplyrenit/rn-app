import { useTheme } from "@/lib/theme";
import React from "react";
import { DimensionValue, StyleProp, View, ViewStyle } from "react-native";

// The kit neutral map tile (figma/00 2100:29942), for state frames and design
// fixtures where a live map cannot render. Static: no MapView, no location.

export interface MapPlaceholderProps {
  /** Size and position; the tile fills whatever box it is given. */
  style?: StyleProp<ViewStyle>;
}

// The kit tile is 300×300; each shape is placed as a share of that, so the tile
// stretches to any box. The colours are an illustration, not tokens: the dark
// set is the same picture at night, chosen by eye (dark mode is not diffed).
const palette = {
  light: { ground: "#EFF0F1", park: "#D6EBD9", water: "#CCE0F5", block: "#E8E9EB", road: "#FFFFFF" },
  dark: { ground: "#1E1F21", park: "#1F3324", water: "#1B2C40", block: "#2A2B2E", road: "#3A3B3F" },
};

type Fill = keyof typeof palette.light;

const pct = (n: number): DimensionValue => `${(n / 300) * 100}%`;

/** [x, y, w, h, radius, fill] in the kit's 300pt frame, in its paint order. */
const shapes: [number, number, number, number, number, Fill][] = [
  [20, 20, 85, 60, 8, "park"],
  [190, 210, 110, 90, 0, "water"],
  [165, 30, 100, 55, 6, "block"],
  [30, 165, 80, 75, 6, "block"],
  [0, 125, 300, 11, 0, "road"],
  [140, 0, 9, 300, 0, "road"],
  [0, 235, 300, 6, 0, "road"],
  [70, 0, 6, 300, 0, "road"],
  [230, 0, 6, 300, 0, "road"],
  [0, 60, 300, 6, 0, "road"],
];

export function MapPlaceholder({ style }: MapPlaceholderProps) {
  const { isDark } = useTheme();
  const fill = isDark ? palette.dark : palette.light;
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={[{ backgroundColor: fill.ground, overflow: "hidden" }, style]}
    >
      {shapes.map(([x, y, width, height, borderRadius, key], index) => (
        <View
          key={index}
          style={{
            position: "absolute",
            left: pct(x),
            top: pct(y),
            width: pct(width),
            height: pct(height),
            borderRadius,
            backgroundColor: fill[key],
          }}
        />
      ))}
      {/* The diagonal road: 450×8, rising left to right at 28°, centred on
          (150, 157) — Figma's +28° is anticlockwise, RN's is clockwise. */}
      <View
        style={{
          position: "absolute",
          left: pct(-75),
          top: pct(153),
          width: pct(450),
          height: pct(8),
          backgroundColor: fill.road,
          transform: [{ rotate: "-28deg" }],
        }}
      />
    </View>
  );
}
