import { Text } from "@/components/core";
import { MIN_TOUCH_TARGET, SCREEN_GUTTER, radius } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { AdjustmentsHorizontalIcon } from "react-native-heroicons/outline";

/**
 * The results screen's two chip rows (ENG-78, C-12 v3): the category rail and
 * the Filters / Sort / Dates bar with its quick chips. Both scroll sideways and
 * run to the screen edge, so a long row is cut by the edge (as the frame draws
 * it) rather than squeezed or wrapped at 360dp.
 */

// Off the 390pt frame: 44pt pills 8 apart, 16 of padding either side of a label.
const GAP = 8;

interface PillProps {
  label: string;
  selected?: boolean;
  /** A quick chip: the frame outlines it a step darker than the bar's pills. */
  strong?: boolean;
  icon?: React.ReactNode;
  role?: "button" | "radio" | "checkbox";
  accessibilityLabel?: string;
  onPress: () => void;
}

/** The sheet's spec chip (spec-filter.tsx), at the row's 44pt height. */
function Pill({ label, selected = false, strong = false, icon, role = "button", accessibilityLabel, onPress }: PillProps) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole={role}
      accessibilityState={role === "button" ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      style={{
        height: MIN_TOUCH_TARGET,
        paddingHorizontal: 16,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: selected ? color.brand : strong ? color.textDim : color.inputLine,
        backgroundColor: selected ? color.brandWash : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon}
      <Text
        fontSize="text-md"
        fontWeight={selected ? "font-semibold" : "font-normal"}
        style={{ color: selected ? color.brandText : color.text }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Row({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Out to the screen edge through the screen's gutter, and back in for
      // the first and last pill.
      style={[{ marginHorizontal: -SCREEN_GUTTER, flexGrow: 0 }, style]}
      contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: GAP, alignItems: "center" }}
    >
      {children}
    </ScrollView>
  );
}

interface CategoryRailProps {
  parentLabel: string;
  /** Opens the category's landing; absent (a pre-v2 server sends no slug) leaves the crumb as text. */
  onOpenParent?: () => void;
  items: { key: string; label: string }[];
  /** "" is "All". */
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function CategoryRail({ parentLabel, onOpenParent, items, selectedKey, onSelect }: CategoryRailProps) {
  const { color } = useTheme();
  const crumb = (
    <Text fontSize="text-md" style={{ color: color.textDim }} numberOfLines={1}>
      {parentLabel} ›
    </Text>
  );
  return (
    <Row>
      {onOpenParent ? (
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel={`All of ${parentLabel}`}
          onPress={onOpenParent}
          style={{ height: MIN_TOUCH_TARGET, justifyContent: "center" }}
        >
          {crumb}
        </TouchableOpacity>
      ) : (
        crumb
      )}
      {[{ key: "", label: "All" }, ...items].map((item) => (
        <Pill
          key={item.key || "all"}
          label={item.label}
          role="radio"
          selected={item.key === selectedKey}
          // A second tap on the chosen chip would re-run the same search.
          onPress={() => item.key !== selectedKey && onSelect(item.key)}
        />
      ))}
    </Row>
  );
}

interface FilterBarProps {
  filtersActive: boolean;
  sortActive: boolean;
  datesLabel: string;
  datesActive: boolean;
  onFilters: () => void;
  onSort: () => void;
  onDates: () => void;
  /** The quick chips' spec label, for the screen reader. */
  chipSpecLabel?: string;
  chips: { value: string; on: boolean }[];
  onChip: (value: string) => void;
}

export function FilterBar(props: FilterBarProps) {
  const { color } = useTheme();
  return (
    <Row>
      <Pill
        label="Filters"
        selected={props.filtersActive}
        icon={
          <AdjustmentsHorizontalIcon
            size={20}
            color={props.filtersActive ? color.brandText : color.text}
          />
        }
        onPress={props.onFilters}
      />
      <Pill label="Sort" selected={props.sortActive} onPress={props.onSort} />
      <Pill
        label={props.datesLabel}
        selected={props.datesActive}
        accessibilityLabel={props.datesActive ? `Dates, ${props.datesLabel}` : "Dates"}
        onPress={props.onDates}
      />
      {props.chips.length > 0 && (
        <View style={{ width: 1, height: 24, backgroundColor: color.line }} />
      )}
      {props.chips.map((chip) => (
        <Pill
          key={chip.value}
          label={chip.value}
          strong
          role="checkbox"
          selected={chip.on}
          accessibilityLabel={props.chipSpecLabel ? `${props.chipSpecLabel}: ${chip.value}` : chip.value}
          onPress={() => props.onChip(chip.value)}
        />
      ))}
    </Row>
  );
}
