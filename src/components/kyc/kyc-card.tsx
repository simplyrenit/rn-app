import { useKycBadgeSync, useKycStatus } from "@/backend/kyc";
import { Button, Skeleton, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import { hasVerificationData, kycStateCopy } from "@/lib/kyc";
import { useTheme } from "@/lib/theme";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import { KycChip } from "./kyc-chip";

// The kit KYC card (2095:26508): r12, 1pt `line` border, padding 16 inside it (the chip sits at 17), a 40 chip, gap
// 12 to the text column, title 16/24 SemiBold, body 14/20 at 70% (gap 2), and the CTA as Secondary tonal 44 with 8
// above it. The skeleton keeps its pre-2.1 height (unchanged by this story).
const CARD_RADIUS = 12;
const SKELETON_HEIGHT = 76;

/**
 * The Profile entry point to business verification. For anyone else, the ID check (ENG-351), and only
 * once they have one on file: it is taken from a booking, and its consent text promises that it can be
 * removed from Profile.
 *
 * It reads the live status, because the profile payload carries only the badge. It never
 * shows an error: if the status cannot be read (an API from before verification, or an
 * account the server does not treat as a business) the card is simply absent.
 *
 * `style` places the card (margins); it is applied only when the card draws, so an absent card leaves no gap.
 */
export function KycCard({ isDark, style }: { isDark: boolean; style?: StyleProp<ViewStyle> }) {
  const navigation = useTypedNavigation();
  const { userDetails } = useGlobalContext();
  const { color } = useTheme();
  const { data, errorUpdatedAt } = useKycStatus();
  useKycBadgeSync(data);

  const person = userDetails?.account_type !== "merchant";
  if (person && !(data && hasVerificationData(data))) return null;
  if (!data) {
    // Absent once a read has failed (and it stays absent while that read is retried); a card
    // that has shown a status keeps showing it through a failed refresh.
    if (errorUpdatedAt) return null;
    return (
      <View style={style}>
        <Skeleton height={SKELETON_HEIGHT} borderRadius={CARD_RADIUS} />
      </View>
    );
  }

  const copy = kycStateCopy(data.kyc_status, data.reason_code, person);
  // A merchant with nothing on file starts at the explanation. Anyone else sees where it stands,
  // which is also where a timed-out verification's data can be removed.
  const open = () =>
    hasVerificationData(data)
      ? navigation.navigate("KycStatus")
      : navigation.navigate("KycIntro", { source: "profile" });

  return (
    <TouchableOpacity
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${copy.cardTitle}. ${copy.cardBody}`}
      activeOpacity={0.7}
      style={[
        {
          minHeight: MIN_TOUCH_TARGET,
          flexDirection: "row",
          gap: 12,
          padding: 16,
          borderRadius: CARD_RADIUS,
          borderWidth: 1,
          borderColor: color.line,
          backgroundColor: color.surface,
        },
        style,
      ]}
    >
      <KycChip icon={copy.icon} tone={copy.tone} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-semibold">
          {copy.cardTitle}
        </Text>
        <Text tone="body" fontSize="text-sm">
          {copy.cardBody}
        </Text>
        {copy.cta && copy.ctaKind !== "profile" ? (
          // The whole card is the control; this repeats it for the eye only.
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{ paddingTop: 8, alignSelf: "flex-start" }}
          >
            <Button variant="outline" tone="tonal" size="compact" onPress={open} accessible={false}>
              {copy.cta}
            </Button>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
