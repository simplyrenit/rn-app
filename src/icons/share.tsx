import React from "react";
import Svg, { Path } from "react-native-svg";

interface Props {
  size?: number;
  color: string;
  strokeWidth?: number;
}

/**
 * The iOS share glyph: a square with an arrow leaving the top.
 *
 * Heroicons' ShareIcon is the Android three-node graph. On an iPhone that
 * single glyph is one of the loudest "this app was ported" signals there is,
 * and it sits on the product page — the growth loop that matters most to a
 * marketplace.
 */
export function IOSShareIcon({ size = 22, color, strokeWidth = 1.8 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* The box */}
      <Path
        d="M8.25 10.5H6.75A1.75 1.75 0 0 0 5 12.25v6A1.75 1.75 0 0 0 6.75 20h10.5A1.75 1.75 0 0 0 19 18.25v-6a1.75 1.75 0 0 0-1.75-1.75h-1.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The shaft */}
      <Path
        d="M12 14.25V4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The head */}
      <Path
        d="M8.5 7.25 12 3.75l3.5 3.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
