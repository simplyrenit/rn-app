import { Text } from "@/components/core";
import { radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { View } from "react-native";
import OTPTextView from "react-native-otp-textinput";

/** Codes are six digits (decision A-16). */
export const CODE_LENGTH = 6;

/** Only the digits of what was typed, at most a code's length. */
export const codeDigits = (text: string) => text.replace(/\D/g, "").slice(0, CODE_LENGTH);

/**
 * A code to show the other person: big, one digit to a box, so it reads across
 * a counter. A screen reader hears the digits one by one.
 */
export function CodeBoxes({ code, tinted = false }: { code: string; tinted?: boolean }) {
  const { color } = useTheme();
  const digits = codeDigits(code).split("");
  return (
    <View
      accessible
      accessibilityLabel={`Code: ${digits.join(" ")}`}
      style={{ flexDirection: "row", justifyContent: "center", gap: space.sm }}
    >
      {digits.map((digit, index) => (
        <View
          key={index}
          style={{
            flex: 1,
            maxWidth: 56,
            height: 64,
            borderRadius: radius.button,
            borderWidth: tinted ? 1 : 0,
            borderColor: color.brandPanelLine,
            backgroundColor: tinted ? color.surface : color.surfaceRaised,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text fontSize="text-2xl" fontWeight="font-bold" style={{ fontVariant: ["tabular-nums"] }}>
            {digit}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Typing the other person's code: six boxes and the number pad. `round` empties
 * the boxes (after a wrong try). The same input the bank unlock uses.
 */
export function CodeInput({
  onChange,
  round = 0,
  autoFocus = false,
  disabled = false,
}: {
  onChange: (code: string) => void;
  round?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const { color } = useTheme();
  // The library types the cell as a view style but draws a text input in it, so
  // `color` and the font size are part of it; kept out of the literal so the type does not object.
  const cell = {
    backgroundColor: color.surface,
    borderRadius: radius.button,
    borderWidth: 1,
    borderBottomWidth: 1,
    color: color.text,
    fontSize: 24,
    width: 46,
    height: 60,
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <View style={{ alignItems: "center" }} pointerEvents={disabled ? "none" : "auto"}>
      <OTPTextView
        key={round}
        containerStyle={{ marginHorizontal: -5 }}
        textInputStyle={cell}
        inputCount={CODE_LENGTH}
        inputCellLength={1}
        tintColor={color.brand}
        offTintColor={color.inputLine}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        handleTextChange={(value: string) => onChange(codeDigits(value))}
      />
    </View>
  );
}
