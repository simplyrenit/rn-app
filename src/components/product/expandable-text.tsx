import { Text, type TextTone } from "@/components/core";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { ChevronDownIcon, ChevronUpIcon } from "react-native-heroicons/mini";

/** The frame's control glyph, set flush against its label. */
const CHEVRON_SIZE = 20;

interface Props {
  text: string;
  /** Lines shown while collapsed. */
  lines?: number;
  fontSize?: "text-sm" | "text-md";
  tone?: TextTone;
  /**
   * A fixed height for the collapsed body, so a rail of cards lines its author
   * rows up whether a review runs to one line or to five.
   */
  collapsedHeight?: number;
  /** Space between the body and its control. */
  controlGap?: number;
  /**
   * `chevron` is the page's own body copy; `underline` is the treatment inside
   * a review card, where the frame sets the control as a link.
   */
  control?: "chevron" | "underline";
  /**
   * When given, the control does this instead of expanding in place — for a
   * card whose height is fixed by the rail it sits in.
   */
  onPress?: () => void;
  accessibilityHint?: string;
}

/**
 * Body copy clamped to a few lines, with the control to open it.
 *
 * The control appears only when the text is genuinely cut off, and that is
 * measured rather than guessed: this used to key off a character count, so a
 * description of 140 characters was clamped by the line limit with no way to
 * open it, and one of 160 short lines offered "Show more" that revealed
 * nothing. An invisible second copy reports the unclamped line count —
 * `onTextLayout` on the visible one can only ever report the clamped one.
 */
export function ExpandableText({
  text,
  lines = 3,
  fontSize = "text-md",
  tone,
  collapsedHeight,
  controlGap = 8,
  control = "chevron",
  onPress,
  accessibilityHint,
}: Props) {
  const { color } = useTheme();
  const [expanded, setExpanded] = useState(false);
  // Keyed by the text it measured, so a second product's description is not
  // judged by the first one's line count.
  const [measured, setMeasured] = useState<{
    text: string;
    overflows: boolean;
  } | null>(null);

  const body = text ?? "";
  const overflows = measured?.text === body ? measured.overflows : false;
  const showControl = overflows;

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    setExpanded((open) => !open);
  };

  const label = expanded ? "Show less" : "Show more";

  return (
    <View style={{ gap: controlGap }}>
      <View
        style={
          collapsedHeight && !expanded ? { minHeight: collapsedHeight } : undefined
        }
      >
        <Text
          fontSize={fontSize}
          tone={tone}
          numberOfLines={expanded ? undefined : lines}
        >
          {body}
        </Text>

        {measured?.text !== body ? (
          // Same width and type as the visible copy, drawn at zero opacity and
          // outside the layout, purely to be measured. It unmounts as soon as
          // it has reported.
          <Text
            fontSize={fontSize}
            tone={tone}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: 0 }}
            onTextLayout={(event) =>
              setMeasured({
                text: body,
                overflows: event.nativeEvent.lines.length > lines,
              })
            }
          >
            {body}
          </Text>
        ) : null}
      </View>

      {showControl ? (
        <TouchableOpacity
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={accessibilityHint}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
            }}
          >
            <Text
              fontSize="text-sm"
              fontWeight="font-bold"
              style={
                control === "underline"
                  ? // The frame sets this in Satoshi, which the app does not
                    // ship; Plus Jakarta Sans Bold plus the rule is the same
                    // affordance in the family we have.
                    { textDecorationLine: "underline" }
                  : undefined
              }
            >
              {label}
            </Text>
            {control === "chevron" ? (
              // Flush against the label: the frame leaves no gap between them.
              expanded ? (
                <ChevronUpIcon size={CHEVRON_SIZE} color={color.text} />
              ) : (
                <ChevronDownIcon size={CHEVRON_SIZE} color={color.text} />
              )
            ) : null}
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
