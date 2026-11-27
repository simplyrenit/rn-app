/**
 * "How do you rent this?" (ENG-281): Daily, Weekly and Monthly chips, and for
 * each one picked a price and a minimum rental. Shared by the create flow's
 * Review screen and the edit-listing form, so a shop prices a listing the same
 * way in both. The value is typed text; `toPlans` turns it into what the API is
 * sent once every picked plan has a price. Drawn to the 2.1 Review frames
 * (2083:14692, 2095:24558).
 */
import { SectionHeader, Text } from "@/components/core";
import { FieldShell } from "@/components/core/field";
import { Stepper } from "@/components/core/stepper";
import { MIN_TOUCH_TARGET, density, fontFamily, fontSize, radius, space } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import {
  DraftPlan,
  MAX_MIN,
  PlanUnit,
  UNITS,
  UNIT_WORDS,
  missingPrices,
  sortPlans,
  worksOutLine,
} from "@/lib/plans";
import { pluralize } from "@/lib/pluralize";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import { TextInput, TouchableOpacity, View } from "react-native";
import { MinusIcon, PlusIcon } from "react-native-heroicons/mini";

// The Check 1 block (2095:24558, 2096:24835): the header, the chips and each plan 12 apart; a plan is padded 8
// above and below, its head, price and minimum rental 12 apart.
const BLOCK_GAP = 12;
const PLAN_PAD = 8;
/** The price box is 50 (12 / 24 / 12 inside its hairline), not the 48 field. */
const PRICE_BOX = 50;
/** The kit Chip is 40; the slop takes its target to 44. */
const CHIP_SLOP = (MIN_TOUCH_TARGET - density.chip) / 2;

interface Props {
  value: DraftPlan[];
  onChange: (plans: DraftPlan[]) => void;
  /** The label, e.g. the create flow's "Check 1 · how you rent it". */
  label?: string;
  /** Under Daily's price: the create flow's "Think about what you'd pay…". */
  dailyHint?: string;
  /** Show "Add a weekly price, or unpick Weekly." under an empty price. */
  showErrors?: boolean;
  /** Before each price: the edit form's currency icon, which follows the listing's country. "₹" when not given. */
  currency?: React.ReactNode;
}

export function PlanPricing({
  value,
  onChange,
  label = "How do you rent this?",
  dailyHint,
  showErrors,
  currency,
}: Props) {
  const plans = sortPlans(value);
  const picked = new Set(plans.map((p) => p.unit));
  const missing = new Set(missingPrices(plans));

  const toggle = (unit: PlanUnit) => {
    if (picked.has(unit)) {
      if (plans.length === 1) return; // a listing has at least one way to rent it
      onChange(plans.filter((p) => p.unit !== unit));
    } else {
      onChange(sortPlans([...plans, { unit, price: "", min: 1 }]));
    }
  };
  const change = (unit: PlanUnit, changes: Partial<DraftPlan>) =>
    onChange(plans.map((p) => (p.unit === unit ? { ...p, ...changes } : p)));

  return (
    <View style={{ gap: BLOCK_GAP }}>
      {/* The kit Section header with its hint 4 below. No required mark: no frame draws one on a check. */}
      <View style={{ gap: 4 }}>
        <SectionHeader title={label} gutter={false} flush />
        <Text role="fieldHint">Pick every way you rent it out. Each one gets its own price.</Text>
      </View>
      <View accessibilityRole="none" style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {UNITS.map((unit) => (
          <Chip
            key={unit}
            label={UNIT_WORDS[unit]}
            selected={picked.has(unit)}
            locked={picked.has(unit) && plans.length === 1}
            onPress={() => toggle(unit)}
          />
        ))}
      </View>
      <PlanRows
        plans={plans}
        missing={showErrors ? missing : new Set()}
        dailyHint={dailyHint}
        currency={currency}
        onChange={change}
      />
      {plans.length > 1 ? (
        <Text fontSize="text-xs" tone="body">
          Renters pay the cheapest plan their dates qualify for.
        </Text>
      ) : null}
    </View>
  );
}

function Chip({
  label,
  selected,
  locked,
  onPress,
}: {
  label: string;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      accessibilityHint={locked ? "At least one way to rent it stays picked" : undefined}
      activeOpacity={0.8}
      hitSlop={{ top: CHIP_SLOP, bottom: CHIP_SLOP }}
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      // The kit Chip's numbers (core/chip.tsx, 2073:14388): 40 high, r12, 16 padding inside a 1pt edge. Drawn here
      // because the kit Chip cannot carry the checkbox role, state and hint yet (ENG-427 adds the passthroughs).
      style={{
        minHeight: density.chip,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandPanel : color.surface,
      }}
    >
      <Text
        fontSize="text-sm"
        lineHeight={20}
        fontWeight={selected ? "font-semibold" : "font-medium"}
        style={selected ? { color: color.brandText } : undefined}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PlanRows({
  plans,
  missing,
  dailyHint,
  currency,
  onChange,
}: {
  plans: DraftPlan[];
  missing: Set<PlanUnit>;
  dailyHint?: string;
  currency?: React.ReactNode;
  onChange: (unit: PlanUnit, changes: Partial<DraftPlan>) => void;
}) {
  const { color } = useTheme();
  return (
    <View>
      {plans.map((plan, i) => (
        <View
          key={plan.unit}
          style={{
            paddingVertical: PLAN_PAD,
            gap: BLOCK_GAP,
            // No frame shows two plans; the hairline between them is the one they had.
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: color.line,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold">
              {UNIT_WORDS[plan.unit]}
            </Text>
            <Text fontSize="text-xs" lineHeight={16} tone="body">
              {plan.unit === "day"
                ? (dailyHint ?? "What a renter pays for one day.")
                : (worksOutLine({ ...plan, price: plan.price || "0" }) ?? `What a renter pays for one ${plan.unit}.`)}
            </Text>
          </View>
          <PriceBox
            plan={plan}
            wrong={missing.has(plan.unit)}
            currency={currency}
            onChange={(price) => onChange(plan.unit, { price })}
          />
          {missing.has(plan.unit) ? (
            <Text fontSize="text-xs" tone="danger">
              {`Add a ${UNIT_WORDS[plan.unit].toLowerCase()} price, or unpick ${UNIT_WORDS[plan.unit]}.`}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
            <Text fontSize="text-sm" lineHeight={20} tone="body" style={{ flex: 1 }}>
              Minimum rental
            </Text>
            <Stepper
              compact
              label={`One ${plan.unit} less`}
              disabled={plan.min <= 1}
              onPress={() => onChange(plan.unit, { min: plan.min - 1 })}
            >
              <MinusIcon size={18} color={color.brandText} />
            </Stepper>
            <Text
              fontSize="text-sm"
              lineHeight={20}
              fontWeight="font-semibold"
              accessibilityLabel={`Minimum rental ${pluralize(plan.min, plan.unit)}`}
              style={{ minWidth: 72, textAlign: "center" }}
            >
              {pluralize(plan.min, plan.unit)}
            </Text>
            <Stepper
              compact
              label={`One ${plan.unit} more`}
              disabled={plan.min >= MAX_MIN[plan.unit]}
              onPress={() => onChange(plan.unit, { min: plan.min + 1 })}
            >
              <PlusIcon size={18} color={color.brandText} />
            </Stepper>
          </View>
        </View>
      ))}
    </View>
  );
}

function PriceBox({
  plan,
  wrong,
  currency,
  onChange,
}: {
  plan: DraftPlan;
  wrong: boolean;
  currency?: React.ReactNode;
  onChange: (price: string) => void;
}) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell focused={focused} error={wrong} style={{ minHeight: PRICE_BOX }}>
      {currency ?? (
        <Text fontSize="text-md" lineHeight={24} fontWeight="font-semibold" tone="body">
          ₹
        </Text>
      )}
      <TextInput
        accessibilityLabel={`${UNIT_WORDS[plan.unit]} price`}
        keyboardType="number-pad"
        maxLength={8}
        value={plan.price}
        placeholder="0"
        placeholderTextColor={color.placeholder}
        onChangeText={(v) => onChange(v.replace(/[^\d]/g, ""))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, color: color.text, fontFamily: fontFamily.regular, fontSize: fontSize.md }}
      />
      <Text fontSize="text-md" lineHeight={24} tone="body">{`/${plan.unit}`}</Text>
    </FieldShell>
  );
}
