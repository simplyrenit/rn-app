import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text, TextInput } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

const mockStart = jest.fn();
let mockAccountType = "merchant";
let mockParams: any = undefined;
const mockDispatch = jest.fn();

jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({
    userDetails: { username: "ravi", name: "Ravi", business_name: "Ravi Rentals", account_type: mockAccountType },
  }),
}));
jest.mock("@/backend/kyc", () => ({ useStartKyc: () => mockStart, openDigiLocker: jest.fn() }));
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: mockParams }),
  CommonActions: { reset: (state: any) => ({ type: "RESET", state }) },
}));
jest.mock("@/lib/types", () => ({
  useTypedNavigation: () => ({ navigate: jest.fn(), reset: jest.fn(), dispatch: mockDispatch }),
}));
jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: {} }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
// A plain View that keeps the props, so a test can find a choice by its label and call onChange.
jest.mock("@/components/core/segmented-choice", () => {
  const { View: V } = require("react-native");
  return { SegmentedChoice: (props: any) => <V {...props} /> };
});
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
// eslint-disable-next-line import/first
import { Button } from "@/components/core";

const PAN_ERROR = "Enter a valid 10-character PAN, like ABCDE1234F.";

const render = () => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<KycDetailsScreen />);
  });
  return renderer;
};
const texts = (renderer: any): string[] => renderer.root.findAllByType(Text).map((t: any) => String(t.props.children));
const panInput = (renderer: any) =>
  renderer.root.findAllByType(TextInput).find((i: any) => ["PAN", "Your PAN"].includes(i.props.accessibilityLabel));
const type = (renderer: any, value: string) => act(() => panInput(renderer).props.onChangeText(value));
const input = (renderer: any, label: string) =>
  renderer.root.findAllByType(TextInput).find((i: any) => i.props.accessibilityLabel === label);
const choice = (renderer: any, label: string) =>
  renderer.root.findAll((node: any) => node.props.accessibilityLabel === label && node.props.onChange)[0];
const button = (renderer: any, label: string) =>
  renderer.root.findAllByType(Button).find((b: any) => b.props.children === label);
const press = (renderer: any, label: string) => act(() => button(renderer, label).props.onPress());

beforeEach(() => {
  mockStart.mockReset();
});

describe("the business details form, with a badly formed PAN", () => {
  it("says what is wrong when the greyed Continue is tapped, and clears once the PAN is well formed", async () => {
    const renderer = render();
    type(renderer, "ABC123");
    expect(texts(renderer)).not.toContain(PAN_ERROR);

    expect(button(renderer, "Continue to DigiLocker").props.disabled).toBe(true); // still greyed: the styling does not change
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

describe("the optional Udyam or shop licence", () => {
  const ADD = "Add Udyam or shop licence (optional)";
  const UDYAM = "Udyam registration number";
  // A PAN and "not registered for GST": everything else the form needs.
  const fillRequired = (renderer: any) => {
    type(renderer, "ABCPE0000F");
    act(() => choice(renderer, "Is your business registered for GST?").props.onChange("no"));
  };
  const openUdyam = (renderer: any) => {
    press(renderer, ADD);
    act(() => choice(renderer, "Udyam or shop licence").props.onChange("udyam"));
  };
  const submit = () =>
    act(async () => {
      // The press runs submit; awaiting a tick lets the mocked start settle.
      await button(renderer, "Continue to DigiLocker").props.onPress();
    });
  let renderer: any;

  it("is a collapsed link until the merchant opens it, and is not sent then", async () => {
    renderer = render();
    expect(texts(renderer)).toContain(ADD);
    expect(choice(renderer, "Udyam or shop licence")).toBeUndefined();
    expect(input(renderer, UDYAM)).toBeUndefined();

    fillRequired(renderer);
    mockStart.mockResolvedValue({ next_action: { type: "wait" } } as never);
    await submit();
    expect(mockStart).toHaveBeenCalledTimes(1);
    const body = mockStart.mock.calls[0][0] as Record<string, unknown>;
    expect(body).not.toHaveProperty("business_registration_kind");
    expect(body).not.toHaveProperty("business_registration_number");
  });

  it("sends the kind and the upper-cased number together when filled", async () => {
    renderer = render();
    fillRequired(renderer);
    openUdyam(renderer);
    act(() => input(renderer, UDYAM).props.onChangeText(" udyam-mh-19-0001234 "));
    mockStart.mockResolvedValue({ next_action: { type: "wait" } } as never);
    await submit();
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({
        business_registration_kind: "udyam",
        business_registration_number: "UDYAM-MH-19-0001234",
      })
    );
  });

  it("drops the number when the block is removed", async () => {
    renderer = render();
    fillRequired(renderer);
    openUdyam(renderer);
    act(() => input(renderer, UDYAM).props.onChangeText("UDYAM-MH-19-0001234"));
    press(renderer, "Remove Udyam or shop licence");
    expect(input(renderer, UDYAM)).toBeUndefined();
    mockStart.mockResolvedValue({ next_action: { type: "wait" } } as never);
    await submit();
    expect(mockStart.mock.calls[0][0]).not.toHaveProperty("business_registration_number");
  });

  it("checks the Udyam pattern before anything is sent", async () => {
    renderer = render();
    fillRequired(renderer);
    openUdyam(renderer);
    act(() => input(renderer, UDYAM).props.onChangeText("UDYAM-MH-19-12"));
    act(() => input(renderer, UDYAM).props.onBlur());
    expect(texts(renderer)).toContain("Enter a valid Udyam number, like UDYAM-MH-19-0001234.");
    expect(button(renderer, "Continue to DigiLocker").props.disabled).toBe(true);
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("shows a Udyam number the server could not find on the number field", async () => {
    renderer = render();
    fillRequired(renderer);
    openUdyam(renderer);
    act(() => input(renderer, UDYAM).props.onChangeText("UDYAM-MH-19-0001234"));
    mockStart.mockRejectedValue({
      response: { status: 422, data: { error: { code: "udyam_unverifiable" } } },
    } as never);
    await submit();
    expect(texts(renderer)).toContain(
      "We couldn't find this Udyam number. Check it, or remove it to continue without it."
    );
  });

  it("shows a validation error on the registration number field", async () => {
    renderer = render();
    fillRequired(renderer);
    press(renderer, ADD);
    act(() => choice(renderer, "Udyam or shop licence").props.onChange("shop_licence"));
    act(() => input(renderer, "Shop licence number").props.onChangeText("mh/123-45"));
    mockStart.mockRejectedValue({
      response: {
        status: 422,
        data: { error: { code: "validation_error", details: { fields: { business_registration_number: "bad" } } } },
      },
    } as never);
    await submit();
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({ business_registration_kind: "shop_licence", business_registration_number: "MH/123-45" })
    );
    expect(texts(renderer)).toContain("Check the registration number and try again.");
    expect(texts(renderer)).not.toContain("Check your details and try again.");
  });
});

describe("a person's ID check (ENG-351)", () => {
  beforeEach(() => {
    mockAccountType = "user";
    mockParams = { source: "booking" };
    mockStart.mockReset();
    mockDispatch.mockReset();
  });
  afterEach(() => {
    mockAccountType = "merchant";
    mockParams = undefined;
  });

  const tapContinue = async (renderer: any) => {
    const button = renderer.root.findAll((node: any) => node.props.accessibilityRole === "button")[0];
    await act(async () => {
      await button.props.onPress();
    });
  };

  it("asks for the PAN alone and sends the individual consent, with no GST", async () => {
    mockStart.mockImplementation(async () => ({ kyc_status: "action_required", next_action: { type: "wait" } }));
    const renderer = render();
    expect(texts(renderer)).not.toContain("Is your business registered for GST?");
    expect(texts(renderer)).not.toContain("Business");
    // A Udyam or shop licence is a business's (ENG-348); rn-kyc refuses one on an ID check.
    expect(texts(renderer)).not.toContain("Add Udyam or shop licence (optional)");
    type(renderer, "ABCPE1234F");
    await tapContinue(renderer);
    expect(mockStart).toHaveBeenCalledWith({
      pan: "ABCPE1234F",
      gst_declared: false,
      consent_version: "kyc-individual-2026-10b",
    });
  });

  it("refuses a business PAN before sending it", async () => {
    const renderer = render();
    type(renderer, "ABCDE1234F"); // 4th letter D: not a person's
    await tapContinue(renderer);
    expect(texts(renderer)).toContain("Use your own PAN. A person's PAN has P as its 4th letter.");
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("from a booking, puts the status screen where the verification screens were, over the price screen", async () => {
    mockStart.mockImplementation(async () => ({ kyc_status: "action_required", next_action: { type: "wait" } }));
    const renderer = render();
    type(renderer, "ABCPE1234F");
    await tapContinue(renderer);
    const reset = mockDispatch.mock.calls[0][0] as (state: any) => any;
    const routes = [{ name: "MainTabs" }, { name: "ReviewAndBook" }, { name: "KycIntro" }, { name: "KycDetails" }];
    const next = reset({ routes, index: 3 }).state;
    expect(next.routes.map((r: any) => r.name)).toEqual(["MainTabs", "ReviewAndBook", "KycStatus"]);
    expect(next.routes[2].params).toEqual({ source: "booking" });
    expect(next.index).toBe(2);
  });
});
