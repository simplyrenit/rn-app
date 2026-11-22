import Svg, { Rect } from "react-native-svg";

/**
 * The active Rentals tab, drawn from the 2.1 kit's
 * `icon/solid/clipboard-document` (figma/00 2110:30278). The heroicons solid
 * clipboard is a different drawing, so the kit's rects are copied as they are.
 *
 * The clip on top carries a 1.5 stroke aligned OUTSIDE in Figma; SVG centres a
 * stroke, so the clip is drawn as a knockout rect grown by 0.75 per side with
 * the clip filled on top of it. `edge` is the knockout colour: pass the bar's
 * canvas so the lines read as page colour in dark mode too.
 */
export const ClipboardDocumentIconSolid = ({ size = 24, color = "black", edge = "white" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="4" width="16" height="18" rx="3" fill={color} />
    <Rect x="7.25" y="1.25" width="9.5" height="6.5" rx="2.25" fill={edge} />
    <Rect x="8" y="2" width="8" height="5" rx="1.5" fill={color} />
    <Rect x="8" y="11" width="8" height="1.5" rx="0.75" fill={edge} />
    <Rect x="8" y="15" width="6" height="1.5" rx="0.75" fill={edge} />
  </Svg>
);
