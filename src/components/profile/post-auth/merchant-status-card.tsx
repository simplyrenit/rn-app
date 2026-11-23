import { Button, StatusPill, Text, type StatusTone } from "@/components/core";
import { merchantStatusLabel } from "@/lib/shop";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

const TONE: Record<string, StatusTone> = { approved: "success", pending: "warning", rejected: "danger" };

interface MerchantStatusCardProps {
  status: string | null | undefined;
  onRequestReview: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * A merchant's approval status (2095:26235): not boxed (REVIEW b3-02). A "Merchant status" line with its pill, the
 * listings note until approved, and for a rejected shop "Request review again" with the error line under it.
 */
export function MerchantStatusCard({ status, onRequestReview, loading, error }: MerchantStatusCardProps) {
  const { color } = useTheme();
  const label = merchantStatusLabel(status);

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text fontSize="text-md" fontWeight="font-semibold">
          Merchant status
        </Text>
        {label ? <StatusPill label={label} tone={TONE[status ?? ""] ?? "neutral"} /> : null}
      </View>
      {status !== "approved" && (
        <Text fontSize="text-sm" tone="body">
          Listings will be enabled after merchant approval.
        </Text>
      )}
      {status === "rejected" && (
        <View style={{ paddingTop: 8 }}>
          <Button
            variant="outline"
            size="compact"
            onPress={onRequestReview}
            disabled={loading}
            style={{ alignSelf: "stretch" }}
          >
            {loading ? "Requesting review..." : "Request review again"}
          </Button>
        </View>
      )}
      {status === "rejected" && error ? (
        <Text fontSize="text-xs" fontWeight="font-medium" style={{ color: color.dangerStrong }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
