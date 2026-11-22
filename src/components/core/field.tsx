import { density, radius } from "@/lib/design-tokens";
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

// 2.1 kit Form field (figma/00 2073:14413): a 48pt input, padded 16, 8pt
// between the label, the input and the helper or error line.
const FIELD_HEIGHT = 48;
const FIELD_PADDING = 16;
const FIELD_GAP = 8;
/** The kit draws the focused border 1.5 wide; the resting one is 1. */
const BORDER = 1;
const FOCUS_BORDER = 1.5;

export function RequiredMark() {
  const { color } = useTheme();
  // One red for one meaning. The asterisk and the validation message under it
  // used to be two different reds — #E50914 (Netflix's) and #EF4444. Both are
  // now the kit's status/danger/strong, the red the Form field error uses.
  return (
    <Text style={{ color: color.dangerStrong }} accessibilityLabel="required">
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
    <View style={{ gap: 1, marginBottom: FIELD_GAP }}>
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

/** The kit's error line: 12 Medium in status/danger/strong, 8pt under the input. */
export function FieldError({ children }: FieldErrorProps) {
  const { color } = useTheme();
  if (!children) return null;
  return (
    <Text
      fontSize="text-xs"
      fontWeight="font-medium"
      style={{ color: color.dangerStrong, marginTop: FIELD_GAP }}
      accessibilityLiveRegion="polite"
    >
      {children}
    </Text>
  );
}

/**
 * Kept so its call sites compile; it no longer changes anything. It used to opt
 * the Post form into the 48pt, padded-16, hairline-edged box, and the 2.1 kit
 * made that box every field's. The hairline is a deliberate step below the 3:1
 * control-edge rule (WCAG 1.4.11); the approved kit draws it, so it was accepted
 * app-wide. `inputLine` stays for checkbox and radio controls.
 */
export function FieldFrame({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

interface FieldSurfaceOptions {
  focused?: boolean;
  error?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  /** Kept for back-compat; every field is now the kit box (see `FieldFrame`). */
  frame?: boolean;
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
 * turns purple and thickens to the kit's 1.5. No halo, no shadow. The padding
 * gives back the extra half point, so the text inside never moves when the
 * field takes focus. (The kit itself lets the value shift 0.5pt; holding it
 * still is the ENG-426 plan's call.)
 */
export function useFieldSurfaceStyle({
  focused = false,
  error = false,
  disabled = false,
  multiline = false,
}: FieldSurfaceOptions = {}): ViewStyle {
  const { color } = useTheme();
  // Error outranks focus — the field is still wrong while you are fixing it —
  // so an errored field keeps the kit Error state's 1pt red edge while focused.
  const focusEdge = focused && !error;
  const border = focusEdge ? FOCUS_BORDER : BORDER;
  const inset = border - BORDER;

  return {
    minHeight: multiline ? 76 : FIELD_HEIGHT,
    paddingHorizontal: FIELD_PADDING - inset,
    paddingVertical: (multiline ? 10 : 8) - inset,
    borderRadius: radius.input,
    borderWidth: border,
    // The kit's border/default hairline, not `inputLine` (see `FieldFrame`).
    borderColor: error ? color.dangerStrong : focusEdge ? color.focus : color.line,
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
  /** The underlying input, for a screen that has to move focus to it (a server-side field error). */
  inputRef?: React.Ref<TextInput>;
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
  inputRef,
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
      {label ? <FieldLabel label={label} required={required} /> : null}
      <TextInput
        ref={inputRef}
        placeholderTextColor={color.placeholder}
        // The kit's Focused state draws a brand caret, not the platform blue.
        selectionColor={color.brand}
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
      {/* The kit puts the helper under the input and swaps the error into its
          place, so the field never grows taller when it goes wrong. */}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <Text role="fieldHint" style={{ marginTop: FIELD_GAP }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
