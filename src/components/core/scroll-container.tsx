import { useTheme } from "@/lib/theme";
import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";

interface Props {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Supply both to give the screen pull-to-refresh. */
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ScrollContainer({
  children,
  containerStyle,
  onRefresh,
  refreshing = false,
}: Props) {
  const { color } = useTheme();

  return (
    <ScrollView
      nestedScrollEnabled
      // Without this, the first tap while a keyboard is open is swallowed to
      // dismiss it and never reaches the button underneath, so every submit
      // needs two taps.
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[{ flexGrow: 1, paddingVertical: 20 }, containerStyle]}
      style={{ backgroundColor: color.canvas }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color.textBody}
            colors={[color.brand]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
