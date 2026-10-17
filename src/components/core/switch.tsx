import { switchInset } from "@/lib/switch";
import React from "react";
import { Platform, Switch, SwitchProps } from "react-native";

const INSET = switchInset(Platform.OS, Platform.Version);

/**
 * The app's switch: React Native's, kept in line with its row. On iOS 26 the native switch is wider than the frame the layout
 * reserves and stuck out past the right margin (`switchInset`); this gives it that room.
 */
export function AppSwitch({ style, ...props }: SwitchProps) {
  return <Switch {...props} style={[INSET ? { marginRight: INSET } : null, style]} />;
}
