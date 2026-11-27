import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";
import { createDraft } from "@/lib/list-flow/draft";
import type { ListingDraft, ListingWarning } from "@/lib/list-flow/types";

// ENG-435 plan §0.2 / §0.3 / §6 J1: under a design seed, Reading never leaves on its own (the run-ending effect
// returns early) and no action press reaches the camera, the draft or the navigator; without one, they do.

let mockParams: any = undefined;
const mockPickPhotos = jest.fn(async () => [] as unknown[]);
const mockNavigation = { navigate: jest.fn(), dispatch: jest.fn() };
const mockToastError = jest.fn();
const mockReal: any = {};

const photo = (n: number) => ({ id: `p${n}`, localUri: "file://p", source: "camera" as const, status: "done" as const });
const draftWith = (warnings: ListingWarning[] = []): ListingDraft => ({
  ...createDraft("t", 0),
  photos: [photo(1), photo(2)],
  extractionRuns: 1,
  warnings,
});
const run = (over: Record<string, unknown>) => ({
  status: "idle",
  runNumber: 1,
  startedAt: 0,
  transport: "sse",
  checklist: [],
  photoCount: 2,
  ...over,
});

function resetReal(over: Record<string, unknown> = {}) {
  Object.assign(mockReal, { draft: draftWith(), run: run({}), waitForUploads: jest.fn(async () => undefined), ...over });
  for (const name of ["dispatch", "replacePhoto", "startExtraction", "track"]) mockReal[name] = jest.fn();
}

jest.mock("@/context/list-draft-context", () => ({ useListDraft: () => mockReal }));
jest.mock("@react-navigation/native", () => ({
  useRoute: () => ({ params: mockParams }),
  StackActions: { replace: (name: string) => ({ type: "REPLACE", name }) },
}));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => mockNavigation }));
jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: new Proxy({}, { get: () => "#000000" }) }) }));
jest.mock("@/lib/toast", () => ({ toast: { error: (...a: unknown[]) => (mockToastError as any)(...a) } }));
jest.mock("@/lib/category-icons", () => ({ categoryDisplayName: (title: string) => title }));
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: { View } };
});
jest.mock("@/components/list-flow/motion", () => ({ useAppear: () => ({}) }));
jest.mock("@/components/list-flow/pick-photos", () => ({
  pickPhotos: (...args: unknown[]) => (mockPickPhotos as any)(...args),
}));
jest.mock("@/components/list-flow/flow-header", () => ({ FLOW_STEPS: 4, FlowHeader: () => null }));
jest.mock("@/components/list-flow/scan-panel", () => ({ ScanPanel: () => null }));
jest.mock("@/components/list-flow/extraction-checklist", () => ({ ExtractionChecklist: () => null }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T, View: V } = require("react-native");
  const action = (a: any) => (a ? <P testID={a.label} onPress={a.onPress}><T>{a.label}</T></P> : null);
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    StepProgress: () => null,
    Button: ({ children, onPress }: any) => <P testID={children} onPress={onPress}><T>{children}</T></P>,
    BottomBar: ({ primary, secondary }: any) => <V>{action(primary)}{action(secondary)}</V>,
  };
});

import ListReadingScreen from "../reading";

let tree: any;
async function render() {
  await act(async () => {
    tree = TestRenderer.create(<ListReadingScreen />);
  });
}
async function press(testID: string) {
  const [node] = tree.root.findAll((n: any) => n.props.testID === testID && typeof n.props.onPress === "function");
  await act(async () => {
    await node.props.onPress();
  });
}
async function wait(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}
const seed = (draft: ListingDraft, runOver: Record<string, unknown>) => ({ design: { draft, run: runOver } });
const untouched = () => {
  expect(mockNavigation.navigate).not.toHaveBeenCalled();
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(mockPickPhotos).not.toHaveBeenCalled();
  expect(mockToastError).not.toHaveBeenCalled();
  for (const name of ["dispatch", "replacePhoto", "startExtraction", "track"]) expect(mockReal[name]).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockParams = undefined;
  resetReal();
});
afterEach(() => {
  tree?.unmount();
  jest.useRealTimers();
});

describe("reading under a design seed", () => {
  it.each([
    ["a done run with no warning", { status: "done" }],
    ["a failed run", { status: "failed" }],
    ["a merchant_not_approved run", { status: "failed", code: "merchant_not_approved" }],
  ])("stays put after %s", async (_name, runOver) => {
    mockParams = seed(draftWith(), runOver);
    await render();
    await wait(1000);
    untouched();
  });

  it("guards the L-13b retake and leave-blank actions", async () => {
    mockParams = seed(draftWith([{ type: "unreadable", photo: 2 }]), { status: "done" });
    await render();
    await press("Retake the label photo");
    await press("Leave it blank — I'll type it");
    await wait(1000);
    untouched();
  });

  it("guards the retake card and Skip to review", async () => {
    mockParams = seed(draftWith([{ type: "stock_photo", photo: 2 }]), { status: "running" });
    await render();
    await press("Keep it");
    await press("Retake photo 2");
    await press("Skip to review — we'll keep filling in");
    untouched();
  });
});

describe("reading without a seed", () => {
  it("goes to Review after a done run's hold", async () => {
    resetReal({ run: run({ status: "done" }) });
    await render();
    expect(mockNavigation.dispatch).not.toHaveBeenCalled();
    await wait(600);
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: "REPLACE", name: "ListReview" });
  });

  it("goes to Review at once on a failed run, and to the Post tab when the merchant is not approved", async () => {
    resetReal({ run: run({ status: "failed" }) });
    await render();
    expect(mockNavigation.dispatch).toHaveBeenCalledWith({ type: "REPLACE", name: "ListReview" });
    tree.unmount();
    resetReal({ run: run({ status: "failed", code: "merchant_not_approved" }) });
    await render();
    expect(mockNavigation.navigate).toHaveBeenCalledWith("MainTabs", { screen: "Post" });
  });

  it("reaches the retake card, the camera and Skip", async () => {
    resetReal({ draft: draftWith([{ type: "stock_photo", photo: 2 }]), run: run({ status: "running" }) });
    await render();
    await press("Keep it");
    expect(mockReal.dispatch).toHaveBeenCalled();
    await press("Retake photo 2");
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ListAddPhotos", { focusPhoto: 2 });
    await press("Skip to review — we'll keep filling in");
    expect(mockNavigation.dispatch).toHaveBeenCalled();
  });

  it("reaches the label retake", async () => {
    resetReal({ draft: draftWith([{ type: "unreadable", photo: 2 }]), run: run({ status: "done" }) });
    await render();
    await press("Retake the label photo");
    expect(mockPickPhotos).toHaveBeenCalledWith("camera", 1);
  });
});
