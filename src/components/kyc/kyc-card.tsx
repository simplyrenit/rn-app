import { useKycBadgeSync, useKycStatus } from "@/backend/kyc";
import { Button, Skeleton, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, space } from "@/lib/design-tokens";
import { kycStateCopy } from "@/lib/kyc";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { KycChip } from "./kyc-chip";

const CARD_HEIGHT = 76;

/**
 * The Profile entry point to business verification. Business accounts only.
 *
 * It reads the live status, because the profile payload carries only the badge. It never
 * shows an error: if the status cannot be read (an API from before verification, or an
 * account the server does not treat as a business) the card is simply absent.
 */
export function KycCard({ isDark }: { isDark: boolean }) {
  const navigation = useTypedNavigation();
  const { userDetails } = useGlobalContext();
  const { data, isLoading, isError } = useKycStatus();
  useKycBadgeSync(data);

  if (userDetails?.account_type !== "merchant" || isError) return null;
  if (isLoading || !data) {
    return (
      <View className="px-gutter">
        <Skeleton height={CARD_HEIGHT} borderRadius={16} style={{ marginBottom: 16 }} />
      </View>
    );
  }

  const copy = kycStateCopy(data.kyc_status, data.reason_code);
  // A merchant with nothing on file starts at the explanation; anyone else sees where it stands.
  const open = () =>
    data.kyc_status === "none"
      ? navigation.navigate("KycIntro", { source: "profile" })
      : navigation.navigate("KycStatus");

  return (
    <View className="px-gutter">
      <TouchableOpacity
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${copy.cardTitle}. ${copy.cardBody}`}
        activeOpacity={0.7}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        className={`mb-4 flex-row rounded-card border px-4 py-3 ${
          isDark ? "border-line-dark bg-surface-dark" : "border-line-light bg-surface-light"
        }`}
      >
        <KycChip icon={copy.icon} tone={copy.tone} />
        <View style={{ flex: 1, marginLeft: space.md, gap: 2 }}>
          <Text fontWeight="font-semibold">{copy.cardTitle}</Text>
          <Text tone="body" fontSize="text-sm">
            {copy.cardBody}
          </Text>
          {copy.cta && copy.ctaKind !== "profile" ? (
            // The whole card is the control; this repeats it for the eye only.
            <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ marginTop: space.sm, alignSelf: "flex-start" }}>
              <Button size="compact" onPress={open} accessible={false}>
                {copy.cta}
              </Button>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}
