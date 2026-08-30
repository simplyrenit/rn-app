import { MIN_TOUCH_TARGET, density, radius } from "@/lib/design-tokens";
import { useTheme } from "@/lib/theme";
import React, { useState } from "react";
import {
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
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
      <Text role="fieldLabel">
        {label}
        {required ? <RequiredMark /> : null}
      </Text>
      {hint ? (
        <Text fontSize="text-xs" role="fieldHint">
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

interface FieldSurfaceOptions {
  focused?: boolean;
  error?: boolean;
  disabled?: boolean;
  multiline?: boolean;
}

/**
 * The box every field in the app is drawn in.
 *
 * There were three treatments before this: search grew a purple glow ring on
 * focus (a web pattern iOS has never used), post-flow text inputs showed no
 * focus state at all, and the selects sitting beside those inputs carried a
 * filled background while the inputs themselves were transparent — so one
 * screen showed two kinds of field.
 *
 * The settled answer is one filled box on the canvas, and on focus the border
 * changes colour and nothing else. No halo, no shadow, and the border width is
 * held constant so focusing a field never nudges the form.
 */
export function useFieldSurfaceStyle({
  focused = false,
  error = false,
  disabled = false,
  multiline = false,
}: FieldSurfaceOptions = {}): ViewStyle {
  const { color } = useTheme();

  return {
    minHeight: multiline ? 76 : MIN_TOUCH_TARGET,
    paddingHorizontal: 12,
    paddingVertical: multiline ? 10 : 8,
    borderRadius: radius.input,
    borderWidth: 1,
    // Control borders use input-line, not the hairline token: a 1.13:1 border
    // fails WCAG 1.4.11 and reads as no border at all. Error outranks focus —
    // the field is still wrong while you are fixing it.
    borderColor: error
      ? color.danger
      : focused
      ? color.focus
      : color.inputLine,
    backgroundColor: color.surface,
    opacity: disabled ? 0.5 : 1,
  };
}

interface FieldShellProps extends FieldSurfaceOptions {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The same box, for a control that is not a `TextInput` — a select, a date
 * chooser, a category picker. Wrap the control's contents in this and it
 * matches the text inputs beside it instead of inventing a fourth look.
 */
export function FieldShell({
  children,
  style,
  ...options
}: FieldShellProps) {
  const surface = useFieldSurfaceStyle(options);
  return (
    <View
      style={[
        surface,
        { flexDirection: "row", alignItems: "center", gap: 8 },
        style,
      ]}
    >
      {children}
    </View>
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
  onFocus,
  onBlur,
  ...props
}: TextFieldProps) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const surface = useFieldSurfaceStyle({
    focused,
    error: Boolean(error),
    multiline,
  });

  return (
    <View style={{ marginBottom: density.fieldGap }}>
      {label ? (
        <FieldLabel label={label} hint={hint} required={required} />
      ) : null}
      <TextInput
        placeholderTextColor={color.placeholder}
        accessibilityLabel={label}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          surface,
          {
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
