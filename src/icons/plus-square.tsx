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
      // The selected tab is the same square filled solid with the plus knocked out
      // in the page colour (`edge`), as the design draws the active Post tab.
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
