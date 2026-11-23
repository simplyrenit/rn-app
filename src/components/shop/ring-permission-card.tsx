import type { RingPermissionControl } from "@/backend/ring-permission";
import { Button, Text } from "@/components/core";
import { ringNotice } from "@/lib/ring-permission";
import { useTheme } from "@/lib/theme";
import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { BellIcon, BellSlashIcon } from "react-native-heroicons/outline";

/**
 * The warning for a phone that will not ring: why, and the one control that fixes it
 * (the system's prompt, or the phone's settings once the system will not ask again).
 * It shows only for a shop whose requests will ring (`enabled`), and the first time it
 * does it also asks, so the owner is asked in the shop's own flow with the reason in
 * front of them. Nothing shows once this phone can ring.
 *
 * Two drawings of the same card, both `warningWash`, r12, padded 16:
 * - `stacked` (default; 2097:31046, the listing flow and the settings screens): a 22 bell-slash and the 16/24 title
 *   in a row, the 14/20 body, then a 44 outline button, 8 apart.
 * - `inline` (Today, 2083:16603 / 2091:20870, the kit Notice card): a 20 bell beside a column of the 14/20 title,
 *   body and a SemiBold text link, 4 apart.
 */
export function RingPermissionCard({
  enabled,
  permission,
  layout = "stacked",
}: {
  enabled: boolean;
  permission: RingPermissionControl;
  layout?: "inline" | "stacked";
}) {
  const { color } = useTheme();
  const { state, askOnce, ask, openSettings } = permission;
  const notice = ringNotice(state);

  useEffect(() => {
    if (enabled && state === "ask") void askOnce();
  }, [enabled, state, askOnce]);

  if (!enabled || !notice) return null;
  const act = () => void (notice.action === "turn_on" ? ask() : openSettings());
  const card = { padding: 16, borderRadius: 12, backgroundColor: color.warningWash } as const;

  if (layout === "inline") {
    return (
      <View accessible={false} accessibilityRole="alert" style={[card, { flexDirection: "row", gap: 12 }]}>
        <BellIcon size={20} color={color.warning} strokeWidth={1.5} />
        <View style={{ flex: 1, gap: 4, alignItems: "flex-start" }}>
          <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20}>
            {notice.title}
          </Text>
          <Text fontSize="text-sm" lineHeight={20} tone="body">
            {notice.body}
          </Text>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.6} hitSlop={12} onPress={act}>
            <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} tone="brand">
              {notice.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View accessible={false} accessibilityRole="alert" style={[card, { gap: 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <BellSlashIcon size={22} color={color.warning} strokeWidth={1.375} />
        <Text fontSize="text-md" fontWeight="font-semibold" lineHeight={24} style={{ flex: 1 }}>
          {notice.title}
        </Text>
      </View>
      <Text fontSize="text-sm" lineHeight={20} tone="body">
        {notice.body}
      </Text>
      <Button variant="outline" size="compact" onPress={act}>
        {notice.label}
      </Button>
    </View>
  );
}
