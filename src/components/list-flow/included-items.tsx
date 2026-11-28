import { useCategoryChecklist } from "@/backend/list-flow/checklist";
import { Panel, TickRow } from "@/components/booking/parts";
import { Button, Text, TextField } from "@/components/core";
import {
  Change,
  ListingItems,
  MAX_ITEMS,
  MAX_ITEM_LENGTH,
  REFUSAL_TEXT,
  addItem,
  includedOf,
  itemsOf,
  picksFrom,
  removeItem,
  toggleIncluded,
  toggleUsedUp,
} from "@/lib/included-items";
import { space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import React, { useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";

/** A group's header over its Panel of tick rows. */
function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <View style={{ gap: 2 }}>
        <Text role="groupHeader">{title}</Text>
        {hint ? <Text role="fieldHint">{hint}</Text> : null}
      </View>
      <Panel>{children}</Panel>
    </View>
  );
}

const fold = (text: string) => text.trim().toLowerCase();

/**
 * "What comes with it" (ENG-454): the sub-category's items in three groups, and a field for the shop's own. Controlled by
 * the listing's lists (`items`; null: the listing follows its category), and hands back the lists the shop's ticks make.
 * Never blocks the screen it sits on: without a category it draws nothing, and a failed read says so quietly.
 *
 * No Figma frame draws this step yet: composed from the kit's Panel, TickRow, TextField and Button (design to review).
 */
export function IncludedItemsSection({
  categoryId,
  items,
  onChange,
  hideTitle,
  style,
}: {
  categoryId: number | null | undefined;
  items: Partial<ListingItems> | null | undefined;
  onChange: (items: ListingItems) => void;
  /** On a screen whose title already says it. */
  hideTitle?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { color } = useTheme();
  const { data: options, isLoading, isError, refetch } = useCategoryChecklist(categoryId);
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  if (categoryId == null) return null;

  const header = (
    <View style={{ gap: 2 }}>
      {hideTitle ? null : (
        <Text role="fieldLabel" accessibilityRole="header">
          What comes with it
        </Text>
      )}
      <Text role="fieldHint">Ticked items are checked at handover and return.</Text>
    </View>
  );

  if (!options) {
    return (
      <View style={[{ gap: space.sm }, style]}>
        {header}
        {isLoading ? (
          <Text fontSize="text-sm" tone="dim">
            Loading the list…
          </Text>
        ) : isError ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <Text fontSize="text-sm" tone="dim" style={{ flex: 1 }}>
              We couldn't load the list.
            </Text>
            <Button variant="outline" size="compact" onPress={() => void refetch()}>
              Try again
            </Button>
          </View>
        ) : null}
      </View>
    );
  }

  const picks = picksFrom(options, items);
  // A refused add is said under the field; a refused tick, which may be far from it, in a toast.
  const apply = (change: Change, typed = false) => {
    if (!change.ok) {
      if (typed) setNote(REFUSAL_TEXT[change.why]);
      else toast.error(REFUSAL_TEXT[change.why]);
      return false;
    }
    setNote(null);
    onChange(itemsOf(options, change.picks));
    return true;
  };
  const isTicked = (list: string[], item: string) => list.some((t) => fold(t) === fold(item));
  const onAdd = () => {
    if (apply(addItem(options, picks, text), true)) setText("");
  };

  // A listing's own used-up item that the category does not offer still shows, ticked.
  const usedUpRows = [
    ...options.handover_only_items,
    ...picks.usedUp.filter((item) => !isTicked(options.handover_only_items, item)),
  ];
  const count = includedOf(options, picks).length;

  return (
    <View style={[{ gap: space.lg }, style]}>
      {header}
      {options.included_items.length + picks.custom.length > 0 ? (
        <Group title="Comes with it">
          {options.included_items.map((item, index) => (
            <TickRow
              key={item}
              first={index === 0}
              label={item}
              ticked={isTicked(picks.ticked, item)}
              onPress={() => apply(toggleIncluded(options, picks, item))}
            />
          ))}
          {picks.custom.map((item, index) => (
            <TickRow
              key={`custom:${item}`}
              first={options.included_items.length === 0 && index === 0}
              label={item}
              ticked
              accessibilityHint="Removes it"
              onPress={() => apply(removeItem(options, picks, item))}
              trailing={<XMarkIcon size={18} color={color.textDim} />}
            />
          ))}
        </Group>
      ) : null}
      {options.extra_items.length > 0 ? (
        <Group title="Sometimes included" hint="Tick what this one has.">
          {options.extra_items.map((item, index) => (
            <TickRow
              key={item}
              first={index === 0}
              label={item}
              ticked={isTicked(picks.ticked, item)}
              onPress={() => apply(toggleIncluded(options, picks, item))}
            />
          ))}
        </Group>
      ) : null}
      {usedUpRows.length > 0 ? (
        <Group title="Used up during the rental" hint="Checked at handover, not asked back.">
          {usedUpRows.map((item, index) => (
            <TickRow
              key={item}
              first={index === 0}
              label={item}
              ticked={isTicked(picks.usedUp, item)}
              onPress={() => apply(toggleUsedUp(picks, item))}
            />
          ))}
        </Group>
      ) : null}
      <View style={{ gap: space.sm }}>
        <TextField
          label="Add an item"
          placeholder="e.g. 2 controllers"
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (note) setNote(null);
          }}
          maxLength={MAX_ITEM_LENGTH}
          returnKeyType="done"
          onSubmitEditing={onAdd}
          error={note ?? undefined}
          hint={`${count} of ${MAX_ITEMS} items`}
        />
        <View style={{ flexDirection: "row" }}>
          <Button variant="outline" size="compact" disabled={!text.trim()} onPress={onAdd}>
            Add
          </Button>
        </View>
      </View>
    </View>
  );
}
