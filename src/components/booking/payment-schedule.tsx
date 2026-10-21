import { Panel, Pill } from "@/components/booking/parts";
import { Text } from "@/components/core";
import { PeriodRowView, scheduleFoot, scheduleHead, scheduleRows } from "@/lib/billing";
import { MonthlyMoney, RentPeriod } from "@/lib/booking";
import { space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TouchableOpacity, View } from "react-native";

/** One month (Figma 9477:5122): its label and dates, the amount, and a pill for where it stands. The overdue row is tinted. */
export function PeriodRow({ row, first, onPress }: { row: PeriodRowView; first: boolean; onPress?: () => void }) {
  const { color } = useTheme();
  const label = `${row.label}, ${row.dates}. ${row.amount}. ${row.pill.label}`;
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <Text fontSize="text-md" fontWeight="font-bold">
          {row.label}
        </Text>
        <Text fontSize="text-sm" tone="body">
          {row.dates}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: space.xs }}>
        <Text fontSize="text-md" fontWeight="font-bold" tone={row.dim ? "dim" : "default"}>
          {row.amount}
        </Text>
        <Pill label={row.pill.label} tone={row.pill.tone} />
      </View>
    </>
  );
  const style = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderTopWidth: first ? 0 : 1,
    borderTopColor: color.line,
    backgroundColor: row.tinted ? color.dangerWash : undefined,
  };
  return onPress ? (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} activeOpacity={0.7} onPress={onPress} style={style}>
      {body}
    </TouchableOpacity>
  ) : (
    <View accessible accessibilityLabel={label} style={style}>
      {body}
    </View>
  );
}

/**
 * The card "Monthly rent · Month 3 of 6" (Figma 9477:5156, shop 9478:3638): every month of a monthly-billed booking,
 * across its extension chain, and a foot with what is paid. `onPay`: the customer's, opening Rent due from a month that
 * `canPay` allows (`canPayPeriod`); the shop's rows are not tapped.
 */
export function PaymentSchedule({
  money,
  side,
  today,
  onPay,
  canPay,
}: {
  money: MonthlyMoney;
  side: "customer" | "owner";
  today: string;
  onPay?: (period: RentPeriod) => void;
  canPay?: (period: RentPeriod) => boolean;
}) {
  const { color } = useTheme();
  const periods = money.periods ?? [];
  if (periods.length === 0) return null;
  const head = scheduleHead(periods, today);
  return (
    <Panel>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: space.md,
          paddingHorizontal: space.md,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: color.line,
        }}
      >
        <Text role="sectionTitle" accessibilityRole="header">
          Monthly rent
        </Text>
        {head ? (
          <Text fontSize="text-sm" tone="body">
            {head}
          </Text>
        ) : null}
      </View>
      {scheduleRows(periods, onPay ? canPay : undefined).map(({ period, row }, index) => {
        return (
          <PeriodRow
            key={row.key}
            row={row}
            first={index === 0}
            onPress={onPay && row.payable ? () => onPay(period) : undefined}
          />
        );
      })}
      <View
        style={{
          paddingHorizontal: space.md,
          paddingTop: 10,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: color.line,
          backgroundColor: color.surfaceRaised,
        }}
      >
        <Text fontSize="text-sm" tone="body">
          {scheduleFoot(money, side)}
        </Text>
      </View>
    </Panel>
  );
}
