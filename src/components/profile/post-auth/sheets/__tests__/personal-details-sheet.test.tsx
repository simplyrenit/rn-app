import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text as RNText, TouchableOpacity } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// The Personal details frames a device can't reach safely: 2096:27891 (the system photo picker), 30681 and 30862 (a
// real email or SMS would go out), and 30954 (no password is typed on a device). Every send is mocked here.

const mockSendOTP = jest.fn(async (_email: string) => undefined);
const mockRequestPhoneOtp = jest.fn(async (_phone: string) => undefined);
jest.mock("@/backend/auth", () => ({
  useAuth: () => ({
    sendOTP: mockSendOTP,
    verifyOTP: jest.fn(),
    requestPhoneNumberChangeOtp: mockRequestPhoneOtp,
    verifyPhoneNumberChange: jest.fn(),
  }),
}));
jest.mock("@/backend/kyc", () => ({ useKycStatus: () => ({ data: undefined }) }));
jest.mock("@/backend/profile", () => ({
  useProfile: () => ({
    getMyDetails: async () => ({
      username: "riya_sharma",
      email: "riya.sharma@gmail.com",
      first_name: "Riya",
      last_name: "Sharma",
      phone: "+91 98765 43210",
      image: null,
    }),
    updateMyProfileImage: jest.fn(),
    updateMyDetails: jest.fn(),
    deleteMyAccount: jest.fn(),
    loading: false,
  }),
}));
// Unlocked, so a pencil opens its sheet with no unlock sheet (and no text) first.
jest.mock("@/backend/unlock", () => ({
  fetchUnlock: async () => ({ unlocked: true, unlocked_until: "2099-01-01T00:00:00Z", phone_masked: "+91 ••••• ••210", minutes: 30 }),
}));
jest.mock("@/components/bank/unlock-sheet", () => {
  const actual: any = jest.requireActual("@/components/bank/unlock-sheet");
  const R = require("react");
  return { otpBox: actual.otpBox, otpRow: actual.otpRow, UnlockSheet: R.forwardRef(() => null) };
});
jest.mock("../DeleteAccountModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/context/global-context", () => ({
  useGlobalContext: () => ({ theme: "light", userDetails: { business_verified: false } }),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));
jest.mock("expo-image-picker", () => ({
  MediaTypeOptions: { Images: "Images" },
  requestMediaLibraryPermissionsAsync: async () => ({ status: "granted" }),
  launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: "file:///picked-photo.jpg" }] }),
  requestCameraPermissionsAsync: async () => ({ status: "granted" }),
  launchCameraAsync: async () => ({ canceled: true, assets: [] }),
}));
jest.mock("react-native-country-picker-modal", () => ({
  __esModule: true,
  default: ({ renderFlagButton }: any) => renderFlagButton({ onOpen: () => undefined }),
  DARK_THEME: {},
}));
jest.mock("react-native-otp-textinput", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: (props: any) => <View testID="otp" {...props} /> };
});
jest.mock("react-native-heroicons/outline", () => {
  const { View } = require("react-native");
  const icon = (name: string) => (props: any) => <View testID={name} {...props} />;
  return {
    CameraIcon: icon("CameraIcon"),
    CheckIcon: icon("CheckIcon"),
    ExclamationCircleIcon: icon("ExclamationCircleIcon"),
    EyeIcon: icon("EyeIcon"),
    EyeSlashIcon: icon("EyeSlashIcon"),
    PencilSquareIcon: icon("PencilSquareIcon"),
    PhotoIcon: icon("PhotoIcon"),
    TrashIcon: icon("TrashIcon"),
  };
});
jest.mock("react-native-heroicons/mini", () => {
  const { View } = require("react-native");
  return { ChevronDownIcon: (props: any) => <View testID="ChevronDownIcon" {...props} /> };
});
// The sheet as gorhom keeps it: nothing drawn until presented.
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
    Avatar: (props: any) => <View testID="avatar" {...props} />,
    FieldError: ({ children }: any) => <Text testID="field-error">{children}</Text>,
    SheetHeader: (props: any) => <Text testID="sheet-header">{props.title}</Text>,
    SheetFooter: (props: any) => <Text testID="sheet-footer">{props.primary.label}</Text>,
    TextField: (props: any) => <View testID="text-field" {...props} />,
  };
});

// eslint-disable-next-line import/first
import PersonalDetailsSheet from "../PersonaldetailsSheet";
// eslint-disable-next-line import/first
import { SheetFooter, SheetHeader, TextField } from "@/components/core";

const flush = () => act(async () => {});
// Host nodes only: a mocked component and the View it draws both carry the props.
const icons = (node: any, name: string, size: number) =>
  node.findAll((n: any) => typeof n.type === "string" && n.props.testID === name && n.props.size === size);

/** The sheets on screen, newest last, as [title, sheet node]. */
const openSheets = (root: any) =>
  root
    .findAllByProps({ testID: "sheet" })
    .filter((node: any) => node.props.snapPoints)
    .map((node: any) => [node.findAllByType(SheetHeader)[0]?.props.title, node] as const);
const sheet = (root: any, title: string) => openSheets(root).find(([t]: any) => t === title)?.[1];
const texts = (node: any) => node.findAllByType(RNText).map((text: any) => text.props.children);
const press = (node: any, label: string) =>
  act(async () => {
    node.find((n: any) => n.props.accessibilityLabel === label && n.props.onPress).props.onPress();
  });

const mounted: any[] = [];
afterEach(() => {
  // Unmounted inside the test, so the touchables' press animations do not run on after it.
  act(() => mounted.splice(0).forEach((renderer) => renderer.unmount()));
});

async function openDetails() {
  const ref = React.createRef<any>();
  let renderer: any;
  await act(async () => {
    renderer = TestRenderer.create(<PersonalDetailsSheet bottomSheetModalRef={ref} isDarkMode={false} />);
  });
  mounted.push(renderer);
  await act(async () => ref.current.present());
  await flush();
  return renderer.root;
}

describe("PersonalDetailsSheet", () => {
  it("draws 2096:27684: kit header with X, initials avatar, the four 70 rows, centred danger delete; 478 high", async () => {
    const root = await openDetails();
    const details = sheet(root, "Personal details");
    expect(details.props.snapPoints).toEqual([478]);
    const header = details.findAllByType(SheetHeader)[0].props;
    expect(header).toMatchObject({ grabber: false });
    expect(header.onClose).toEqual(expect.any(Function));
    expect(details.findByProps({ testID: "avatar" }).props).toMatchObject({ name: "Riya Sharma", size: 48, uri: undefined });
    expect(texts(details)).toEqual(
      expect.arrayContaining(["Profile picture", "Upload", "Full name", "Riya Sharma", "Email address", "riya.sharma@gmail.com", "Phone number", "+91 98765 43210", "Password", "Delete my account"])
    );
    expect(icons(details, "PencilSquareIcon", 20)).toHaveLength(4);
  });

  it("2096:27891: a picked photo shows in the avatar, Upload goes, and Update profile picture is the footer's Primary", async () => {
    const root = await openDetails();
    await press(sheet(root, "Personal details"), "Upload profile picture");
    const picture = sheet(root, "Profile picture");
    expect(picture).toBeDefined();
    // 2096:28005: two dashed 168 tiles under the NEW sheet header.
    const tiles = picture.findAll((n: any) => n.props.accessibilityRole === "button" && n.props.style?.height === 168);
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles[0].props.style).toMatchObject({ borderStyle: "dashed", borderRadius: 12 });
    expect(picture.props.snapPoints).toEqual([273]);

    await act(async () => tiles[0].props.onPress());
    await flush();

    const details = sheet(root, "Personal details");
    expect(details.findByProps({ testID: "avatar" }).props.uri).toBe("file:///picked-photo.jpg");
    expect(texts(details)).not.toContain("Upload");
    const footer = details.findAllByType(SheetFooter);
    expect(footer).toHaveLength(1);
    expect(footer[0].props.primary.label).toBe("Update profile picture");
    expect(details.props.snapPoints).toEqual([478 + 85]);
  });

  it("2096:30681: after Verify, the email sheet shows the code step: six 50×56 boxes 8 apart, Resend OTP as a text link, Done in the footer", async () => {
    const root = await openDetails();
    await press(sheet(root, "Personal details"), "Edit email address");
    let email = sheet(root, "Edit email address");
    expect(email).toBeDefined();
    const field = email.findAllByType(TextField)[0];
    expect(field.props.label).toBe("New email address");
    await act(async () => field.props.onChangeText("riya.work@outlook.com"));
    email = sheet(root, "Edit email address");
    expect(email.findAllByType(SheetFooter)[0].props.primary.label).toBe("Verify");
    expect(email.props.snapPoints).toEqual([73 + 108 + 85]);
    await act(async () => email.findAllByType(SheetFooter)[0].props.primary.onPress());
    await flush();
    expect(mockSendOTP).toHaveBeenCalledWith("riya.work@outlook.com");

    email = sheet(root, "Edit email address");
    expect(texts(email)).toEqual(expect.arrayContaining(["Enter verification code", "Resend OTP"]));
    const otp = email.findByProps({ testID: "otp" });
    expect(otp.props.inputCount).toBe(6);
    expect(otp.props.textInputStyle).toMatchObject({ height: 56, borderRadius: 12 });
    expect(otp.props.containerStyle).toMatchObject({ gap: 8 });
    expect(email.findAllByType(SheetFooter)[0].props.primary.label).toBe("Done");
    expect(email.props.snapPoints).toEqual([73 + 156 + 85]);
  });

  it("2096:30773 / 30862: the IN +91 trigger beside the field, then the code step after Verify", async () => {
    const root = await openDetails();
    await press(sheet(root, "Personal details"), "Edit phone number");
    let phone = sheet(root, "Edit phone number");
    expect(texts(phone)).toEqual(expect.arrayContaining(["IN", "+91"]));
    expect(phone.findAllByProps({ testID: "ChevronDownIcon" }).length).toBeGreaterThan(0);
    expect(phone.props.snapPoints).toEqual([73 + 80 + 85]);
    await act(async () => phone.findAllByType(TextField)[0].props.onChangeText("9876543210"));
    phone = sheet(root, "Edit phone number");
    await act(async () => phone.findAllByType(SheetFooter)[0].props.primary.onPress());
    await flush();
    expect(mockRequestPhoneOtp).toHaveBeenCalledWith("+919876543210");

    phone = sheet(root, "Edit phone number");
    expect(texts(phone)).toEqual(expect.arrayContaining(["Enter verification code", "Resend OTP"]));
    expect(phone.findByProps({ testID: "otp" }).props.inputCount).toBe(6);
    expect(phone.findAllByType(SheetFooter)[0].props.primary.label).toBe("Done");
    // The X resets the step, as the back arrow did.
    await act(async () => phone.findAllByType(SheetHeader)[0].props.onClose());
  });

  it("2096:30954: two labelled password fields with eyes; every rule, met (check, 70%) or not (exclamation, 60%); Verify & change in the footer", async () => {
    const root = await openDetails();
    await press(sheet(root, "Personal details"), "Edit password");
    let password = sheet(root, "Edit password");
    const fields = password.findAllByType(TextField);
    expect(fields.map((f: any) => f.props.label)).toEqual(["Current password", "New password"]);
    expect(password.findAllByType(TouchableOpacity).filter((n: any) => n.props.accessibilityLabel === "Show or hide password")).toHaveLength(2);
    expect(password.props.snapPoints).toEqual([73 + 200 + 85]);

    await act(async () => fields[1].props.onChangeText("abcdefg1"));
    password = sheet(root, "Edit password");
    expect(password.props.snapPoints).toEqual([73 + 340 + 85]);
    expect(texts(password)).toContain("Your password must include:");
    const rule = (text: string) => password.findAll((n: any) => n.type === RNText && n.props.children === text)[0].props;
    expect(rule("Password must be at least 8 characters.").tone).toBe("body");
    expect(rule("Password must include at least 1 special character.").tone).toBe("dim");
    expect(rule("Password must include at least 1 number.").tone).toBe("body");
    expect(icons(password, "CheckIcon", 16)).toHaveLength(2);
    expect(icons(password, "ExclamationCircleIcon", 16)).toHaveLength(1);
    expect(password.findAllByType(SheetFooter)[0].props.primary.label).toBe("Verify & change");
  });
});
