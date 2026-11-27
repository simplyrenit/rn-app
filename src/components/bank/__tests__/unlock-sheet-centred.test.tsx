import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text as RNText } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// 2097:30513 (waiting for code) and 2097:30585 (wrong or expired code): the bank account's centred unlock sheet.
// Opening it sends a Firebase SMS and the countdown runs on the clock, so both are jest renders with the send mocked
// and fake timers.

const mockRequestOtp = jest.fn(async (_phone: string) => undefined);
const mockVerify = jest.fn(async (_code: string): Promise<string> => {
  throw new Error("auth/invalid-verification-code");
});
jest.mock("@/backend/auth", () => ({
  useAuth: () => ({ requestPhoneNumberChangeOtp: mockRequestOtp, verifyPhoneNumberChange: mockVerify }),
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
  const { Text, View } = require("react-native");
  return {
    Text: (props: any) => <Text {...props} />,
    BottomBar: (props: any) => <View testID="bottom-bar" {...props} />,
    SheetHeader: (props: any) => <Text testID="sheet-header">{props.title}</Text>,
    SheetFooter: (props: any) => <Text testID="sheet-footer">{props.primary.label}</Text>,
  };
});
jest.mock("react-native-otp-textinput", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: (props: any) => <View testID="otp" {...props} /> };
});

// eslint-disable-next-line import/first
import { UnlockSheet, UnlockSheetHandle } from "../unlock-sheet";
// eslint-disable-next-line import/first
import { lightColors } from "@/lib/design-tokens";
// eslint-disable-next-line import/first
import { LockClosedIcon } from "react-native-heroicons/outline";

const texts = (root: any) => root.findAllByType(RNText).map((node: any) => node.props.children);
const textNode = (root: any, match: (t: string) => boolean) =>
  root.findAll((node: any) => node.type === RNText && typeof node.props.children === "string" && match(node.props.children))[0];

async function openSheet() {
  const ref = React.createRef<UnlockSheetHandle>();
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(
      <UnlockSheet
        ref={ref}
        phoneMasked="··· ··· 4471"
        minutes={30}
        phone="+91 90000 04471"
        onUnlocked={jest.fn()}
        onPhoneRequired={jest.fn()}
      />
    );
  });
  await act(async () => {
    ref.current?.open();
  });
  return renderer.root;
}

describe("UnlockSheet centred (2097:30513, 30585)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRequestOtp.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("waiting for code: lock disc, centred title, Sent to, six 48×56 boxes 8 apart, the countdown, Cancel and Unlock", async () => {
    const root = await openSheet();
    expect(mockRequestOtp).toHaveBeenCalledWith("+919000004471");
    // The countdown starts at 0:30; the frame shows it six seconds in.
    for (let i = 0; i < 6; i += 1) act(() => jest.advanceTimersByTime(1000));

    expect(root.findAllByType(LockClosedIcon)[0].props).toMatchObject({ size: 26, color: lightColors.brandText });
    expect(texts(root)).toEqual(
      expect.arrayContaining([
        "Enter the code we sent to\nthe owner's phone",
        "Changing where you're paid needs a fresh code. It unlocks this phone for 30 minutes.",
        "Sent to ··· ··· 4471",
        "Send again in 0:24",
      ])
    );
    // No kit title row: the centred heading is the frame's 18/24 Bold, not a SheetHeader.
    expect(root.findAll((node: any) => node.props.testID === "sheet-header")).toHaveLength(0);
    expect(textNode(root, (t) => t.startsWith("Enter the code")).props).toMatchObject({ role: "sectionTitle" });
    expect(textNode(root, (t) => t.startsWith("Changing")).props).toMatchObject({ fontSize: "text-sm", lineHeight: 20, tone: "body" });
    expect(textNode(root, (t) => t.startsWith("Sent to")).props).toMatchObject({ fontSize: "text-sm", lineHeight: 20, tone: "dim" });

    const otp = root.findByProps({ testID: "otp" });
    expect(otp.props.inputCount).toBe(6);
    expect(otp.props.containerStyle).toEqual({ justifyContent: "center", gap: 8 });
    // jest's window is wider than 390, so this is the frame's 48 (a 360dp phone gets otpBox's 45).
    expect(otp.props.textInputStyle).toMatchObject({ width: 48, height: 56, borderRadius: 12, borderWidth: 1, fontSize: 20 });
    expect(otp.props.tintColor).toBe(lightColors.brand);
    expect(otp.props.offTintColor).toBe(lightColors.line);

    const bar = root.findByProps({ testID: "bottom-bar" }).props;
    expect(bar.layout).toBe("secondary-primary");
    expect(bar.secondary).toMatchObject({ label: "Cancel" });
    expect(bar.primary).toMatchObject({ label: "Unlock", disabled: true });
    act(() => otp.props.handleTextChange("482"));
    expect(root.findByProps({ testID: "bottom-bar" }).props.primary.disabled).toBe(true);

    // 463 − the 21 home strip, plus the (zero) inset: handle 21 + body 336 + bar 85.
    expect(root.findByProps({ testID: "sheet" }).props.snapPoints).toEqual([442]);
  });

  it("wrong or expired code: red boxes, the error 14/20 Medium dangerStrong, then the Send again link", async () => {
    const root = await openSheet();
    act(() => root.findByProps({ testID: "otp" }).props.handleTextChange("482915"));
    await act(async () => {
      await root.findByProps({ testID: "bottom-bar" }).props.primary.onPress();
    });
    expect(mockVerify).toHaveBeenCalledWith("482915");
    // The frame shows the link: the 30s countdown has run out.
    for (let i = 0; i < 31; i += 1) act(() => jest.advanceTimersByTime(1000));

    const error = textNode(root, (t) => t.startsWith("That code didn't match"));
    expect(error.props.children).toBe("That code didn't match, or it has expired. Check it, or send a new one.");
    expect(error.props).toMatchObject({ fontSize: "text-sm", lineHeight: 20, fontWeight: "font-medium" });
    expect(error.props.style).toMatchObject({ textAlign: "center", color: lightColors.dangerStrong });

    const otp = root.findByProps({ testID: "otp" });
    expect(otp.props.tintColor).toBe(lightColors.dangerStrong);
    expect(otp.props.offTintColor).toBe(lightColors.dangerStrong);

    const link = textNode(root, (t) => t === "Send again");
    expect(link.props).toMatchObject({ fontSize: "text-sm", lineHeight: 20, fontWeight: "font-semibold" });
    expect(link.props.style).toMatchObject({ color: lightColors.brandText });
    expect(texts(root)).not.toContain("Send again in 0:00");
  });
});
