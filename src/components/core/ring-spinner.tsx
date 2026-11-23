import { useTheme } from "@/lib/theme";
import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface Props {
  /** Outer diameter in pt. Default 40 (figma/02 Terms and Location). */
  size?: number;
  /** False draws the frame's still pose (design fixtures), so a screenshot settles. */
  spinning?: boolean;
}

/**
 * The 2.1 loading ring (figma/02 2089:28228): a full `brandPanel` track and a `brand` arc of 270°, from
 * 12 o'clock clockwise to 9 o'clock (arcData −π/2 → π), with butt ends. The ring is 16% of the radius thick
 * (innerRadius 0.84), so 3.2 at 40. Imported by path, not through the barrel.
 */
export function RingSpinner({ size = 40, spinning = true }: Props) {
  const { color } = useTheme();
  const turn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spinning) {
      turn.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [spinning, turn]);

  const stroke = size * 0.08;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ width: size, height: size, transform: [{ rotate }] }}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.brandPanel} strokeWidth={stroke} fill="none" />
        {/* SVG strokes start at 3 o'clock and run clockwise; −90° starts the arc at 12. */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color.brand}
          strokeWidth={stroke}
          strokeDasharray={`${c * 0.75} ${c}`}
          strokeLinecap="butt"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </Animated.View>
  );
}
