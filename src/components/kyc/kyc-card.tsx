import { useKycBadgeSync, useKycStatus } from "@/backend/kyc";
import { Button, Skeleton, Text } from "@/components/core";
import { useGlobalContext } from "@/context/global-context";
import { MIN_TOUCH_TARGET, space } from "@/lib/design-tokens";
import { hasVerificationData, kycChecks, kycStateCopy, kycValidity } from "@/lib/kyc";
import { useTypedNavigation } from "@/lib/types";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { KycChip } from "./kyc-chip";

const CARD_HEIGHT = 76;

/**
 * Profile's KYC section, for every account (ENG-446): a business's verification, or anyone else's
 * ID check. It shows where the check stands, "Verified on" and "Valid until", and from 30 days
 * before expiry a warning with Re-verify. Re-verifying keeps the current check valid until the new
 * one is decided, so it never blocks a booking.
 *
 * It reads the live status, because the profile payload carries only the badge. It never
 * shows an error: if the status cannot be read (an API from before verification) the card is
 * simply absent.
 */
export function KycCard({ isDark }: { isDark: boolean }) {
  const navigation = useTypedNavigation();
  const { userDetails } = useGlobalContext();
  const { data, errorUpdatedAt } = useKycStatus();
  useKycBadgeSync(data);

  const person = userDetails?.account_type !== "merchant";
  if (!data) {
    // Absent once a read has failed (and it stays absent while that read is retried); a card
    // that has shown a status keeps showing it through a failed refresh.
    if (errorUpdatedAt) return null;
    return (
      <View className="px-gutter">
        <Skeleton height={CARD_HEIGHT} borderRadius={16} style={{ marginBottom: 16 }} />
      </View>
    );
  }

  const copy = kycStateCopy(data.kyc_status, data.reason_code, person, data.valid_months);
  const validity = kycValidity(data);
  const reverify = Boolean(data.can_reverify);
  const cta = reverify ? "Re-verify" : copy.cta && copy.ctaKind !== "profile" ? copy.cta : null;
  // Nothing on file starts at the explanation, and so does Re-verify. Anyone else sees where it
  // stands, which is also where a timed-out verification's data can be removed.
  const open = () =>
    reverify
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
  const warning =
    validity?.soon && reverify
      ? `Expires in ${validity.daysLeft} ${validity.daysLeft === 1 ? "day" : "days"}. Re-verify now; your current check stays valid until the new one is decided.`
      : null;

  return (
    <View className="px-gutter">
      <Text fontWeight="font-bold" accessibilityRole="header" style={{ marginBottom: space.sm }}>
        KYC
      </Text>
      <TouchableOpacity
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={[copy.cardTitle, copy.cardBody, dates, warning].filter(Boolean).join(". ")}
        activeOpacity={0.7}
        style={{ minHeight: MIN_TOUCH_TARGET }}
        className={`mb-4 flex-row rounded-card border px-4 py-3 ${
          isDark ? "border-line-dark bg-surface-dark" : "border-line-light bg-surface-light"
        }`}
      >
        <KycChip icon={warning ? "exclamation" : copy.icon} tone={warning ? "warning" : copy.tone} />
        <View style={{ flex: 1, marginLeft: space.md, gap: 2 }}>
          <Text fontWeight="font-semibold">{copy.cardTitle}</Text>
          <Text tone="body" fontSize="text-sm">
            {copy.cardBody}
          </Text>
          {dates ? (
            <Text tone="dim" fontSize="text-sm">
              {dates}
            </Text>
          ) : null}
          {validity
            ? kycChecks(data, person).map((check) => (
                <Text key={check} tone="dim" fontSize="text-sm" accessibilityLabel={`${check} checked`}>
                  ✓ {check}
                </Text>
              ))
            : null}
          {warning ? (
            <Text tone="warning" fontSize="text-sm">
              {warning}
            </Text>
          ) : null}
          {cta ? (
            // The whole card is the control; this repeats it for the eye only.
            <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ marginTop: space.sm, alignSelf: "flex-start" }}>
              <Button size="compact" onPress={open} accessible={false}>
                {cta}
              </Button>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}
