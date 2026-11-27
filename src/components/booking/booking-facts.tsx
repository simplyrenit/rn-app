import { Notice } from "@/components/booking/parts";
import { Text } from "@/components/core";
import { LiveCopy, ProductShop, getItLine, handoverLine, priceBlock } from "@/lib/booking";
import type { ListingDelivery } from "@/lib/delivery";
import { SCREEN_GUTTER, radius } from "@/lib/design-tokens";
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
  monthlyBilling,
  deposit,
  delivery,
  addressName,
  deliveryFrom,
}: {
  copy: LiveCopy | null;
  shop: ProductShop | null | undefined;
  notDelivered?: boolean;
  /** ENG-284: whether the shop delivers to the customer's chosen address, and that address's name. */
  delivery?: ListingDelivery | null;
  addressName?: string | null;
  /** B1: the product's lowest delivery price of any kind (`delivery_from`), as the server sends it. */
  deliveryFrom?: string | null;
  /** The listing's price and deposit, for BK-01's price block under the banner. */
  rate?: string | number | null;
  /** ENG-281: its plans; absent from an older server, which priced by `rate` alone. */
  plans?: Plan[];
  /** ENG-282: the server bills this listing's month plan monthly (its switch is on). Absent from an older server. */
  monthlyBilling?: boolean;
  deposit?: string | number | null;
}) {
  const { color } = useTheme();
  const hours = handoverLine(shop?.hours);
  const plans = plansOf({ plans: listingPlans, rate: rate == null ? null : String(rate) });
  const first = smallestPlan(plans);
  const price = priceBlock(first?.price, deposit);
  const minimum = minimumLine(plans);
  // ENG-282: a month plan of 2 months or more, billed monthly, costs a month's notice for ending inside it.
  const notice = monthlyBilling ? noticeWords(plans) : null;
  const rows = [
    { icon: MapPinIcon, text: getItLine(shop, notDelivered, delivery, addressName, deliveryFrom) },
    ...(hours ? [{ icon: ClockIcon, text: hours }] : []),
  ];

  return (
    // 04 2083:16177 "Booking facts": 24 above, 32 below, the gutter at the sides, 16 between the blocks.
    <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: 24, paddingBottom: 32, gap: 16 }}>
      {copy ? (
        // The kit Notice: "Live booking" Success, "Closed now" Warning (its triangle, not a clock).
        <Notice tone={copy.kind === "live" ? "success" : "warning"} title={copy.title}>
          {copy.body}
        </Notice>
      ) : (
        <Notice>This owner is not taking bookings right now.</Notice>
      )}

      {price ? (
        // "Price": the rate row, the plans, the minimum and the deposit, 8 apart.
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text fontSize="text-lg" fontWeight="font-bold">
              {price.rate}
            </Text>
            <Text fontSize="text-sm" tone="dim">
              {`/${first?.unit ?? "day"}`}
            </Text>
          </View>
          {plans.length > 1 ? <PlansCard plans={plans} /> : null}
          {minimum ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}>
              <ClockIcon size={18} color={color.text} strokeWidth={1.5} />
              <Text fontSize="text-sm" fontWeight="font-semibold">
                {minimum}
              </Text>
            </View>
          ) : null}
          {notice ? (
            <Text fontSize="text-sm" tone="body">
              {notice}
            </Text>
          ) : null}
          {price.deposit ? (
            <Text fontSize="text-sm" tone="body">
              {price.deposit}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* "How you get it": r12 hairline card, rows 12/16 with 12 to the text. */}
      <View style={{ borderWidth: 1, borderColor: color.line, borderRadius: radius.button, overflow: "hidden" }}>
        {rows.map((row, index) => (
          <View
            key={row.text}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: color.line,
            }}
          >
            <row.icon size={20} color={color.text} strokeWidth={1.5} />
            <Text fontSize="text-sm" style={{ flex: 1 }}>
              {row.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The plan cells' own heading (04 2083:16177): "Day", "Week", "Month". */
const PLAN_CELL = { day: "Day", week: "Week", month: "Month" } as const;

/** Each plan of a listing with two or three (ENG-281): its price, and what it works out to a day. */
function PlansCard({ plans }: { plans: Plan[] }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        borderWidth: 1,
        borderColor: color.line,
        borderRadius: radius.button,
        overflow: "hidden",
      }}
    >
      {plans.map((plan, i) => (
        <View
          key={plan.unit}
          accessible
          accessibilityLabel={`${UNIT_WORDS[plan.unit]}, ${formatCurrency(plan.price)}, ${formatCurrency(perDay(plan))} a day`}
          // 04 2083:16177 "Plan · Day": 12 padding, 2 between unit, price and the per-day line.
          style={{ flex: 1, padding: 12, gap: 2, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: color.line }}
        >
          <Text fontSize="text-xs" tone="dim">
            {PLAN_CELL[plan.unit]}
          </Text>
          <Text fontSize="text-md" fontWeight="font-bold">
            {formatCurrency(plan.price)}
          </Text>
          <Text fontSize="text-xs" tone="dim">
            {`${formatCurrency(Math.round(perDay(plan)))}/day`}
          </Text>
        </View>
      ))}
    </View>
  );
}
