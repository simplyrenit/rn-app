import { Text, useReduceMotion } from "@/components/core";
import { ChecklistRow } from "@/context/list-draft-context";
import { categoryDisplayName } from "@/lib/category-icons";
import { AI_FIELDS, AiFieldName, ListingDraft } from "@/lib/list-flow/types";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";
import { CheckCircleIcon } from "react-native-heroicons/mini";
import Svg, { Circle, Rect } from "react-native-svg";
import { CONDITION_LABEL, FIELD_LABEL } from "./copy";
import { EASE_OUT, MOTION, useRowMotion } from "./motion";
import { ArcSpinner } from "./photo-tile";

// figma/10 2095:24471: 40-high rows 4 apart, a 22 icon, the text 12 after it at 16/24.
const ICON = 22;

/** The frame's icon/minus-circle: an 18 ring at 1.5 with an 8×1.5 bar, at 60%. */
function MinusCircle({ color }: { color: string }) {
  return (
    <Svg width={ICON} height={ICON}>
      <Circle cx={11} cy={11} r={8.25} stroke={color} strokeWidth={1.5} fill="none" />
      <Rect x={7} y={10.25} width={8} height={1.5} rx={0.75} fill={color} />
    </Svg>
  );
}

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

function Row({
  field,
  state,
  draft,
  index,
  still,
}: {
  field: AiFieldName;
  state: RowState;
  draft: ListingDraft;
  index: number;
  still?: boolean;
}) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const motion = useRowMotion(index);
  // The row stays mounted as its field resolves; only the icon and the text
  // are keyed by state, so they cross-fade instead of swapping in one frame.
  const iconIn = reduceMotion
    ? FadeIn.duration(MOTION.exit)
    : state === "pending"
    ? FadeIn.duration(MOTION.enter)
    : ZoomIn.duration(MOTION.enter).easing(EASE_OUT);
  const textIn = FadeIn.duration(reduceMotion ? MOTION.exit : MOTION.enter);
  const out = FadeOut.duration(MOTION.exit);
  const label = FIELD_LABEL[field];
  const value = valueText(field, draft);

  let icon: React.ReactNode;
  let text: string;
  let tone: "default" | "dim" = "default";
  switch (state) {
    case "pending":
      // The frame's icon/spinner: a quarter arc at 60% over an 18 hairline ring, turning while the field reads.
      icon = (
        <ArcSpinner
          size={18}
          start={-Math.PI / 2}
          end={0}
          innerRadius={0.82}
          color={color.textDim}
          track={{ width: 2, color: color.line }}
          spinning={!still}
        />
      );
      text = label;
      tone = "dim";
      break;
    case "blank":
      icon = <MinusCircle color={color.textDim} />;
      text = `${label} · left blank for you`;
      tone = "dim";
      break;
    case "condition":
      // 2.1 draws the condition guess as an arrived field: the same check, at full tone (2095:24375).
      icon = <CheckCircleIcon size={ICON} color={color.success} />;
      text = `${label} · looks ${value?.toLowerCase()} — you'll confirm it`;
      break;
    default:
      icon = <CheckCircleIcon size={ICON} color={color.success} />;
      text = value ? `${label} · ${value}` : label;
  }

  return (
    <Animated.View
      entering={motion.entering}
      layout={motion.layout}
      accessible
      accessibilityLabel={state === "pending" ? `${label}, reading` : text}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 40 }}
    >
      <View style={{ width: ICON, height: ICON, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          key={state}
          entering={iconIn}
          exiting={out}
          style={{ position: "absolute" }}
        >
          {icon}
        </Animated.View>
      </View>
      <Animated.View key={text} entering={textIn} exiting={out} style={{ flex: 1 }}>
        <Text fontSize="text-md" lineHeight={24} tone={tone} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
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
  still,
}: {
  checklist: ChecklistRow[];
  draft: ListingDraft;
  running: boolean;
  /** Dev design fixtures: hold the pending spinners still so a screenshot settles. */
  still?: boolean;
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
    <View style={{ gap: 4 }}>
      {rows.map((row, index) => (
        <Row key={row.field} field={row.field} state={row.state} draft={draft} index={index} still={still} />
      ))}
    </View>
  );
}
