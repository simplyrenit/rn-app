import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";

// STUB (ENG-426 foundation): the public API below is final; Group C replaces the
// body with the kit neutral map tile (figma/00 2100:29942), for state frames and
// design fixtures where a live map cannot render.

export interface MapPlaceholderProps {
  /** Size and position; the tile fills whatever box it is given. */
  style?: StyleProp<ViewStyle>;
}

export function MapPlaceholder({ style }: MapPlaceholderProps) {
  return <View accessible={false} style={[{ backgroundColor: "#EFF0F1" }, style]} />;
}
