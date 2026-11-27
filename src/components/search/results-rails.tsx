import { Chip, Text } from "@/components/core";
import { SCREEN_GUTTER, density, radius } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React, { forwardRef, useEffect, useRef } from "react";
import {
  LayoutRectangle,
  ScrollView,
  ScrollViewProps,
  TouchableOpacity,
  View,
} from "react-native";
import { AdjustmentsHorizontalIcon } from "react-native-heroicons/outline";

/**
 * The results screen's two chip rows (ENG-78, C-12 v3): the category rail and
 * the Filters / Sort / Dates bar with its quick chips. Both scroll sideways and
 * run to the screen edge, so a long row is cut by the edge (as the frame draws
 * it) rather than squeezed or wrapped at 360dp.
 */

// The 2.1 results frames (2089:31917): 40pt rows, 8 apart.
const GAP = 8;
// 40pt pills and chips keep the 44pt target with 2 above and below.
const SLOP = { top: 2, bottom: 2, left: 0, right: 0 };

interface PillProps {
  label: string;
  selected?: boolean;
  icon?: React.ReactNode;
  role?: "button" | "radio" | "checkbox";
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onPress: () => void;
}

/**
 * The frame's "Filter pill": the kit Chip's box (40, r12, 1px line, Chip
 * Selected colours when on) but with a 16 icon 8 from the label, where Chip
 * has gap 6, so it is not a Chip.
 */
function Pill({ label, selected = false, icon, role = "button", accessibilityLabel, accessibilityHint, onPress }: PillProps) {
  const { color } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole={role}
      accessibilityState={role === "button" ? { selected } : { checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      hitSlop={SLOP}
      onPress={() => {
        selectionFeedback();
        onPress();
      }}
      style={{
        height: density.chip,
        paddingHorizontal: 16,
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: selected ? color.brand : color.line,
        backgroundColor: selected ? color.brandPanel : color.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {icon}
      <Text
        fontSize="text-sm"
        fontWeight={selected ? "font-semibold" : "font-medium"}
        style={{ color: selected ? color.brandText : color.text }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** The unticked box on "Delivers to me": 16, r4, a 1.5 stroke at 60%. */
function Checkbox() {
  const { color } = useTheme();
  return (
    <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: color.textDim }} />
  );
}

const Row = forwardRef<ScrollView, ScrollViewProps>(function Row({ children, style, ...rest }, ref) {
  return (
    <ScrollView
      ref={ref}
      {...rest}
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
});

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
  // The chosen chip is often off-screen: the product page's breadcrumb and the
  // landing open a sub-category far down the rail, and the sheet's Category tab
  // can pick one too. Scroll just far enough to show it whole.
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Record<string, LayoutRectangle>>({});
  const viewport = useRef({ x: 0, width: 0 });
  const reveal = (key: string) => {
    const chip = layouts.current[key];
    const { x, width } = viewport.current;
    if (!chip || !width) return;
    if (chip.x + chip.width > x + width - SCREEN_GUTTER) {
      scrollRef.current?.scrollTo({ x: chip.x + chip.width - width + SCREEN_GUTTER });
    } else if (chip.x < x + SCREEN_GUTTER) {
      scrollRef.current?.scrollTo({ x: Math.max(0, chip.x - SCREEN_GUTTER) });
    }
  };
  useEffect(() => reveal(selectedKey), [selectedKey]);
  const crumb = (
    <Text fontSize="text-sm" fontWeight="font-medium" style={{ color: color.textDim }} numberOfLines={1}>
      {parentLabel} ›
    </Text>
  );
  return (
    <Row
      ref={scrollRef}
      scrollEventThrottle={16}
      onScroll={(event) => {
        viewport.current.x = event.nativeEvent.contentOffset.x;
      }}
      onLayout={(event) => {
        viewport.current.width = event.nativeEvent.layout.width;
        reveal(selectedKey);
      }}
    >
      {onOpenParent ? (
        <TouchableOpacity
          accessibilityRole="link"
          accessibilityLabel={`All of ${parentLabel}`}
          onPress={onOpenParent}
          hitSlop={SLOP}
          style={{ height: density.chip, justifyContent: "center" }}
        >
          {crumb}
        </TouchableOpacity>
      ) : (
        crumb
      )}
      {[{ key: "", label: "All" }, ...items].map((item) => (
        <Chip
          key={item.key || "all"}
          label={item.label}
          accessibilityRole="radio"
          accessibilityState={{ checked: item.key === selectedKey }}
          hitSlop={SLOP}
          selected={item.key === selectedKey}
          // A second tap on the chosen chip would re-run the same search.
          onPress={() => {
            selectionFeedback();
            if (item.key !== selectedKey) onSelect(item.key);
          }}
          onLayout={(event) => {
            layouts.current[item.key] = event.nativeEvent.layout;
            if (item.key === selectedKey) reveal(item.key);
          }}
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
  /**
   * Where the bar's pills lead, for the screen reader, when it is not where
   * their names suggest: on the category landing they all open the results.
   */
  hint?: string;
  /** The quick chips' spec label, for the screen reader. */
  chipSpecLabel?: string;
  chips: { value: string; on: boolean }[];
  onChip: (value: string) => void;
  /** ENG-292 "Delivers to me", after Dates; absent hides it (signed out). */
  deliver?: { on: boolean; onPress: () => void };
}

export function FilterBar(props: FilterBarProps) {
  const { color } = useTheme();
  return (
    <Row>
      <Pill
        // The " •" marks a set filter, as the sheet's tabs do (2089:32165).
        label={props.filtersActive ? "Filters •" : "Filters"}
        accessibilityLabel="Filters"
        accessibilityHint={props.hint}
        selected={props.filtersActive}
        icon={
          <AdjustmentsHorizontalIcon
            size={16}
            strokeWidth={1.5}
            color={props.filtersActive ? color.brandText : color.text}
          />
        }
        onPress={props.onFilters}
      />
      <Pill label="Sort" selected={props.sortActive} accessibilityHint={props.hint} onPress={props.onSort} />
      <Pill
        label={props.datesLabel}
        selected={props.datesActive}
        accessibilityLabel={props.datesActive ? `Dates, ${props.datesLabel}` : "Dates"}
        accessibilityHint={props.hint}
        onPress={props.onDates}
      />
      {props.deliver ? (
        <Pill
          label={props.deliver.on ? "Delivers to me ✕" : "Delivers to me"}
          role="checkbox"
          selected={props.deliver.on}
          // Ticked, the pill drops the box for the ✕ (2089:32001).
          icon={props.deliver.on ? undefined : <Checkbox />}
          accessibilityLabel="Delivers to me"
          onPress={props.deliver.onPress}
        />
      ) : null}
      {props.chips.length > 0 && (
        <View style={{ width: 1, height: 24, backgroundColor: color.line }} />
      )}
      {props.chips.map((chip) => (
        <Pill
          key={chip.value}
          label={chip.value}
          role="checkbox"
          selected={chip.on}
          accessibilityLabel={props.chipSpecLabel ? `${props.chipSpecLabel}: ${chip.value}` : chip.value}
          onPress={() => props.onChip(chip.value)}
        />
      ))}
    </Row>
  );
}
