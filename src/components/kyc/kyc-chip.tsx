import type { KycIcon, KycTone } from "@/lib/kyc";
import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import {
  ClockIcon,
  ExclamationCircleIcon,
  IdentificationIcon,
  ShieldCheckIcon,
} from "react-native-heroicons/outline";
import { ShieldCheckIcon as ShieldCheckSolidIcon } from "react-native-heroicons/solid";

const ICONS = {
  shield: ShieldCheckIcon,
  "shield-solid": ShieldCheckSolidIcon,
  clock: ClockIcon,
  identification: IdentificationIcon,
  exclamation: ExclamationCircleIcon,
} as const;

/**
 * The round icon chip that carries a verification state's tone. Decorative: the words beside
 * it say the same thing, so colour is never the only signal and screen readers skip it.
 * There is no danger tone on purpose. Nothing here says the merchant did something wrong.
 */
export function KycChip({ icon, tone, size = 40 }: { icon: KycIcon; tone: KycTone; size?: number }) {
  const { color } = useTheme();
  const fill = { brand: color.brandWash, info: color.infoWash, warning: color.warningWash }[tone];
  const ink = { brand: color.brandText, info: color.info, warning: color.warning }[tone];
  const Icon = ICONS[icon];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: radius.full,
        backgroundColor: fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={Math.round(size * 0.55)} color={ink} />
    </View>
  );
}
