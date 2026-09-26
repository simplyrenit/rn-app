import { Text } from "@/components/core";
import { ChecklistRow } from "@/context/list-draft-context";
import { categoryDisplayName } from "@/lib/category-icons";
import { space } from "@/lib/design-tokens";
import { AI_FIELDS, AiFieldName, ListingDraft } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import Animated from "react-native-reanimated";
import { CheckCircleIcon, MinusCircleIcon, SparklesIcon } from "react-native-heroicons/outline";
import { CONDITION_LABEL, FIELD_LABEL } from "./copy";
import { useRowMotion } from "./motion";

type RowState = "pending" | "filled" | "blank" | "condition";

function valueText(field: AiFieldName, draft: ListingDraft): string | null {
  const f = draft.fields;
  switch (field) {
    case "category":
      return f.category.value ? categoryDisplayName(f.category.value.title) : null;
    case "description":
      return f.description.value ? "written for you" : null;
    case "condition":
      return f.condition.value ? CONDITION_LABEL[f.condition.value] : null;
    default:
      return (f[field].value as string | null) ?? null;
  }
}

function Row({ field, state, draft, index }: { field: AiFieldName; state: RowState; draft: ListingDraft; index: number }) {
  const { color } = useTheme();
  const motion = useRowMotion(index);
  const label = FIELD_LABEL[field];
  const value = valueText(field, draft);

  let icon: React.ReactNode;
  let text: string;
  let tone: "default" | "dim" | "brand" = "default";
  switch (state) {
    case "pending":
      icon = <ActivityIndicator size="small" color={color.textDim} />;
      text = label;
      tone = "dim";
      break;
    case "blank":
      icon = <MinusCircleIcon size={22} color={color.textDim} />;
      text = `${label} · left blank for you`;
      tone = "dim";
      break;
    case "condition":
      icon = <SparklesIcon size={22} color={color.brandText} />;
      text = `${label} · looks ${value} — you'll confirm it`;
      tone = "brand";
      break;
    default:
      icon = <CheckCircleIcon size={22} color={color.success} />;
      text = value ? `${label} · ${value}` : label;
  }

  return (
    <Animated.View
      entering={motion.entering}
      layout={motion.layout}
      accessible
      accessibilityLabel={state === "pending" ? `${label}, reading` : text}
      style={{ flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 36 }}
    >
      <View style={{ width: 22, alignItems: "center" }}>{icon}</View>
      <Text fontSize="text-md" tone={tone} numberOfLines={1} style={{ flex: 1 }}>
        {text}
      </Text>
    </Animated.View>
  );
}

/**
 * L-13's checklist: arrived fields first, in the order they arrived, then the
 * ones still pending. The run ends with every field reported (§4.3), so the
 * pending rows always resolve.
 */
export function ExtractionChecklist({
  checklist,
  draft,
  running,
}: {
  checklist: ChecklistRow[];
  draft: ListingDraft;
  running: boolean;
}) {
  const arrived = new Set(checklist.map((r) => r.field));
  const pending = running ? AI_FIELDS.filter((f) => !arrived.has(f)) : [];
  const rows: { field: AiFieldName; state: RowState }[] = [
    ...checklist.map((r) => ({
      field: r.field,
      state: (r.status === "blank"
        ? "blank"
        : r.field === "condition"
        ? "condition"
        : "filled") as RowState,
    })),
    ...pending.map((field) => ({ field, state: "pending" as RowState })),
  ];

  return (
    <View style={{ gap: 2 }}>
      {rows.map((row, index) => (
        <Row key={row.field} field={row.field} state={row.state} draft={draft} index={index} />
      ))}
    </View>
  );
}
