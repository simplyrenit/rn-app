import { Panel } from "@/components/booking/parts";
import { Text } from "@/components/core";
import { BookingCustomer, paymentRows } from "@/lib/booking";
import { space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";

/**
 * Every payment and refund on a booking with its status (N16). A refund's row
 * carries the amount, where it is going and how many days to expect. Draws
 * nothing when no money has moved and none is due.
 */
export function PaymentsList({ booking }: { booking: BookingCustomer }) {
  const { color } = useTheme();
  const rows = paymentRows(booking);
  if (rows.length === 0) return null;

  const tint = {
    success: color.success,
    warning: color.warning,
    danger: color.danger,
    neutral: color.textBody,
  };

  return (
    <View style={{ gap: space.sm }}>
      <Text role="sectionTitle" accessibilityRole="header">
        Payments
      </Text>
      <Panel>
        {rows.map((row, index) => (
          <View
            key={row.key}
            accessible
            accessibilityLabel={`${row.title}. ${row.sub}. ${row.status}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              padding: space.md,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: color.line,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text fontSize="text-md" fontWeight="font-bold">
                {row.title}
              </Text>
              <Text fontSize="text-sm" tone="body">
                {row.sub}
              </Text>
            </View>
            <Text fontSize="text-sm" fontWeight="font-bold" style={{ color: tint[row.tone], maxWidth: "40%", textAlign: "right" }}>
              {row.status}
            </Text>
          </View>
        ))}
      </Panel>
    </View>
  );
}
