import { Button, IconButton, Text } from "@/components/core";
import {
  SCREEN_GUTTER,
  density,
  ink,
  radius,
  space,
} from "@/lib/design-tokens";
import { pluralize } from "@/lib/pluralize";
import { useTheme } from "@/lib/theme";
import moment from "moment";
import React, { useMemo, useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import type { MarkedDates } from "react-native-calendars/src/types";
import { ChevronRightIcon, XMarkIcon } from "react-native-heroicons/outline";

export interface DateRange {
  startDate: string;
  endDate: string;
}

/** Day cell. Matches the filter/category chip height, which is the same pitch. */
const DAY = density.chip;
/**
 * The cell is below Apple's 44pt floor and is tapped repeatedly while marking a
 * range. hitSlop makes up the shortfall without inflating the calendar grid.
 */
const DAY_HIT_SLOP = {
  top: space.xs,
  bottom: space.xs,
  left: space.xs,
  right: space.xs,
};

const ISO = "YYYY-MM-DD";

/**
 * Paints one contiguous block per range: the two endpoints take the solid
 * danger fill, the days between take its wash.
 *
 * This loop existed five times across the two screens — once to hydrate from
 * the API, twice on confirm, twice on remove — and the copies had drifted. The
 * remove copies dropped the `|| startDate` fallback the confirm copies carry,
 * so a single-day range removed its neighbour's marks and left its own; and the
 * confirm copies re-marked the *pre-merge* ranges, so merging two overlapping
 * spans left solid endpoint caps stranded in the middle of the merged block.
 */
/**
 * The tone that reads on the danger fill.
 *
 * `danger` is not one colour: it is a deep red on light (#B3261E) and a light
 * salmon on dark (#EB6F62). White clears AA on the first (6.6:1) and fails it
 * on the second (3.0:1), which is what a single `onBrand` for both produced.
 * The dark canvas measures 6.3:1 against that salmon, so it is what the label
 * takes there.
 *
 * This wants an `onDanger` token so every semantic fill in the app resolves its
 * own label; the token layer is frozen this phase, so it is derived here and
 * recorded as a follow-up. Note that `Button`'s `warning` variant has the same
 * gap and still paints `onBrand` — it is outside this lane.
 */
const onDangerFill = (isDark: boolean) =>
  isDark ? ink.canvas(true) : ink.onBrand();

const markRanges = (ranges: DateRange[], isDark: boolean): MarkedDates => {
  const marked: MarkedDates = {};

  ranges.forEach((range) => {
    const start = range.startDate;
    const end = range.endDate || range.startDate;
    let cursor = moment(start);

    while (cursor.isSameOrBefore(end)) {
      const isEdge = cursor.isSame(start) || cursor.isSame(end);
      marked[cursor.format(ISO)] = {
        startingDay: cursor.isSame(start),
        endingDay: cursor.isSame(end),
        color: isEdge ? ink.danger(isDark) : ink.dangerWash(isDark),
        textColor: isEdge ? onDangerFill(isDark) : ink.danger(isDark),
      };
      cursor = cursor.add(1, "day");
    }
  });

  return marked;
};

/** Total days covered, endpoints inclusive. */
const totalDays = (ranges: DateRange[]) =>
  ranges.reduce(
    (acc, range) =>
      acc +
      moment(range.endDate || range.startDate).diff(
        moment(range.startDate),
        "days"
      ) +
      1,
    0
  );

interface Props {
  /** Ranges already saved against the product. */
  initialRanges?: DateRange[];
  /** Label of the primary action — the flow's "Next", the editor's "Update". */
  submitLabel: string;
  onSubmit: (ranges: DateRange[]) => void;
  /**
   * The submit is a network call that has not come back. Shows a spinner on the
   * button and blocks a second press.
   */
  submitting?: boolean;
}

/**
 * The multi-range unavailability calendar.
 *
 * One implementation behind both the listing flow's step 6 and the edit screen,
 * which had carried 191 lines of divergence between them: the flow could not
 * hydrate ranges it had been given, the editor had lost the flow's dead
 * commented-out first drafts but gained a hardcoded light-theme border on the
 * secondary button, and both split the screen with percentage heights in one
 * copy and flex in the other.
 */
export function UnavailabilityEditor({
  initialRanges,
  submitLabel,
  onSubmit,
  submitting = false,
}: Props) {
  const { color, isDark } = useTheme();
  const [ranges, setRanges] = useState<DateRange[]>(() => initialRanges ?? []);
  const [selectedRange, setSelectedRange] = useState<DateRange | null>(null);

  const minDate = moment().format(ISO);

  // Derived, not a third piece of state. Every "recalculate marked dates" block
  // in the two screens was an attempt to keep a cache in step with the ranges
  // it was derived from, and each block got it slightly differently wrong. This
  // also means the marks repaint when the theme flips; the cached ones kept the
  // colours of whichever theme was active when they were painted.
  const markedDates = useMemo<MarkedDates>(
    () => ({
      ...markRanges(ranges, isDark),
      ...(selectedRange ? markRanges([selectedRange], isDark) : null),
    }),
    [ranges, selectedRange, isDark]
  );

  const handleDayPress = (day: { dateString: string }) => {
    if (moment(day.dateString).isBefore(minDate, "day")) return;

    setSelectedRange((previous) => {
      // A tap before the current start is a new start, not an invalid end —
      // which is what picking an earlier date obviously means, and is the rule
      // the shared `DateRangePicker` already follows. Both screens took it as
      // an end date, which marked nothing at all (the paint loop runs from the
      // start forwards) and committed a range whose length was negative.
      if (!previous || moment(day.dateString).isBefore(previous.startDate, "day")) {
        return { startDate: day.dateString, endDate: "" };
      }
      return { ...previous, endDate: day.dateString };
    });
  };

  /** Commits the pending selection, absorbing any ranges it overlaps. */
  const confirmDateRange = () => {
    if (!selectedRange) return;

    const rangeToAdd: DateRange = {
      startDate: selectedRange.startDate,
      endDate: selectedRange.endDate || selectedRange.startDate,
    };

    let mergedStart = moment(rangeToAdd.startDate);
    let mergedEnd = moment(rangeToAdd.endDate);
    const untouched: DateRange[] = [];

    ranges.forEach((range) => {
      const rangeStart = moment(range.startDate);
      const rangeEnd = moment(range.endDate || range.startDate);
      const overlaps =
        moment(rangeToAdd.startDate).isBetween(rangeStart, rangeEnd, "day", "[]") ||
        moment(rangeToAdd.endDate).isBetween(rangeStart, rangeEnd, "day", "[]") ||
        rangeStart.isBetween(rangeToAdd.startDate, rangeToAdd.endDate, "day", "[]") ||
        rangeEnd.isBetween(rangeToAdd.startDate, rangeToAdd.endDate, "day", "[]");

      if (overlaps) {
        mergedStart = moment.min(mergedStart, rangeStart);
        mergedEnd = moment.max(mergedEnd, rangeEnd);
      } else {
        untouched.push(range);
      }
    });

    const merged: DateRange = {
      startDate: mergedStart.format(ISO),
      endDate: mergedEnd.format(ISO),
    };

    // Chronological. Appending put a merged range at the bottom of a list the
    // customer is reading, so absorbing an early range made it jump to the end.
    setRanges(
      [...untouched, merged].sort((a, b) => a.startDate.localeCompare(b.startDate))
    );
    setSelectedRange(null);
  };

  const removeRange = (index: number) => {
    setRanges((previous) => previous.filter((_, i) => i !== index));
  };

  // Mirrors Button's own resolution: the blocked fill is neutral, so a white
  // label on it would measure 1.5:1.
  const submitTone = submitting ? color.textDim : color.onBrand;

  const calendarTheme = {
    backgroundColor: color.canvas,
    calendarBackground: color.canvas,
    textSectionTitleColor: color.text,
    dayTextColor: color.text,
    // `brand` is a fill and never a text colour; `brandText` is the tint that
    // clears AA on the dark canvas.
    todayTextColor: color.brandText,
    // Every date this screen paints red is destined to become unavailable —
    // not a mere selection — so this uses the same danger token the custom
    // day component already marks ranges with, not an ad-hoc "red".
    selectedDayBackgroundColor: color.danger,
    selectedDayTextColor: onDangerFill(isDark),
    // These two resolved the light palette unconditionally in both copies, so
    // in dark mode the month name was near-black on a near-black canvas.
    monthTextColor: color.textBody,
    arrowColor: color.text,
    // A past date is dimmed text, not a hairline. `line` measures 1.24:1 on the
    // light canvas and 1.32:1 on the dark one — invisible rather than quiet —
    // and `textDim` is the documented token for a disabled label.
    textDisabledColor: color.textDim,
    "stylesheet.calendar.header": {
      header: {
        borderBottomWidth: 1,
        borderBottomColor: color.line,
        flexDirection: "row",
        justifyContent: "space-between",
        // Was a bare 6. The scale has no 6, and 4 and 8 are equidistant from
        // it; the tighter one is the direction the density tokens run.
        paddingVertical: space.xs,
      },
    },
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: SCREEN_GUTTER }}>
      <View style={{ flex: 1 }}>
        <Calendar
          minDate={minDate}
          style={{
            borderColor: color.line,
            borderWidth: 1,
            borderRadius: radius.input,
          }}
          markingType="custom"
          markedDates={markedDates}
          onDayPress={handleDayPress}
          enableSwipeMonths
          theme={calendarTheme}
          dayComponent={({ date, state }) => {
            if (!date) return null;
            const marked = markedDates[date.dateString];
            const isDisabled = state === "disabled";

            return (
              <TouchableOpacity
                disabled={isDisabled}
                onPress={() => handleDayPress(date)}
                accessibilityRole="button"
                accessibilityLabel={date.dateString}
                accessibilityState={{
                  disabled: isDisabled,
                  selected: Boolean(marked),
                }}
                hitSlop={DAY_HIT_SLOP}
              >
                <View
                  style={{
                    width: DAY,
                    height: DAY,
                    borderRadius: radius.group,
                    backgroundColor: marked ? marked.color : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: marked
                        ? marked.textColor
                        : isDisabled
                        ? color.textDim
                        : color.text,
                    }}
                  >
                    {date.day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <View style={{ flex: 1, marginTop: space.xl }}>
          {ranges.length > 0 ? (
            <Text fontWeight="font-bold" fontSize="text-base">
              The product will be unavailable for{" "}
              {pluralize(totalDays(ranges), "day")}
            </Text>
          ) : (
            <Text role="sectionTitle">
              Choose the dates where the product will be unavailable
            </Text>
          )}

          <ScrollView style={{ flex: 1, marginTop: space.sm }}>
            {ranges.map((range, index) => {
              const label = `${moment(range.startDate).format("MMM D, YYYY")}${
                range.endDate
                  ? ` - ${moment(range.endDate).format("MMM D, YYYY")}`
                  : ""
              }`;

              return (
                <View
                  key={`${range.startDate}-${range.endDate}`}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: space.sm,
                  }}
                >
                  <Text fontSize="text-base">{`• ${label}`}</Text>

                  <IconButton
                    // Was labelled "Close" in both copies, which is what the
                    // control that leaves the screen does.
                    accessibilityLabel={`Remove ${label}`}
                    onPress={() => removeRange(index)}
                  >
                    <XMarkIcon size={24} color={color.text} />
                  </IconButton>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          paddingVertical: space.md,
        }}
      >
        <Button
          variant="outline"
          style={{ flex: 1 }}
          onPress={confirmDateRange}
          disabled={!selectedRange}
        >
          Add date log
        </Button>

        <Button
          style={{ flex: 1, gap: space.sm }}
          onPress={() => onSubmit(ranges)}
          loading={submitting}
          accessibilityLabel={submitLabel}
        >
          {/* Button already lays non-text children out in a centred row, so
              neither the wrapper View nor the half-pixel baseline nudges the
              two screens carried are needed. While it is loading it paints the
              blocked fill, so the label has to follow it off the brand tone. */}
          <Text
            fontWeight="font-bold"
            fontSize="text-md"
            style={{ color: submitTone }}
          >
            {submitLabel}
          </Text>
          <ChevronRightIcon size={16} color={submitTone} />
        </Button>
      </View>
    </View>
  );
}
