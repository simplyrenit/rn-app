import { describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Modal, Text as RNText } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// 2096:31063 (the confirm sheet) and 2096:31168 (the blocked card). 31168 needs a 409 `open_bookings` body that no
// design fixture can give, and the delete is never tapped on a device, so both are checked here.

jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ theme: "light" }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
// The sheet as gorhom keeps it: nothing drawn until presented; dismiss closes it and then runs onDismiss.
jest.mock("@/components/core/custom-bottom-sheet-modal", () => {
  const R = require("react");
  const { View } = require("react-native");
  const Sheet = R.forwardRef((props: any, ref: any) => {
    const [open, setOpen] = R.useState(false);
    const latest = R.useRef(props);
    latest.current = props;
    R.useImperativeHandle(ref, () => ({
      present: () => setOpen(true),
      dismiss: () => {
        setOpen(false);
        latest.current.onDismiss?.();
      },
      close: () => setOpen(false),
    }));
    return open ? (
      <View testID="sheet" {...({ snapPoints: props.snapPoints } as any)}>
        {props.children}
      </View>
    ) : null;
  });
  return { __esModule: true, default: Sheet };
});
jest.mock("@/components/core/text", () => {
  const { Text } = require("react-native");
  return { Text: (props: any) => <Text {...props} /> };
});
jest.mock("@/components/core/button", () => {
  const { Pressable, Text } = require("react-native");
  return {
    Button: ({ children, ...props }: any) => (
      <Pressable accessibilityRole="button" {...props}>
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});
jest.mock("@/components/core/sheet-header", () => {
  const { Text } = require("react-native");
  return { SheetHeader: (props: any) => <Text testID="sheet-header">{props.title}</Text> };
});
jest.mock("@/components/core", () => ({
  ...require("@/components/core/text"),
  ...require("@/components/core/button"),
}));

// eslint-disable-next-line import/first
import DeleteAccountModal from "../DeleteAccountModal";
// eslint-disable-next-line import/first
import { confirmSheetHeight } from "@/components/core/confirm-sheet";
// eslint-disable-next-line import/first
import { Button } from "@/components/core/button";

const TITLE = "Are you sure you want to delete your account?";
const blocked = {
  blocked: true,
  text: "Your account can be closed once everything you have open with Renit is finished.",
  items: [
    { kind: "booking", booking: "B1", role: "customer" as const, text: "Sony PS5, Sat 7 to Mon 9 Nov: not finished" },
    { kind: "deposit", booking: "B2", role: "owner" as const, text: "Canon EOS R10, Thu 12 Nov: deposit not returned yet" },
  ],
};

const texts = (root: any) => root.findAllByType(RNText).map((node: any) => node.props.children).flat();
const sheetOf = (root: any) => root.findAllByProps({ testID: "sheet" }).find((node: any) => node.props.snapPoints);
const layout = (lines: number) => ({ nativeEvent: { lines: Array.from({ length: lines }, () => ({})) } });
// The measuring copy's Texts (they carry onTextLayout), in order: title, body, error.
const measured = (root: any) => root.findAllByType(RNText).filter((node: any) => node.props.onTextLayout);

function mount(props: Partial<React.ComponentProps<typeof DeleteAccountModal>> = {}) {
  const onDelete = jest.fn();
  const onCancel = jest.fn();
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<DeleteAccountModal open onDelete={onDelete} onCancel={onCancel} {...props} />);
  });
  const rerender = (next: Partial<React.ComponentProps<typeof DeleteAccountModal>>) =>
    act(() => renderer.update(<DeleteAccountModal open onDelete={onDelete} onCancel={onCancel} {...props} {...next} />));
  return { root: renderer.root, onDelete, onCancel, rerender };
}

describe("ConfirmSheet height (kit change, 2097:28985 and 2096:31063)", () => {
  it("sizes the sheet to its lines: a two-line body is 245, a two-line title with no body 217 (frames 266 / 238 less the 21 home strip)", () => {
    expect(confirmSheetHeight(1, 2)).toBe(245);
    expect(confirmSheetHeight(2, 0)).toBe(217);
    expect(confirmSheetHeight(1, 4)).toBe(285);
  });
});

describe("DeleteAccountModal (2096:31063 confirm, 2096:31168 blocked)", () => {
  it("presents the kit Confirm destructive only once the title is measured, at 217: title, no body, Delete in the 56 Destructive, Cancel muted", () => {
    const { root, onDelete } = mount();
    expect(sheetOf(root)).toBeUndefined();

    const [title] = measured(root);
    expect(title.props.children).toBe(TITLE);
    act(() => title.props.onTextLayout(layout(2)));

    const sheet = sheetOf(root);
    expect(sheet.props.snapPoints).toEqual([217]);
    expect(root.findByProps({ testID: "sheet-header" }).props.children).toBe(TITLE);
    const [destroy, cancel] = sheet.findAllByType(Button);
    expect(destroy.props).toMatchObject({ variant: "warning" });
    expect(destroy.props.style).toEqual(expect.arrayContaining([{ minHeight: 56 }]));
    expect(cancel.props).toMatchObject({ variant: "ghost", tone: "muted" });
    expect(texts(sheet)).toEqual(expect.arrayContaining(["Delete", "Cancel"]));
    // No inline red fill anywhere.
    expect(JSON.stringify(destroy.props.style)).not.toMatch(/backgroundColor/);

    act(() => destroy.props.onPress());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("says a failure that is not a block in the sheet, as a danger alert, and grows the sheet by its lines", () => {
    const { root, rerender } = mount();
    act(() => measured(root)[0].props.onTextLayout(layout(2)));
    rerender({ problem: { blocked: false, text: "We couldn't close your account. Try again.", items: [] } });
    const alert = sheetOf(root).findByProps({ accessibilityRole: "alert" });
    expect(alert.props.children).toBe("We couldn't close your account. Try again.");
    act(() => measured(root)[1].props.onTextLayout(layout(1)));
    expect(sheetOf(root).props.snapPoints).toEqual([confirmSheetHeight(2, 1)]);
  });

  it("swaps to the blocked card after the sheet has gone, without cancelling; Close cancels once", () => {
    const { root, onCancel, rerender } = mount({ busy: true });
    act(() => measured(root)[0].props.onTextLayout(layout(2)));
    expect(sheetOf(root)).toBeDefined();

    // The 409 open_bookings lands while the sheet is up.
    rerender({ busy: false, problem: blocked });
    expect(sheetOf(root)).toBeUndefined();
    expect(onCancel).not.toHaveBeenCalled();

    const modal = root.findByType(Modal);
    expect(modal.props.visible).toBe(true);
    expect(texts(modal)).toEqual(
      expect.arrayContaining([
        "Your account can't be closed yet",
        blocked.text,
        "Booking · as the customer",
        "Sony PS5, Sat 7 to Mon 9 Nov: not finished",
        "Deposit · as the shop",
        "Canon EOS R10, Thu 12 Nov: deposit not returned yet",
        "You are still signed in. Nothing was changed.",
      ])
    );
    const close = modal.findAllByType(Button).filter((node: any) => node.props.variant === "outline");
    expect(close).toHaveLength(1);
    expect(texts(close[0])).toEqual(["Close"]);
    act(() => close[0].props.onPress());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels when the sheet is dismissed by the person (scrim, pan or Cancel)", () => {
    const { root, onCancel } = mount();
    act(() => measured(root)[0].props.onTextLayout(layout(2)));
    const cancel = sheetOf(root).findAllByType(Button).find((node: any) => node.props.variant === "ghost");
    act(() => cancel.props.onPress());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
