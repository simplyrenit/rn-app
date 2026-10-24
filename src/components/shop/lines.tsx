import { Panel } from "@/components/booking/parts";
import { Text } from "@/components/core";
import { radius, space } from "@/lib/design-tokens";
import { ChipTone, LineRow } from "@/lib/shop-lines";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { ExclamationTriangleIcon, InformationCircleIcon } from "react-native-heroicons/outline";

/** An item's state on every owner screen: "Accepted", "Not available · dates blocked", "No longer free" (FIXES-r1 §3). */
export function LineChip({ label, tone }: { label: string; tone: ChipTone | "info" }) {
  const { color } = useTheme();
  const tint = {
    success: { fg: color.success, bg: color.successWash },
    danger: { fg: color.danger, bg: color.dangerWash },
    info: { fg: color.brandText, bg: color.brandWash },
    neutral: { fg: color.textBody, bg: color.surfaceRaised },
  }[tone];
  const Icon = tone === "danger" ? ExclamationTriangleIcon : tone === "neutral" ? InformationCircleIcon : null;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.full,
        // A 1 px border in its tone, so it reads in dark too (Figma ruling G15).
        borderWidth: 1,
        borderColor: tint.fg,
        backgroundColor: tint.bg,
      }}
    >
      {Icon ? <Icon size={14} color={tint.fg} /> : null}
      <Text fontSize="text-xs" fontWeight="font-bold" style={{ color: tint.fg }}>
        {label}
      </Text>
    </View>
  );
}

/** A line's money, struck through once it is out of the booking (G12: no dimming). */
export function LineMoney({ earn, deposit, off }: { earn: string; deposit: string; off: boolean }) {
  const strike = off ? ({ textDecorationLine: "line-through" } as const) : undefined;
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.sm }}>
      <Text fontSize="text-md" fontWeight="font-bold" tone={off ? "dim" : "default"} style={strike}>
        {earn}
      </Text>
      <Text fontSize="text-sm" tone="body" style={strike}>
        {deposit}
      </Text>
    </View>
  );
}

/**
 * MR-07: the booking's items, each with its state, deposit share, its record and what the shop earns from it, then the
 * delivery fee and the total. There is no cancel per item (D46): the whole booking is cancelled from the page.
 */
export function ItemsTable({
  rows,
  records,
  delivery,
  earn,
  title,
}: {
  rows: LineRow[];
  /** Each item's record, by line id: "Not started", "In progress", "Recorded". */
  records?: Record<number, { label: string; tone: ChipTone | "info" }>;
  delivery: string | null;
  earn: string;
  title: string;
}) {
  const { color } = useTheme();
  const border = { borderTopWidth: 1, borderTopColor: color.line } as const;
  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      <Panel>
        {rows.map((row, index) => (
          <View
            key={row.id}
            accessible
            accessibilityLabel={[row.title, row.ref, row.chip?.label, row.meta, `You earn ${row.earn}`, row.deposit]
              .filter(Boolean)
              .join(". ")}
            style={[{ padding: space.md, gap: space.xs }, index === 0 ? null : border]}
          >
            <View style={{ flexDirection: "row", gap: space.sm }}>
              <Text fontSize="text-md" fontWeight="font-bold" tone={row.off ? "dim" : "default"} style={{ flex: 1 }}>
                {row.title}
              </Text>
              <Text
                fontSize="text-md"
                fontWeight="font-bold"
                tone={row.off ? "dim" : "default"}
                style={row.off ? { textDecorationLine: "line-through" } : undefined}
              >
                {row.earn}
              </Text>
            </View>
            <Text fontSize="text-sm" tone="body">
              {row.ref}
              {" · "}
              <Text fontSize="text-sm" tone="body" style={row.off ? { textDecorationLine: "line-through" } : undefined}>
                {row.deposit}
              </Text>
            </Text>
            {row.meta ? (
              <Text fontSize="text-sm" tone="body">
                {row.meta}
              </Text>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.xs }}>
              {row.chip ? <LineChip label={row.chip.label} tone={row.chip.tone} /> : null}
              {!row.off && records?.[row.id] ? <LineChip label={records[row.id].label} tone={records[row.id].tone} /> : null}
            </View>
          </View>
        ))}
        {delivery ? (
          <View style={[{ flexDirection: "row", padding: space.md }, border]}>
            <Text fontSize="text-md" style={{ flex: 1 }}>
              Delivery · both trips
            </Text>
            <Text fontSize="text-md" fontWeight="font-bold">
              {delivery}
            </Text>
          </View>
        ) : null}
        <View style={[{ flexDirection: "row", padding: space.md }, border]}>
          <Text fontSize="text-md" fontWeight="font-bold" style={{ flex: 1 }}>
            You earn
          </Text>
          <Text fontSize="text-md" fontWeight="font-bold">
            {earn}
          </Text>
        </View>
      </Panel>
    </View>
  );
}
