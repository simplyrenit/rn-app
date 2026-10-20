/**
 * "How do you rent this?" (ENG-281): Daily, Weekly and Monthly chips, and for
 * each one picked a price and a minimum rental. Shared by the create flow's
 * Review screen and the edit-listing form, so a shop prices a listing the same
 * way in both. The value is typed text; `toPlans` turns it into what the API is
 * sent once every picked plan has a price.
 */
import { Text } from "@/components/core";
import { FieldLabel, FieldShell } from "@/components/core/field";
import { Stepper } from "@/components/core/stepper";
import { MIN_TOUCH_TARGET, fontFamily, fontSize, radius, space } from "@/lib/design-tokens";
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
import { CheckIcon, MinusIcon, PlusIcon } from "react-native-heroicons/outline";

interface Props {
  value: DraftPlan[];
  onChange: (plans: DraftPlan[]) => void;
  /** The label, e.g. the create flow's "Check 1 · how you rent it". */
  label?: string;
  /** Under Daily's price: the create flow's "Think about what you'd pay…". */
  dailyHint?: string;
  /** Show "Add a weekly price, or unpick Weekly." under an empty price. */
  showErrors?: boolean;
  /** Before each price: the edit form's currency icon, which follows the listing's country. "Rs" when not given. */
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
    <View>
      <FieldLabel label={label} required hint="Pick every way you rent it out. Each one gets its own price." />
      <View accessibilityRole="none" style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.sm }}>
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
        <Text fontSize="text-xs" tone="body" style={{ marginTop: space.sm }}>
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
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      style={{
        minHeight: MIN_TOUCH_TARGET,
        paddingHorizontal: space.md,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.full,
        borderWidth: selected ? 1.5 : 1,
        borderColor: selected ? color.brand : color.inputLine,
        backgroundColor: selected ? color.brandWash : "transparent",
      }}
    >
      {selected ? <CheckIcon size={16} color={color.brandText} /> : <PlusIcon size={16} color={color.textDim} />}
      <Text fontSize="text-sm" fontWeight={selected ? "font-bold" : "font-normal"} tone={selected ? "brand" : "default"}>
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
    <View style={{ borderWidth: 1, borderColor: color.line, borderRadius: radius.group, overflow: "hidden" }}>
      {plans.map((plan, i) => (
        <View
          key={plan.unit}
          style={{
            padding: space.md,
            gap: space.sm,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: color.line,
          }}
        >
          <View style={{ gap: 2 }}>
            <Text fontSize="text-md" fontWeight="font-bold">
              {UNIT_WORDS[plan.unit]}
            </Text>
            <Text fontSize="text-xs" tone="body">
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
            <Text fontSize="text-sm" tone="body" style={{ flex: 1 }}>
              Minimum rental
            </Text>
            <Stepper
              label={`One ${plan.unit} less`}
              disabled={plan.min <= 1}
              onPress={() => onChange(plan.unit, { min: plan.min - 1 })}
            >
              <MinusIcon size={18} color={color.brandText} />
            </Stepper>
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              accessibilityLabel={`Minimum rental ${pluralize(plan.min, plan.unit)}`}
              style={{ minWidth: 72, textAlign: "center" }}
            >
              {pluralize(plan.min, plan.unit)}
            </Text>
            <Stepper
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
    <FieldShell focused={focused} error={wrong}>
      {currency ?? (
        <Text fontSize="text-md" fontWeight="font-bold" tone="body">
          Rs
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
      <Text fontSize="text-md" tone="body">{`/${plan.unit}`}</Text>
    </FieldShell>
  );
}
