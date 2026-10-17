import type { RingPermissionControl } from "@/backend/ring-permission";
import { Button, Text } from "@/components/core";
import { radius, space } from "@/lib/design-tokens";
import { ringNotice } from "@/lib/ring-permission";
import { useTheme } from "@/lib/theme";
import React, { useEffect } from "react";
import { View } from "react-native";
import { BellSlashIcon } from "react-native-heroicons/outline";

/**
 * The warning for a phone that will not ring: why, and the one button that fixes it
 * (the system's prompt, or the phone's settings once the system will not ask again).
 * It shows only for a shop whose requests will ring (`enabled`), and the first time it
 * does it also asks, so the owner is asked in the shop's own flow with the reason in
 * front of them. Nothing shows once this phone can ring.
 */
export function RingPermissionCard({ enabled, permission }: { enabled: boolean; permission: RingPermissionControl }) {
  const { color } = useTheme();
  const { state, askOnce, ask, openSettings } = permission;
  const notice = ringNotice(state);

  useEffect(() => {
    if (enabled && state === "ask") void askOnce();
  }, [enabled, state, askOnce]);

  if (!enabled || !notice) return null;
  return (
    <View
      accessible={false}
      accessibilityRole="alert"
      style={{
        gap: space.sm,
        padding: space.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: color.warning,
        backgroundColor: color.warningWash,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <BellSlashIcon size={22} color={color.warning} />
        <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
          {notice.title}
        </Text>
      </View>
      <Text fontSize="text-sm" tone="body">
        {notice.body}
      </Text>
      <Button variant="outline" onPress={() => void (notice.action === "turn_on" ? ask() : openSettings())}>
        {notice.label}
      </Button>
    </View>
  );
}
