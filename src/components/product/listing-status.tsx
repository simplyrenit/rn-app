import { Text } from "@/components/core";
import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

export type ListingStatus = "live" | "pending" | "rejected" | "flagged";

interface Source {
  moderationLabels?: string[] | null;
  /** Only the owner-facing endpoints return this; undefined means "not known". */
  adminApproved?: boolean | null;
}

/**
 * A listing was only ever labelled when something was wrong with it: flagged
 * listings got an overlay, unapproved ones a "Pending" pill, and a live listing
 * got nothing at all — so the owner had to infer "this is visible to renters"
 * from the absence of a badge, which is indistinguishable from a bug.
 *
 * Returns null rather than guessing when approval state was not in the payload,
 * because "Pending" on a listing that is actually live is worse than silence.
 */
export function resolveListingStatus({
  moderationLabels,
  adminApproved,
}: Source): ListingStatus | null {
  if (moderationLabels && moderationLabels.length > 0) return "flagged";
  if (adminApproved === true) return "live";
  if (adminApproved === false) return "rejected";
  if (adminApproved === null) return "pending";
  return null;
}

const COPY: Record<ListingStatus, { label: string; detail: string }> = {
  live: { label: "Live", detail: "Visible to renters" },
  pending: { label: "Pending review", detail: "Not visible to renters yet" },
  rejected: { label: "Rejected", detail: "Not visible to renters" },
  flagged: { label: "Flagged", detail: "Hidden until this is resolved" },
};

export function listingStatusLabel(status: ListingStatus) {
  return COPY[status].label;
}

interface PillProps {
  status: ListingStatus;
  /** Adds the one-line explanation beside the pill. */
  withDetail?: boolean;
}

/** One status treatment, on the shelf and on the listing's own page. */
export function ListingStatusPill({ status, withDetail = false }: PillProps) {
  const { color } = useTheme();

  const tint =
    status === "live"
      ? { fg: color.success, bg: color.successWash }
      : status === "pending"
      ? { fg: color.warning, bg: color.warningWash }
      : { fg: color.danger, bg: color.dangerWash };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: tint.bg,
          borderRadius: radius.full,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}
      >
        <Text
          fontSize="text-xs"
          fontWeight="font-semibold"
          style={{ color: tint.fg }}
        >
          {COPY[status].label}
        </Text>
      </View>
      {withDetail ? (
        <Text fontSize="text-sm" tone="body" numberOfLines={1} style={{ flex: 1 }}>
          {COPY[status].detail}
        </Text>
      ) : null}
    </View>
  );
}
