import { Text } from "@/components/core";
import { TimelineRow } from "@/lib/booking";
import { radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import { CheckIcon } from "react-native-heroicons/solid";

const MARK = 20;

/** One line of the timeline: a tick for what happened, a ring for what is next, an empty ring after. */
function TimelineLine({ row, last }: { row: TimelineRow; last: boolean }) {
  const { color } = useTheme();
  const done = row.state === "done";
  const next = row.state === "next";
  return (
    <View
      style={{ flexDirection: "row", gap: space.md }}
      accessible
      accessibilityLabel={`${row.label}, ${row.when}${done ? ", done" : next ? ", next" : ""}`}
    >
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            width: MARK,
            height: MARK,
            borderRadius: radius.full,
            borderWidth: 2,
            borderColor: done || next ? color.brand : color.inputLine,
            backgroundColor: done ? color.brand : "transparent",
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
          <View style={{ width: 2, flex: 1, minHeight: space.md, backgroundColor: done ? color.brand : color.inputLine }} />
        )}
      </View>
      <View style={{ flex: 1, flexDirection: "row", gap: space.sm, paddingBottom: last ? 0 : space.md }}>
        <Text
          fontSize="text-md"
          fontWeight={next ? "font-bold" : "font-normal"}
          tone={row.state === "todo" ? "body" : "default"}
          style={{ flex: 1 }}
        >
          {row.label}
        </Text>
        <Text fontSize="text-sm" fontWeight={next ? "font-bold" : "font-normal"} tone={next ? "brand" : "body"}>
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
