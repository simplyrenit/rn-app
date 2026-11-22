import Svg, { Path, Rect } from "react-native-svg";

/**
 * The Post tab's glyph in the design: a plus inside a rounded square. It is the
 * design's own "PlusSquare" component, not the round plus the tab bar used to
 * borrow from the icon set — the square is 21.5pt outside edge to outside edge
 * where the circle was 19.5.
 */
export const PlusSquareIcon = ({
  size = 24,
  color = "black",
  filled = false,
  edge = "white",
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="2"
      y="2"
      width="20"
      height="20"
      rx="4.75"
      stroke={color}
      strokeWidth="1.5"
      // `filled` draws the square solid with the plus knocked out in `edge`. The
      // active Post tab no longer uses it: the 2.1 kit's solid square is smaller
      // (PlusSquareIconSolid, below).
      fill={filled ? color : "none"}
    />
    <Path
      d="M12 7V17M7 12H17"
      stroke={filled ? edge : color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </Svg>
);

/**
 * The active Post tab, drawn from the 2.1 kit's `icon/solid/plus-square`
 * (figma/00 2110:30274): an 18pt r4 square with the plus knocked out as two
 * 10×2 r1 bars. It is smaller than the outline square above (18 vs 21.5) on
 * purpose, as the kit draws it. `edge` is the knockout: pass the bar's canvas
 * so the plus stays the page colour in dark mode too.
 */
export const PlusSquareIconSolid = ({ size = 24, color = "black", edge = "white" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="4" fill={color} />
    <Rect x="7" y="11" width="10" height="2" rx="1" fill={edge} />
    <Rect x="11" y="7" width="2" height="10" rx="1" fill={edge} />
  </Svg>
);
