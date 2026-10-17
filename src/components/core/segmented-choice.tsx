import { MIN_TOUCH_TARGET, radius } from "@/lib/design-tokens";
import { selectionFeedback } from "@/lib/haptics";
import { useTheme } from "@/lib/theme";
import React, { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { CheckCircleIcon } from "react-native-heroicons/solid";
import Animated, {
  Easing,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./text";
import { useReduceMotion } from "./use-press-feedback";

const EASE_OUT = Easing.bezierFn(0.2, 0, 0, 1);

/**
 * The selected state, drawn over a fixed 1 pt border instead of by changing it.
 * Switching the border from 1 to 2 pt and inserting a check into the row made
 * the card reflow on every tap — the label shifted and could re-wrap
 * ("Excell/ent") — so the brand border and wash now fade in on top.
 */
function SelectionLayer({ selected }: { selected: boolean }) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(selected ? 1 : 0, {
      duration: reduceMotion ? 0 : selected ? 200 : 140,
      easing: EASE_OUT,
    });
  }, [selected, reduceMotion, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: -1,
          left: -1,
          right: -1,
          bottom: -1,
          borderRadius: radius.input,
          borderWidth: 2,
          borderColor: color.brand,
          backgroundColor: color.brandWash,
        },
        style,
      ]}
    />
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
  /**
   * Cannot be chosen — a Home address when one is already saved. Drawn muted
   * and not pressable; `hint` is where the reason goes ("Already saved").
   */
  disabled?: boolean;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  /**
   * An option someone else proposed — the listing flow's AI condition guess.
   * Drawn with a dashed brand outline and a caption, and deliberately NOT
   * selected: the owner still has to tap to confirm it.
   */
  suggested?: T | null;
  suggestedLabel?: string;
}

/**
 * A visible choice between two or three options.
 *
 * The contact-person choice this replaces rendered as two plain bordered boxes
 * with left-aligned text — the same border, radius and height as the text
 * inputs stacked directly above them — with no radio affordance and nothing
 * selected by default. Customers could not tell it was a choice at all.
 */
export function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  suggested = null,
  suggestedLabel,
}: Props<T>) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: "row", gap: 10 }}
    >
      {options.map((option) => {
        const selected = value === option.value;
        const isSuggested = !selected && suggested === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: option.disabled }}
            disabled={option.disabled}
            accessibilityLabel={
              isSuggested && suggestedLabel
                ? `${option.label}, ${suggestedLabel}`
                : option.label
            }
            accessibilityHint={option.hint}
            activeOpacity={0.8}
            onPress={() => {
              selectionFeedback();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: MIN_TOUCH_TARGET,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: radius.input,
              // Selected reads as selected: brand border, brand wash, and a
              // filled check (SelectionLayer). Unselected is visibly a
              // control, not an input. The border itself never changes width.
              borderWidth: 1,
              borderColor: option.disabled ? color.line : color.inputLine,
              backgroundColor: option.disabled
                ? color.surfaceRaised
                : color.surface,
            }}
          >
            <SelectionLayer selected={selected} />
            {isSuggested ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -1,
                  left: -1,
                  right: -1,
                  bottom: -1,
                  borderRadius: radius.input,
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: color.brand,
                }}
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text
                fontSize="text-md"
                fontWeight={selected ? "font-bold" : "font-normal"}
                tone={option.disabled ? "dim" : "default"}
              >
                {option.label}
              </Text>
              {option.hint ? (
                // One line: "Already saved" wrapped in a third-width chip at 360 dp.
                <Text
                  fontSize="text-xs"
                  tone={option.disabled ? "dim" : "body"}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {option.hint}
                </Text>
              ) : null}
              {isSuggested && suggestedLabel ? (
                <Text fontSize="text-xs" fontWeight="font-bold" tone="brand">
                  {suggestedLabel}
                </Text>
              ) : null}
            </View>
            {selected ? (
              // In the corner, out of the text's way, so it cannot squeeze the label.
              <Animated.View
                entering={reduceMotion ? undefined : ZoomIn.duration(220).easing(EASE_OUT)}
                exiting={reduceMotion ? undefined : FadeOut.duration(120)}
                pointerEvents="none"
                style={{ position: "absolute", right: 8, bottom: 8 }}
              >
                <CheckCircleIcon size={18} color={color.brand} />
              </Animated.View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
