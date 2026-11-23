import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text as RNText } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// 2096:30504 (unlock-code-sheet · code sent). Opening the sheet sends a Firebase SMS and the countdown runs on the
// clock, so it is checked here with the send mocked and fake timers.

const mockRequestOtp = jest.fn(async (_phone: string) => undefined);
jest.mock("@/backend/auth", () => ({
  useAuth: () => ({ requestPhoneNumberChangeOtp: mockRequestOtp, verifyPhoneNumberChange: jest.fn() }),
}));
jest.mock("@/backend/unlock", () => ({ postUnlock: jest.fn() }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ theme: "light" }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/components/core/custom-bottom-sheet-modal", () => {
  const R = require("react");
  const { View } = require("react-native");
  const Sheet = R.forwardRef((props: any, ref: any) => {
    const [open, setOpen] = R.useState(false);
    R.useImperativeHandle(ref, () => ({ present: () => setOpen(true), dismiss: () => setOpen(false), close: () => setOpen(false) }));
    return open ? (
      <View testID="sheet" {...({ snapPoints: props.snapPoints } as any)}>
        {props.children}
      </View>
    ) : null;
  });
  return { __esModule: true, default: Sheet };
});
jest.mock("@/components/core", () => {
  const { Text } = require("react-native");
  return {
    Text: (props: any) => <Text {...props} />,
    Button: ({ children }: any) => <Text>{children}</Text>,
    SheetHeader: (props: any) => <Text testID="sheet-header">{props.title}</Text>,
    SheetFooter: (props: any) => <Text testID="sheet-footer">{props.primary.label}</Text>,
  };
});
jest.mock("react-native-otp-textinput", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: (props: any) => <View testID="otp" {...props} /> };
});

// eslint-disable-next-line import/first
import { UnlockSheet, UnlockSheetHandle, otpBox } from "../unlock-sheet";
// eslint-disable-next-line import/first
import { lightColors } from "@/lib/design-tokens";

const texts = (root: any) => root.findAllByType(RNText).map((node: any) => node.props.children);

describe("otpBox (2096:30504, 30681, 30862)", () => {
  it("is 50×56 on a 390 phone (six 50s, 8 apart, 340 inside the gutters) and narrows on a 360 one", () => {
    expect(otpBox(390, lightColors)).toMatchObject({ width: 50, height: 56, borderRadius: 12, borderWidth: 1, fontSize: 20, margin: 0 });
    expect(otpBox(360, lightColors).width).toBe(45);
    expect(6 * otpBox(360, lightColors).width + 5 * 8).toBeLessThanOrEqual(360 - 48);
  });
});

describe("UnlockSheet layout=\"sheet\" (2096:30504)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends the code on open and draws the left-aligned kit sheet: title (no X), body, Sent to, six boxes, the countdown, Unlock and Cancel", async () => {
    const ref = React.createRef<UnlockSheetHandle>();
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <UnlockSheet
          ref={ref}
          layout="sheet"
          phoneMasked="+91 ••••• ••210"
          minutes={30}
          phone="+91 98765 43210"
          onUnlocked={jest.fn()}
          onPhoneRequired={jest.fn()}
        />
      );
    });
    await act(async () => {
      ref.current?.open();
    });
    expect(mockRequestOtp).toHaveBeenCalledWith("+919876543210");
    // The countdown starts at 0:30; the frame shows it six seconds in.
    for (let i = 0; i < 6; i += 1) act(() => jest.advanceTimersByTime(1000));

    const root = renderer.root;
    const header = root.findByProps({ testID: "sheet-header" });
    expect(header.props.children).toBe("Enter the code we sent to the owner's phone");
    // The header mock takes every prop the sheet passes: no onClose (no X), and no lock disc anywhere.
    const headerProps = root.findAll((node: any) => node.props.title === "Enter the code we sent to the owner's phone")[0].props;
    expect(headerProps.onClose).toBeUndefined();
    expect(headerProps.grabber).toBe(false);

    expect(texts(root)).toEqual(
      expect.arrayContaining([
        "Changing where you're paid needs a fresh code. It unlocks this phone for 30 minutes.",
        "Sent to +91 ••••• ••210",
        "Send again in 0:24",
      ])
    );
    const otp = root.findByProps({ testID: "otp" });
    expect(otp.props.inputCount).toBe(6);
    expect(otp.props.containerStyle).toMatchObject({ gap: 8, justifyContent: "flex-start" });
    expect(otp.props.textInputStyle).toMatchObject({ height: 56, borderRadius: 12 });

    const footer = root.findAll((node: any) => node.props.primary && node.props.secondary)[0].props;
    expect(footer.primary).toMatchObject({ label: "Unlock", disabled: true });
    expect(footer.secondary).toMatchObject({ label: "Cancel" });
    // Six digits make Unlock live.
    act(() => otp.props.handleTextChange("482196"));
    expect(root.findAll((node: any) => node.props.primary && node.props.secondary)[0].props.primary.disabled).toBe(false);

    // Body, Sent to and the countdown are 14/20; Sent to and the countdown at 60%, the body at 70%.
    const sentTo = root.findAll((node: any) => node.type === RNText && node.props.children === "Sent to +91 ••••• ••210")[0];
    expect(sentTo.props).toMatchObject({ fontSize: "text-sm", lineHeight: 20, tone: "dim" });
    const body = root.findAll((node: any) => node.type === RNText && String(node.props.children).startsWith("Changing"))[0];
    expect(body.props).toMatchObject({ fontSize: "text-sm", lineHeight: 20, tone: "body" });
  });
});
