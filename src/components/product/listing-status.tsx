import { Text } from "@/components/core";
import { radius, space } from "@/lib/design-tokens";
import { PendingEdit, flagLine, pendingLine } from "@/lib/listing-edit";
import {
  FlagReason,
  ListingStatus,
  STATUS_COPY,
  listingPrompts,
  statusDetail,
} from "@/lib/listing-status";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

export function listingStatusLabel(status: ListingStatus) {
  return STATUS_COPY[status].label;
}

interface PillProps {
  status: ListingStatus;
  /** A flagged listing's reasons, as the check gave them. */
  reasons?: FlagReason[] | null;
  /** Adds the one-line explanation beside the pill. */
  withDetail?: boolean;
  /** The reason in full, not cut to two lines: for the screen where the owner fixes the listing. */
  fullReason?: boolean;
}

/**
 * One status treatment for all six, on the shelf and on the listing's own page.
 * Draft and Archived are neutral, Checking is informational, Live is good news,
 * Paused asks for attention and Flagged is the one that needs action.
 *
 * Flagged says why, as the frame does ("Flagged · price"): under the pill on
 * the narrow shelf tile, in the detail line where there is room for one.
 */
export function ListingStatusPill({ status, reasons, withDetail = false, fullReason = false }: PillProps) {
  const { color } = useTheme();

  const tint = {
    draft: { fg: color.textBody, bg: color.surfaceRaised },
    checking: { fg: color.info, bg: color.infoWash },
    live: { fg: color.success, bg: color.successWash },
    paused: { fg: color.warning, bg: color.warningWash },
    flagged: { fg: color.danger, bg: color.dangerWash },
    archived: { fg: color.textBody, bg: color.surfaceRaised },
  }[status];

  const reason = status === "flagged" ? flagLine(reasons) : null;

  const pill = (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: tint.bg,
        borderRadius: radius.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text fontSize="text-xs" fontWeight="font-semibold" style={{ color: tint.fg }}>
        {STATUS_COPY[status].label}
      </Text>
    </View>
  );

  if (withDetail) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {pill}
        <Text fontSize="text-sm" tone="body" numberOfLines={2} style={{ flex: 1 }}>
          {statusDetail(status, reasons)}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 2 }}>
      {pill}
      {reason ? (
        <Text fontSize={fullReason ? "text-sm" : "text-xs"} tone="body" numberOfLines={fullReason ? undefined : 2}>
          {reason}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * What the owner still has to do on a listing: "Confirm your price" on a moved
 * one, "Needs worth" on one with none (ENG-155). Draws nothing when there is none.
 */
export function ListingPrompts({
  product,
}: {
  product: { rate_needs_confirming?: boolean; needs_worth?: boolean; worth?: string | null };
}) {
  const prompts = listingPrompts(product);
  if (prompts.length === 0) return null;
  return (
    <View style={{ gap: 2 }}>
      {prompts.map((prompt) => (
        <Text key={prompt} fontSize="text-xs" fontWeight="font-bold" tone="warning">
          {prompt}
        </Text>
      ))}
    </View>
  );
}

/**
 * A change that waits over the version customers still see (decision T-34): which fields, and why. Draws nothing when
 * no change waits. `compact` is one small line, for a tile on the shelf.
 */
export function HeldChange({ pending, compact = false }: { pending: PendingEdit | null | undefined; compact?: boolean }) {
  const { color } = useTheme();
  const line = pendingLine(pending);
  if (!pending || !line) return null;
  if (compact) {
    return (
      <Text fontSize="text-xs" tone="warning" numberOfLines={3}>
        {line}
      </Text>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={`A change is waiting. ${line}`}
      style={{
        gap: space.xs,
        padding: space.md,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: color.warning,
        backgroundColor: color.warningWash,
      }}
    >
      <Text fontSize="text-md" fontWeight="font-bold">
        {pending.state === "checking" ? "Your change is being checked" : "A change of yours is on hold"}
      </Text>
      <Text fontSize="text-sm" tone="body">
        {line}
      </Text>
    </View>
  );
}
