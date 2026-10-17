import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text, TextInput } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

const mockStart = jest.fn();

jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ userDetails: { username: "ravi", name: "Ravi", business_name: "Ravi Rentals" } }),
}));
jest.mock("@/backend/kyc", () => ({ useStartKyc: () => mockStart, openDigiLocker: jest.fn() }));
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: undefined }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn(), reset: jest.fn() }) }));
jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: {} }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/core/segmented-choice", () => ({ SegmentedChoice: () => null }));
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T, TextInput: I, View: V } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    FieldLabel: ({ label }: any) => <T>{label}</T>,
    FieldError: ({ children }: any) => (children ? <T>{children}</T> : null),
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    EmptyState: ({ title }: any) => <T>{title}</T>,
    TextField: ({ label, error, ...props }: any) => (
      <V>
        <I accessibilityLabel={label} {...props} />
        {error ? <T>{error}</T> : null}
      </V>
    ),
    // Like the real one: a disabled button is a disabled touchable, which takes no presses.
    Button: ({ children, onPress, disabled }: any) => (
      <P accessibilityRole="button" onPress={onPress} disabled={disabled}>
        <T>{children}</T>
      </P>
    ),
  };
});
jest.mock("@/lib/events", () => ({ track: jest.fn() }));
jest.mock("@/lib/haptics", () => ({ errorFeedback: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { info: jest.fn(), error: jest.fn() } }));

// eslint-disable-next-line import/first
import KycDetailsScreen from "../details";

const PAN_ERROR = "Enter a valid 10-character PAN, like ABCDE1234F.";

const render = () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<KycDetailsScreen />);
  });
  return renderer;
};
const texts = (renderer: any): string[] => renderer.root.findAllByType(Text).map((t: any) => String(t.props.children));
const panInput = (renderer: any) => renderer.root.findAllByType(TextInput).find((i: any) => i.props.accessibilityLabel === "PAN");
const type = (renderer: any, value: string) => act(() => panInput(renderer).props.onChangeText(value));

describe("the business details form, with a badly formed PAN", () => {
  it("says what is wrong when the greyed Continue is tapped, and clears once the PAN is well formed", async () => {
    const renderer = render();
    type(renderer, "ABC123");
    expect(texts(renderer)).not.toContain(PAN_ERROR);

    const button = renderer.root.findAll((node: any) => node.props.accessibilityRole === "button")[0];
    expect(button.props.disabled).toBe(true); // still greyed: the styling does not change
    // The disabled button takes no touch, so the press lands on what holds it.
    const holder = renderer.root.findAll((node: any) => node.props.accessible === false && node.props.onPress)[0];
    expect(holder.props.disabled).toBe(false);
    await act(async () => {
      await holder.props.onPress();
    });
    expect(texts(renderer)).toContain(PAN_ERROR);
    expect(mockStart).not.toHaveBeenCalled();

    type(renderer, "ABCDE1234");
    expect(texts(renderer)).toContain(PAN_ERROR);
    type(renderer, "ABCDE1234F");
    expect(texts(renderer)).not.toContain(PAN_ERROR);
  });

  it("says what is wrong when the field is left", () => {
    const renderer = render();
    type(renderer, "ABC123");
    act(() => panInput(renderer).props.onBlur());
    expect(texts(renderer)).toContain(PAN_ERROR);
  });
});
