import { useCaptureDraft } from "@/backend/capture-jobs";
import { useCaptures, useShotList } from "@/backend/captures";
import { Text } from "@/components/core";
import { Moment, SetView, Side, includedRows, otherSide, setView, uploadProgress } from "@/lib/capture";
import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { IncludedList, TwoSets } from "./sets";

/** What a column says under its title while its set is not all in. */
function noteFor(view: SetView, own: boolean, uploading: string | null): string | null {
  if (view.state === "in") return null;
  if (own) return uploading ?? (view.state === "none" ? "Not recorded yet" : "Uploading");
  return view.state === "none" ? "Not in yet" : "Still uploading";
}

/**
 * Both people's sets for one moment, side by side, and what is included (BK-18;
 * the shop's "Check each other's photos"). This phone's own set shows from the
 * record it holds, before it is up. `poll`: read the sets again every few seconds
 * while one is still on its way and the two people are standing there.
 */
export function MomentSets({
  number,
  moment,
  side,
  otherName,
  otherTitle,
  poll,
}: {
  number: string;
  moment: Moment;
  /** Whose phone this is. */
  side: Side;
  /** "the shop", "Aarav": for "Not ticked by …". */
  otherName: string;
  /** The other column's title: "The shop's", "Aarav's". */
  otherTitle: string;
  poll: boolean;
}) {
  const captures = useCaptures(number, poll);
  const list = useShotList(number).data ?? null;
  const draft = useCaptureDraft(number, moment, side);
  const mine = captures.data?.[moment]?.[side] ?? null;
  const theirs = captures.data?.[moment]?.[otherSide(side)] ?? null;
  const mineView = setView(mine, draft, list);
  const theirView = setView(theirs, null, list);
  return (
    <>
      <TwoSets
        left={{
          title: "Yours",
          view: mineView,
          note: noteFor(mineView, true, draft && !draft.done && draft.sealed ? uploadProgress(draft).text : null),
        }}
        right={{ title: otherTitle, view: theirView, note: noteFor(theirView, false, null) }}
      />
      <IncludedList
        rows={includedRows(mine?.checklist ?? draft?.checklist, theirs?.checklist, otherName, list?.included_items)}
      />
    </>
  );
}

/**
 * SH-10: the handover set beside the return set, to see what changed while the
 * item was out. The shop's own two sets first; a switch shows the customer's two
 * instead, since each side sees the other's.
 */
export function ReturnSets({
  number,
  side,
  otherName,
  handoverDay,
  returnDay,
  poll,
}: {
  number: string;
  side: Side;
  otherName: string;
  /** "Sat 24", "Mon 26": the column titles' days. */
  handoverDay: string;
  returnDay: string;
  poll: boolean;
}) {
  const { color } = useTheme();
  const [whose, setWhose] = useState<"mine" | "theirs">("mine");
  const captures = useCaptures(number, poll);
  const list = useShotList(number).data ?? null;
  const draft = useCaptureDraft(number, "return", side);
  const who = whose === "mine" ? side : otherSide(side);
  const before = captures.data?.handover?.[who] ?? null;
  const now = captures.data?.return?.[who] ?? null;
  const beforeView = setView(before, null, list);
  const nowView = setView(now, whose === "mine" ? draft : null, list);
  const mineNow = captures.data?.return?.[side] ?? null;
  const theirNow = captures.data?.return?.[otherSide(side)] ?? null;
  return (
    <>
      <View
        accessibilityRole="tablist"
        style={{ flexDirection: "row", padding: 4, borderRadius: radius.button, backgroundColor: color.surfaceRaised }}
      >
        {(["mine", "theirs"] as const).map((key) => {
          const active = whose === key;
          return (
            <TouchableOpacity
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              activeOpacity={0.7}
              onPress={() => setWhose(key)}
              style={{
                flex: 1,
                minHeight: MIN_TOUCH_TARGET - 8,
                borderRadius: radius.input,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? color.surface : "transparent",
              }}
            >
              <Text fontSize="text-sm" fontWeight={active ? "font-bold" : "font-normal"} tone={active ? "default" : "body"}>
                {key === "mine" ? "Your photos" : `${otherName}'s photos`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TwoSets
        left={{ title: `At handover · ${handoverDay}`, view: beforeView, note: beforeView.state === "none" ? "None recorded" : null }}
        right={{
          title: `Now · ${returnDay}`,
          view: nowView,
          note: noteFor(nowView, whose === "mine", draft && !draft.done && draft.sealed ? uploadProgress(draft).text : null),
        }}
      />
      <IncludedList
        rows={includedRows(mineNow?.checklist ?? draft?.checklist, theirNow?.checklist, otherName, list?.included_items)}
      />
    </>
  );
}
