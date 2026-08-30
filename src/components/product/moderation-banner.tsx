import { View } from "react-native";
import { Text } from "../core";
import { DarkIcon, LightIcon } from "@/icons/logo";
import { density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";

interface ModerationBannerProps {
  moderationLabels: string[];
}

export function ModerationBanner({ moderationLabels }: ModerationBannerProps) {
  const { color, isDark } = useTheme();

  const icon = isDark ? <DarkIcon size={20} /> : <LightIcon size={20} />;

  return (
    // Was `bg-danger-wash-light` and `border-danger-light` with a
    // `text-muted-light` caption — the light-theme tokens hardcoded, so in dark
    // mode this was a pale pink card on a near-black canvas. Tokens resolve per
    // theme.
    <View
      style={{
        backgroundColor: color.dangerWash,
        borderWidth: 1,
        borderColor: color.danger,
        borderRadius: radius.group,
        padding: density.block,
        marginBottom: density.section,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.full,
            backgroundColor: color.surface,
          }}
        >
          {icon}
        </View>
        {/* The caption used to read "9 hours ago" on every banner, for every
            listing — a hardcoded string presented as a fact about this one. */}
        <Text fontSize="text-sm" fontWeight="font-bold">
          Renit review
        </Text>
      </View>

      <Text fontSize="text-sm" tone="hi">
        {moderationLabels.length
          ? `This listing is hidden from renters while we check it: ${moderationLabels.join(
              ", "
            )}.`
          : "This listing is hidden from renters while we check it."}
      </Text>
      <Text fontSize="text-sm" tone="body">
        Editing the photos or the description sends it back for another look.
      </Text>
    </View>
  );
}
