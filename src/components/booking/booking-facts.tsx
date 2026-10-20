import { Notice, Panel } from "@/components/booking/parts";
import { Text } from "@/components/core";
import { LiveCopy, ProductShop, getItLine, handoverLine, priceBlock } from "@/lib/booking";
import { SCREEN_GUTTER, radius, space } from "@/lib/design-tokens";
import { Plan, UNIT_WORDS, minimumLine, noticeWords, perDay, plansOf, smallestPlan } from "@/lib/plans";
import { formatCurrency } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { ClockIcon, MapPinIcon } from "react-native-heroicons/outline";

/**
 * What a customer needs before Book now, on the product page (BK-01): whether
 * the owner is asked now, how the item changes hands, and the handover hours.
 * `copy` null means the listing cannot be booked at the moment.
 */
export function BookingFacts({
  copy,
  shop,
  notDelivered,
  rate,
  plans: listingPlans,
  deposit,
}: {
  copy: LiveCopy | null;
  shop: ProductShop | null | undefined;
  notDelivered?: boolean;
  /** The listing's price and deposit, for BK-01's price block under the banner. */
  rate?: string | number | null;
  /** ENG-281: its plans; absent from an older server, which priced by `rate` alone. */
  plans?: Plan[];
  deposit?: string | number | null;
}) {
  const { color } = useTheme();
  const hours = handoverLine(shop?.hours);
  const plans = plansOf({ plans: listingPlans, rate: rate == null ? null : String(rate) });
  const first = smallestPlan(plans);
  const price = priceBlock(first?.price, deposit);
  const minimum = minimumLine(plans);
  // ENG-282: a month plan of 2 months or more is billed monthly, and ending inside it costs a month's notice.
  const notice = noticeWords(plans);
  const rows = [
    { icon: MapPinIcon, text: getItLine(shop, notDelivered) },
    ...(hours ? [{ icon: ClockIcon, text: hours }] : []),
  ];

  return (
    <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: space.lg, gap: space.md }}>
      {copy?.kind === "live" ? (
        <View
          accessible
          accessibilityLabel={`${copy.title}. ${copy.body}`}
          style={{ padding: space.md, borderRadius: radius.button, backgroundColor: color.successWash, gap: 2 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.success }} />
            <Text fontSize="text-md" fontWeight="font-bold" tone="success">
              {copy.title}
            </Text>
          </View>
          <Text fontSize="text-md">{copy.body}</Text>
        </View>
      ) : copy ? (
        <Notice tone="warning" icon="clock">
          <Text fontSize="text-sm" fontWeight="font-bold" tone="warning">
            {copy.title}
          </Text>
          {`. ${copy.body}`}
        </Notice>
      ) : (
        <Notice>This owner is not taking bookings right now.</Notice>
      )}

      {price ? (
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: space.xs }}>
            <Text fontSize="text-xl" fontWeight="font-bold">
              {price.rate}
            </Text>
            <Text fontSize="text-md" tone="body">
              {`a ${first?.unit ?? "day"}`}
            </Text>
          </View>
          {plans.length > 1 ? <PlansCard plans={plans} /> : null}
          {minimum ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.xs }}>
              <ClockIcon size={18} color={color.text} />
              <Text fontSize="text-md" fontWeight="font-bold">
                {minimum}
              </Text>
            </View>
          ) : null}
          {notice ? (
            <Text fontSize="text-md" tone="body">
              {notice}
            </Text>
          ) : null}
          {price.deposit ? (
            <Text fontSize="text-md" tone="body">
              {price.deposit}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Panel>
        {rows.map((row, index) => (
          <View
            key={row.text}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              padding: space.md,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: color.line,
            }}
          >
            <row.icon size={20} color={color.text} />
            <Text fontSize="text-md" style={{ flex: 1 }}>
              {row.text}
            </Text>
          </View>
        ))}
      </Panel>
    </View>
  );
}

/** Each plan of a listing with two or three (ENG-281): its price, and what it works out to a day. */
function PlansCard({ plans }: { plans: Plan[] }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        marginVertical: space.sm,
        borderWidth: 1,
        borderColor: color.line,
        borderRadius: radius.group,
        overflow: "hidden",
      }}
    >
      {plans.map((plan, i) => (
        <View
          key={plan.unit}
          accessible
          accessibilityLabel={`${UNIT_WORDS[plan.unit]}, ${formatCurrency(plan.price)}, ${formatCurrency(perDay(plan))} a day`}
          style={{ flex: 1, padding: space.md, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: color.line }}
        >
          <Text fontSize="text-xs" tone="body">
            {UNIT_WORDS[plan.unit]}
          </Text>
          <Text fontSize="text-md" fontWeight="font-bold">
            {formatCurrency(plan.price)}
          </Text>
          <Text fontSize="text-xs" tone="body">
            {plan.unit === "day" ? "a day" : `${formatCurrency(Math.round(perDay(plan)))} a day`}
          </Text>
        </View>
      ))}
    </View>
  );
}
