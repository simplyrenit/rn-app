import { Text } from "@/components/core";
import { TimelineRow } from "@/lib/booking";
import { radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";

// Kit Timeline step (figma/00 2074:14356): a 20pt dot on a rail, 4 above a
// 2pt line that runs to the next step; the words 12 to the right.
const MARK = 20;

/**
 * One step of the timeline: a filled tick for what happened, a ringed dot for
 * what is next, an empty ring after. The line under a step is purple only once
 * that step is done.
 */
function TimelineLine({ row, last }: { row: TimelineRow; last: boolean }) {
  const { color } = useTheme();
  const done = row.state === "done";
  const next = row.state === "next";
  return (
    <View
      style={{ flexDirection: "row", gap: 12 }}
      accessible
      accessibilityLabel={`${row.label}, ${row.when}${done ? ", done" : next ? ", next" : ""}`}
    >
      <View style={{ alignItems: "center", gap: 4 }}>
        <View
          style={{
            width: MARK,
            height: MARK,
            borderRadius: radius.full,
            borderWidth: done ? 0 : 2,
            borderColor: next ? color.brand : color.line,
            backgroundColor: done ? color.brand : next ? color.brandPanel : color.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {done ? (
            <CheckIcon size={12} color={color.onBrand} />
          ) : next ? (
            <View style={{ width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.brand }} />
          ) : null}
        </View>
        {last ? null : (
          <View style={{ width: 2, flex: 1, borderRadius: 1, backgroundColor: done ? color.brand : color.line }} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2, paddingBottom: last ? 0 : 20 }}>
        <Text fontSize="text-sm" fontWeight="font-semibold" tone={row.state === "todo" ? "dim" : "default"}>
          {row.label}
        </Text>
        <Text fontSize="text-xs" tone="dim">
          {row.when}
        </Text>
      </View>
    </View>
  );
}

/** The rows of a booking's timeline, joined by the line between their marks. */
export function Timeline({ rows }: { rows: TimelineRow[] }) {
  return (
    <>
      {rows.map((row, index) => (
        <TimelineLine key={`${row.label}-${index}`} row={row} last={index === rows.length - 1} />
      ))}
    </>
  );
}
