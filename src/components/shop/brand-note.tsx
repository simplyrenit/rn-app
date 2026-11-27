import { Text } from "@/components/core";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { ClockIcon } from "react-native-heroicons/outline";

const ICONS = { clock: ClockIcon } as const;

/**
 * The 08 frames' brand-tint note (`Notice · … (brand)`, 2091:20977 and 2093:21585): a `brandPanel` card, r12,
 * padded 16, a 20 brand glyph and one SemiBold 14/20 line beside it, 12 apart, centred on each other. The
 * `booking/parts` Notice draws its brand tone as info blue, so the shop's own notes use this one.
 */
export function BrandNote({ icon, children }: { icon: "clock"; children: string }) {
  const { color } = useTheme();
  const Icon = ICONS[icon];
  return (
    <View
      style={{
        alignSelf: "stretch",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: color.brandPanel,
      }}
    >
      <Icon size={20} color={color.brandText} strokeWidth={1.5} />
      <Text fontSize="text-sm" fontWeight="font-semibold" lineHeight={20} style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
