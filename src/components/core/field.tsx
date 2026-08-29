import { MIN_TOUCH_TARGET, density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { Text } from "./text";

export function RequiredMark() {
  const { color } = useTheme();
  // One red for one meaning. The asterisk and the validation message under it
  // used to be two different reds — #E50914 (Netflix's) and #EF4444.
  return (
    <Text style={{ color: color.danger }} accessibilityLabel="required">
      {" *"}
    </Text>
  );
}

interface FieldLabelProps {
  label: string;
  required?: boolean;
  /** One line, under the label. Present or absent consistently down a form. */
  hint?: string;
}

export function FieldLabel({ label, required, hint }: FieldLabelProps) {
  return (
    <View style={{ gap: 1, marginBottom: 6 }}>
      {/* A label must not outrank the value the customer types into the field
          below it. This was 16pt bold — the same weight and nearly the same
          size as a section heading — over a 16pt helper line, which is how a
          single field group came to cost 146pt of vertical space. */}
      <Text fontSize="text-sm" fontWeight="font-semibold" tone="hi">
        {label}
        {required ? <RequiredMark /> : null}
      </Text>
      {hint ? (
        <Text fontSize="text-xs" tone="body">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

interface FieldErrorProps {
  children?: React.ReactNode;
}

export function FieldError({ children }: FieldErrorProps) {
  const { color } = useTheme();
  if (!children) return null;
  return (
    <Text
      fontSize="text-xs"
      style={{ color: color.danger, marginTop: 4 }}
      accessibilityLiveRegion="polite"
    >
      {children}
    </Text>
  );
}

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  required?: boolean;
  error?: string;
}

/**
 * A labelled, typed text input.
 *
 * `textContentType` and `autoComplete` are the two lines that decide whether
 * iCloud Keychain will offer to fill or save a credential; the app shipped one
 * `textContentType` across 78 inputs, so it never did.
 */
export function TextField({
  label,
  hint,
  required,
  error,
  style,
  multiline,
  ...props
}: TextFieldProps) {
  const { color } = useTheme();

  return (
    <View style={{ marginBottom: density.fieldGap }}>
      {label ? (
        <FieldLabel label={label} hint={hint} required={required} />
      ) : null}
      <TextInput
        placeholderTextColor={color.placeholder}
        accessibilityLabel={label}
        style={[
          {
            minHeight: multiline ? 76 : MIN_TOUCH_TARGET,
            paddingHorizontal: 12,
            paddingVertical: multiline ? 10 : 8,
            borderRadius: radius.input,
            borderWidth: 1,
            // Control borders use input-line, not the hairline token: a 1.13:1
            // border fails WCAG 1.4.11 and reads as no border at all.
            borderColor: error ? color.danger : color.inputLine,
            backgroundColor: color.surface,
            color: color.text,
            fontFamily: "PlusJakartaSans-Regular",
            fontSize: 16,
            textAlignVertical: multiline ? "top" : "center",
          },
          style,
        ]}
        multiline={multiline}
        {...props}
      />
      <FieldError>{error}</FieldError>
    </View>
  );
}
