import { useGlobalContext } from "@/context/global-context";
import Svg, { Path, Rect } from "react-native-svg";
import { ink } from "@/lib/design-tokens";

export const HomeIcon = ({ size = 20, color = "white", fill = "none" }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill={fill}
    // xmlns="http://www.w3.org/2000/svg"
  >
    <Path
      d="M10.0003 14H10.0093M7.06231 2.826L1.23931 7.921C0.739309 8.358 1.07531 9.134 1.76231 9.134C2.18231 9.134 2.52331 9.449 2.52331 9.837V13.081C2.52331 15.871 2.52331 17.266 3.46231 18.133C4.40031 19 5.91031 19 8.93231 19H11.0683C14.0893 19 15.6003 19 16.5383 18.133C17.4773 17.266 17.4773 15.871 17.4773 13.081V9.837C17.4773 9.449 17.8173 9.134 18.2373 9.134C18.9253 9.134 19.2603 8.358 18.7613 7.921L12.9383 2.826C11.5473 1.61 10.8513 1 10.0003 1C9.14931 1 8.45331 1.609 7.06231 2.826Z"
      stroke={color}
      strokeOpacity="0.9"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const HomeIconSolid = ({ size = 20, color = "white" }) =>{
   const { theme } = useGlobalContext();
  
    const isDarkMode = theme === "dark";
  return (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.06231 4.826L3.23931 9.921C2.73931 10.358 3.07531 11.134 3.76231 11.134C4.18231 11.134 4.52331 11.449 4.52331 11.837V15.081C4.52331 17.871 4.52331 19.266 5.46231 20.133C6.40031 21 7.91031 21 10.9323 21H13.0683C16.0893 21 17.6003 21 18.5383 20.133C19.4773 19.266 19.4773 17.871 19.4773 15.081V11.837C19.4773 11.449 19.8173 11.134 20.2373 11.134C20.9253 11.134 21.2603 10.358 20.7613 9.921L14.9383 4.826C13.5473 3.61 12.8513 3 12.0003 3C11.1493 3 10.4533 3.609 9.06231 4.826Z"
      fill={color}
      stroke={color}
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <Rect x="11.25" y="14.5" width="1.5" height="1.5" rx="0.75" fill={ink.canvas(isDarkMode)}/>
  </Svg>
)};
