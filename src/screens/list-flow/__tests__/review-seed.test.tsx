import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";
import { createDraft } from "@/lib/list-flow/draft";

// Plan §0.3 / §6 J1: under a design seed, Review's writes, its navigation into the flow, the Pickup picker (sheet or
// map, and the location prompt behind it) and the pickup prefill return early. The unseeded control presses the same
// controls and must reach them, so the seeded assertions cannot pass by never getting there.
const mockNavigate = jest.fn();
const mockDefaultPickup = jest.fn((_saved: unknown) => Promise.resolve(null));
const mockCreateLocationRequest = jest.fn((_cb: unknown) => "request-1");
const mockReal: any = {};
let mockParams: any;

jest.mock("@/backend/list-flow/pickup-location", () => ({
  defaultPickupLocation: (saved: unknown) => mockDefaultPickup(saved),
  localityFor: jest.fn(),
}));
jest.mock("@/backend/list-flow/deposit-rules", () => ({
  useDepositRules: () => ({ data: undefined }),
  ruleForParent: jest.fn(),
}));
jest.mock("@/backend/useAddresses", () => ({
  __esModule: true,
  default: () => ({ addresses: [], loading: false, isError: false }),
}));
jest.mock("@/lib/location-request", () => ({ createLocationRequest: (cb: unknown) => mockCreateLocationRequest(cb) }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ categories: [] }) }));
jest.mock("@/context/list-draft-context", () => ({ useListDraft: () => mockReal }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate, addListener: () => () => {} }) }));
jest.mock("@/lib/category-icons", () => ({ CategoryIcon: () => null, categoryDisplayName: (t: string) => t }));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("react-native-heroicons/mini", () => ({ PlusIcon: () => null }));
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: { View } };
});
jest.mock("react-native-keyboard-aware-scroll-view", () => {
  const { View } = require("react-native");
  return { KeyboardAwareScrollView: View };
});
jest.mock("@/components/list-flow/motion", () => ({
  AiValueFade: ({ children }: any) => children,
  PulseOnce: ({ children }: any) => children,
  useAppear: () => ({}),
}));
jest.mock("@/components/list-flow/flow-header", () => ({ FlowHeader: () => null }));
// ENG-454: it reads the checklist through react-query; this test has no client, and the section is left out under a seed.
jest.mock("@/components/list-flow/included-items", () => ({ IncludedItemsSection: () => null }));
jest.mock("@/components/post/plan-pricing", () => ({ PlanPricing: () => null }));
jest.mock("@/components/core/segmented-choice", () => ({ SegmentedChoice: () => null }));
jest.mock("@/components/core/switch", () => ({ AppSwitch: () => null }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/booking/parts", () => ({ Notice: () => null }));
jest.mock("@/components/addresses/address-picker-sheet", () => {
  const React = require("react");
  return { AddressPickerSheet: React.forwardRef(() => null) };
});
jest.mock("@/components/addresses/pickup-field", () => {
  const { Pressable } = require("react-native");
  return {
    PickerField: ({ onPress, accessibilityLabel }: any) => <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} />,
    PickupField: ({ onChange, onChangeFlat }: any) => (
      <>
        <Pressable accessibilityLabel="pickup" onPress={onChange} />
        <Pressable accessibilityLabel="flat" onPress={() => onChangeFlat("Flat 4, Hill View")} />
      </>
    ),
  };
});
jest.mock("@/components/list-flow/category-sheet", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    CategorySheet: React.forwardRef(({ onSelect }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return <Pressable accessibilityLabel="pick-category" onPress={() => onSelect({ id: 7, parent: "Books", title: "Fiction" })} />;
    }),
  };
});
jest.mock("@/components/list-flow/specs-card", () => {
  const React = require("react");
  const { Pressable } = require("react-native");
  return {
    SpecsCard: ({ onPressSpec }: any) => (
      <Pressable accessibilityLabel="spec-row" onPress={() => onPressSpec({ key: "format", label: "Format" })} />
    ),
    SpecSheet: React.forwardRef(({ onSave, onCancel }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ present: jest.fn(), dismiss: jest.fn() }));
      return (
        <>
          <Pressable accessibilityLabel="save-spec" onPress={() => onSave("Paperback")} />
          <Pressable accessibilityLabel="cancel-spec" onPress={onCancel} />
        </>
      );
    }),
  };
});
jest.mock("@/components/core", () => {
  const { Pressable, Text: T, View: V } = require("react-native");
  const Pass = ({ children }: any) => <V>{children}</V>;
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    Button: ({ children, onPress, accessibilityLabel }: any) => (
      <Pressable accessibilityLabel={accessibilityLabel ?? children} onPress={onPress}>
        <T>{children}</T>
      </Pressable>
    ),
    BottomBar: Pass,
    FieldLabel: () => null,
    FieldShell: Pass,
    SectionHeader: () => null,
    StepProgress: () => null,
    TextField: () => null,
  };
});

// eslint-disable-next-line import/first
import ListReviewScreen from "../review";

/** The 1984 draft Review shows in 2083:14692, but with no pickup yet, so the prefill has something to fill. */
function bookDraft() {
  const draft = createDraft("design-attempt", 0);
  draft.photos = [{ id: "p1", localUri: "file:///p1.jpg", remoteUrl: "https://example.test/p1.jpg", source: "camera", status: "done" }];
  draft.fields.title = { value: "1984 – George Orwell", source: "ai" };
  draft.fields.category = { value: { id: 7, parent: "Books", title: "Fiction" }, source: "ai" };
  draft.fields.worth = { value: "350", source: "ai" };
  return draft;
}

/** Everything Preview waits for, so "Preview listing" takes the ready path. */
function completeDraft() {
  const draft = bookDraft();
  draft.fields.description = { value: "Paperback, clean pages.", source: "ai" };
  draft.fields.plans = { value: [{ unit: "day", price: "40", min: 1 }], source: "user" };
  draft.fields.security_deposit = { value: "120", source: "ai" };
  draft.fields.condition = { value: "good", source: "user" };
  draft.conditionConfirmed = true;
  draft.fields.location = {
    value: { locality: "Thane West", fullAddress: "Flat 4", lat: 19.1972, long: 72.9722 },
    source: "user",
  };
  draft.fields.worth = { value: "350", source: "user" };
  draft.fields.quantity = { value: "1", source: "user" };
  return draft;
}

const actions = [
  "dispatch",
  "startFresh",
  "resume",
  "discard",
  "clearSubmitted",
  "addPhotos",
  "replacePhoto",
  "retryPhoto",
  "removePhoto",
  "startExtraction",
  "cancelExtraction",
  "ensureSpecs",
  "track",
];

const mounted: any[] = [];
const render = (params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<ListReviewScreen />);
  });
  mounted.push(renderer);
  return renderer;
};
const tap = (r: any, label: string) =>
  act(() => {
    r.root.find((n: any) => n.props.accessibilityLabel === label && n.props.onPress).props.onPress();
  });
const flush = () => act(() => Promise.resolve());

beforeEach(() => {
  jest.clearAllMocks();
  const draft = bookDraft();
  Object.assign(mockReal, {
    draft,
    hydrated: true,
    resumable: null,
    run: { status: "done", runNumber: 1, startedAt: 0, transport: "sse", checklist: [], photoCount: 1 },
    waitForUploads: jest.fn(() => Promise.resolve()),
  });
  actions.forEach((a) => (mockReal[a] = jest.fn()));
});
afterEach(() => {
  act(() => mounted.splice(0).forEach((r) => r.unmount()));
});

const presses = ["pickup", "flat", "Add more photos", "pick-category", "spec-row", "save-spec", "Confirm worth"];

describe("Review seed guards", () => {
  it("unseeded: the pickup prefill runs, and the presses reach the draft and the navigator", async () => {
    const r = render(undefined);
    await flush();
    expect(mockDefaultPickup).toHaveBeenCalledTimes(1);
    expect(mockReal.ensureSpecs).toHaveBeenCalled();

    presses.forEach((label) => tap(r, label));
    // No saved addresses, so the picker goes straight to the map.
    expect(mockCreateLocationRequest).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("LocationModal", { requestId: "request-1" });
    expect(mockNavigate).toHaveBeenCalledWith("ListAddPhotos");
    expect(mockReal.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "editField", field: "category" })
    );
    expect(mockReal.dispatch).toHaveBeenCalledWith({ type: "setSpec", key: "format", value: "Paperback" });
    expect(mockReal.dispatch).toHaveBeenCalledWith({ type: "confirmWorth" });
  });

  it("Preview listing: opens Preview unseeded, and nothing under a seed", () => {
    mockReal.draft = completeDraft();
    const live = render(undefined);
    tap(live, "Preview listing");
    expect(mockNavigate).toHaveBeenCalledWith("ListPreview");

    mockNavigate.mockClear();
    const seeded = render({ design: { draft: completeDraft() } });
    tap(seeded, "Preview listing");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("seeded: nothing reaches the live draft, the navigator, the map or the prefill", async () => {
    const r = render({ design: { draft: bookDraft(), run: { status: "done" } } });
    await flush();
    [...presses, "cancel-spec"].forEach((label) => tap(r, label));
    await flush();

    expect(mockDefaultPickup).not.toHaveBeenCalled();
    expect(mockCreateLocationRequest).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    actions.forEach((a) => expect(mockReal[a]).not.toHaveBeenCalled());
  });
});
