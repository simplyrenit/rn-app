import { Text } from "@/components/core";
import { radius, space } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TextInput, View } from "react-native";

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

/** The six boxes' digits, an empty string for each box not yet reached. */
export const codeCells = (value: string): string[] =>
  Array.from({ length: CODE_LENGTH }, (_, index) => codeDigits(value)[index] ?? "");

/** The box the next digit goes in (the last one once the code is whole). */
export const activeCell = (value: string): number => Math.min(codeDigits(value).length, CODE_LENGTH - 1);

/**
 * Typing the other person's code: six boxes and the number pad. `round` empties the boxes (after a wrong try).
 *
 * One text input holds the whole value and the boxes are drawn from it. It used to be six inputs with focus handed from one to
 * the next, which dropped digits when they arrived fast (typed by a script, pasted, or filled in by iOS from a text message: one
 * change with several characters). Now whatever arrives is cleaned to its digits and cut to six, and a person still types digit
 * by digit and deletes. The input lies invisibly over the boxes, so a tap anywhere on them opens the keyboard.
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
  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(false);

  // A wrong try empties the boxes.
  React.useEffect(() => setValue(""), [round]);

  const change = (text: string) => {
    const next = codeDigits(text);
    setValue(next);
    onChange(next);
  };

  const cells = codeCells(value);
  const active = activeCell(value);

  return (
    <View style={{ alignItems: "center", opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: space.sm }}>
        {cells.map((digit, index) => (
          <View
            key={index}
            style={{
              width: 46,
              height: 60,
              borderRadius: radius.button,
              borderWidth: 1,
              borderColor: focused && index === active ? color.brand : color.inputLine,
              backgroundColor: color.surface,
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
      <TextInput
        value={value}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        // iOS fills the code in from the text message; Android's matching hint.
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoCorrect={false}
        // No `maxLength`: a pasted "123 456" is seven characters, and cutting it at six before it is cleaned would lose a digit.
        caretHidden
        selectionColor="transparent"
        accessibilityLabel={`Code, ${CODE_LENGTH} digits`}
        accessibilityValue={{ text: cells.filter(Boolean).join(" ") || "empty" }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
      />
    </View>
  );
}
