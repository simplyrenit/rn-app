import { useKycBadgeSync, useKycStatus } from "@/backend/kyc";
import { Button, Skeleton, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET } from "@/lib/design-tokens";
import { hasVerificationData, kycChecks, kycStateCopy, kycValidity } from "@/lib/kyc";
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
 * Profile's KYC section, for every account (ENG-446): a business's verification, or anyone else's
 * ID check. It shows where the check stands, "Verified on" and "Valid until", and from 30 days
 * before expiry a warning with Re-verify. Re-verifying keeps the current check valid until the new
 * one is decided, so it never blocks a booking.
 *
 * It reads the live status, because the profile payload carries only the badge. It never
 * shows an error: if the status cannot be read (an API from before verification) the card is
 * simply absent.
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

  const copy = kycStateCopy(data.kyc_status, data.reason_code, person, data.valid_months);
  const validity = kycValidity(data);
  const reverify = Boolean(data.can_reverify);
  const cta = reverify ? "Re-verify" : copy.cta && copy.ctaKind !== "profile" ? copy.cta : null;
  // Nothing on file starts at the explanation, and so does Re-verify. Anyone else sees where it
  // stands, which is also where a timed-out verification's data can be removed.
  // An expired check also starts again at the intro: its old case is still on file, so it would
  // otherwise open the status screen first.
  const open = () =>
    reverify || data.reason_code === "kyc_expired"
      ? navigation.navigate("KycIntro", { source: "reverify" })
      : !hasVerificationData(data)
      ? navigation.navigate("KycIntro", { source: "profile" })
      : navigation.navigate("KycStatus");
  const dates = validity
    ? [validity.verifiedOn && `Verified on ${validity.verifiedOn}`, `Valid until ${validity.validUntil}`]
        .filter(Boolean)
        .join(" · ")
    : null;
  // A re-verification already open (can_reverify false) is told where it stands by the copy, not
  // asked to re-verify again.
  const checks = validity ? kycChecks(data, person) : [];
  const warning =
    validity?.soon && reverify
      ? `Expires in ${validity.daysLeft} ${validity.daysLeft === 1 ? "day" : "days"}. Re-verify now; your current check stays valid until the new one is decided.`
      : null;

  return (
    <TouchableOpacity
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={[copy.cardTitle, copy.cardBody, dates, ...checks.map((c) => `${c} checked`), warning]
        .filter(Boolean)
        .join(". ")}
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
      <KycChip icon={warning ? "exclamation" : copy.icon} tone={warning ? "warning" : copy.tone} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-semibold">
          {copy.cardTitle}
        </Text>
        <Text tone="body" fontSize="text-sm">
          {copy.cardBody}
        </Text>
        {/* ENG-446: validity dates, what was checked, and the expiry warning (2.1 look pending the KYC frames). */}
        {dates ? (
          <Text tone="dim" fontSize="text-sm">
            {dates}
          </Text>
        ) : null}
        {checks.map((check) => (
          <Text key={check} tone="dim" fontSize="text-sm">
            ✓ {check}
          </Text>
        ))}
        {warning ? (
          <Text tone="warning" fontSize="text-sm">
            {warning}
          </Text>
        ) : null}
        {cta ? (
          // The whole card is the control; this repeats it for the eye only.
          <View
            accessible={false}
            importantForAccessibility="no-hide-descendants"
            style={{ paddingTop: 8, alignSelf: "flex-start" }}
          >
            <Button variant="outline" tone="tonal" size="compact" onPress={open} accessible={false}>
              {cta}
            </Button>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}
