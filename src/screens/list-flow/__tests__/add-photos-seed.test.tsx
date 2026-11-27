import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Alert, Linking } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";
import { createDraft } from "@/lib/list-flow/draft";
import type { ListingDraft } from "@/lib/list-flow/types";

// ENG-435 plan §0.3 / §6 J1: under a design seed, every add-photos handler that would write, upload, open the
// camera, open the terms or move into the flow returns early; without one, the same press reaches its handler.

let mockParams: any = undefined;
let mockOwnerAccepted = false;
const mockPresent = jest.fn();
const mockPickPhotos = jest.fn(async () => [] as unknown[]);
const mockAcceptOwnerTerms = jest.fn(async () => ({ owner: { version: "v1", url: "https://x", accepted: true } }));
const mockNavigation = { navigate: jest.fn(), setParams: jest.fn(), dispatch: jest.fn(), addListener: () => () => {} };
const mockReal: any = {};

const photo = (n: number) => ({ id: `p${n}`, localUri: "file://p", source: "camera" as const, status: "done" as const });
const draftWith = (over: Partial<ListingDraft>): ListingDraft => ({ ...createDraft("t", 0), ...over });

function resetReal(over: Record<string, unknown> = {}) {
  Object.assign(mockReal, {
    draft: draftWith({ photos: [photo(1), photo(2)] }),
    hydrated: true,
    resumable: null,
    run: { status: "idle", runNumber: 0, startedAt: 0, transport: "sse", checklist: [], photoCount: 0 },
    waitForUploads: jest.fn(async () => undefined),
    ...over,
  });
  for (const name of [
    "dispatch", "startFresh", "resume", "discard", "clearSubmitted", "addPhotos", "replacePhoto",
    "retryPhoto", "removePhoto", "startExtraction", "cancelExtraction", "ensureSpecs", "track",
  ]) {
    mockReal[name] = jest.fn();
  }
}

jest.mock("@/context/list-draft-context", () => ({ useListDraft: () => mockReal }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ userDetails: { username: "design_t" } }) }));
jest.mock("@/backend/terms", () => ({
  useTerms: () => ({
    data: { owner: { version: "v1", url: "https://example.test/owner", accepted: mockOwnerAccepted } },
    isError: false,
    isFetching: false,
    refetch: jest.fn(),
  }),
  acceptOwnerTerms: (...args: unknown[]) => (mockAcceptOwnerTerms as any)(...args),
  isTermsVersionOld: () => false,
  termsQueryKey: (u?: string) => ["terms", u],
}));
jest.mock("react-query", () => ({ useQueryClient: () => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() }) }));
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => mockNavigation }));
jest.mock("@/lib/theme", () => ({
  useTheme: () => ({ color: new Proxy({}, { get: () => "#000000" }), isDark: false }),
}));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), warning: jest.fn() } }));
jest.mock("react-native-reanimated", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: { View } };
});
jest.mock("@/components/list-flow/motion", () => ({ useAppear: () => ({}) }));
jest.mock("@/components/list-flow/pick-photos", () => ({
  pickPhotos: (...args: unknown[]) => (mockPickPhotos as any)(...args),
}));
jest.mock("@/components/list-flow/flow-header", () => ({ FLOW_STEPS: 4, FlowHeader: () => null }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/core", () => {
  const { Pressable: P, Text: T, View: V } = require("react-native");
  const action = (a: any) => (a ? <P testID={a.label} onPress={a.onPress}><T>{a.label}</T></P> : null);
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    StepProgress: () => null,
    Button: ({ children, onPress }: any) => <P onPress={onPress}><T>{children}</T></P>,
    BottomBar: ({ primary, secondary }: any) => <V>{action(primary)}{action(secondary)}</V>,
  };
});
jest.mock("@/components/terms/owner-terms-tick", () => {
  const { Pressable: P } = require("react-native");
  return {
    OwnerTermsTick: ({ checked, onChange, onOpenTerms }: any) => (
      <>
        <P testID="tick" onPress={() => onChange(!checked)} />
        <P testID="terms-link" onPress={onOpenTerms} />
      </>
    ),
  };
});
jest.mock("@/components/list-flow/photo-tile", () => {
  const { Pressable: P } = require("react-native");
  return {
    PhotoTile: ({ index, onRetry, onLongPress }: any) => (
      <P testID={`tile-${index}`} onPress={onRetry} onLongPress={onLongPress} />
    ),
    AddPhotoTile: ({ onPress }: any) => <P testID="add-tile" onPress={onPress} />,
  };
});
jest.mock("@/components/list-flow/sheets", () => {
  const { forwardRef, useImperativeHandle } = require("react");
  const { Pressable: P } = require("react-native");
  return {
    AddPhotoSheet: forwardRef(({ onPick }: any, ref: any) => {
      useImperativeHandle(ref, () => ({ present: () => mockPresent("add"), dismiss: jest.fn() }));
      return <P testID="pick-camera" onPress={() => onPick("camera")} />;
    }),
    ResumeDraftSheet: forwardRef(({ onContinue, onDiscard, onDismiss }: any, ref: any) => {
      useImperativeHandle(ref, () => ({ present: () => mockPresent("resume"), dismiss: jest.fn() }));
      return (
        <>
          <P testID="resume-continue" onPress={onContinue} />
          <P testID="resume-discard" onPress={onDiscard} />
          <P testID="resume-dismiss" onPress={onDismiss} />
        </>
      );
    }),
  };
});

import ListAddPhotosScreen from "../add-photos";

let tree: any;
async function render() {
  await act(async () => {
    tree = TestRenderer.create(<ListAddPhotosScreen />);
  });
}
async function press(testID: string, prop = "onPress") {
  const [node] = tree.root.findAll((n: any) => n.props.testID === testID && typeof n.props[prop] === "function");
  await act(async () => {
    await node.props[prop]();
  });
}

const sideEffects = () => ({
  pick: mockPickPhotos.mock.calls.length,
  accept: mockAcceptOwnerTerms.mock.calls.length,
  open: (Linking.openURL as jest.Mock).mock.calls.length,
  alert: (Alert.alert as jest.Mock).mock.calls.length,
  navigate: mockNavigation.navigate.mock.calls.length,
  setParams: mockNavigation.setParams.mock.calls.length,
  real: Object.values(mockReal).filter((v: any) => typeof v?.mock === "object" && v.mock.calls.length).length,
});
const NONE = { pick: 0, accept: 0, open: 0, alert: 0, navigate: 0, setParams: 0, real: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  mockOwnerAccepted = false;
  mockParams = undefined;
  resetReal();
});
afterEach(() => {
  tree?.unmount();
});

describe("add photos under a design seed", () => {
  it("opens the seed's add-photo sheet and lets no press reach the camera, the terms or the flow", async () => {
    mockParams = { design: { draft: draftWith({ photos: [photo(1), photo(2)] }), sheet: "add-photo" } };
    await render();
    expect(mockPresent).toHaveBeenCalledWith("add");
    mockPresent.mockClear();

    for (const id of ["add-tile", "pick-camera", "tick", "terms-link", "Continue", "I'll fill it in myself", "tile-0"]) {
      await press(id);
    }
    await press("tile-1", "onLongPress");
    expect(mockPresent).not.toHaveBeenCalled();
    expect(sideEffects()).toEqual(NONE);
  });

  it("presents the resume sheet and guards Continue, Discard and the swipe-away", async () => {
    mockParams = { design: { draft: draftWith({ photos: [photo(1)] }), resumable: true } };
    await render();
    expect(mockPresent).toHaveBeenCalledWith("resume");
    for (const id of ["resume-continue", "resume-discard", "resume-dismiss"]) await press(id);
    expect(sideEffects()).toEqual(NONE);
  });

  it("guards the L-12b retake and keep", async () => {
    mockOwnerAccepted = true;
    mockParams = {
      focusPhoto: 2,
      design: { draft: draftWith({ photos: [photo(1), photo(2)], warnings: [{ type: "stock_photo", photo: 2 }] }) },
    };
    await render();
    await press("Retake photo 2");
    await press("Keep it and continue");
    expect(mockPresent).not.toHaveBeenCalled();
    expect(sideEffects()).toEqual(NONE);
  });
});

describe("add photos without a seed", () => {
  it("reaches the sheet, the camera, the terms page, the retry and the long-press", async () => {
    await render();
    await press("add-tile");
    expect(mockPresent).toHaveBeenCalledWith("add");
    await press("pick-camera");
    expect(mockPickPhotos).toHaveBeenCalled();
    await press("terms-link");
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.test/owner");
    await press("tile-0");
    expect(mockReal.retryPhoto).toHaveBeenCalledWith("p1");
    await press("tile-1", "onLongPress");
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("records the tick and moves into the flow on Continue", async () => {
    await render();
    await press("tick");
    await press("Continue");
    expect(mockAcceptOwnerTerms).toHaveBeenCalledWith("v1");
    expect(mockReal.startExtraction).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ListReading");
  });

  it("resumes the offered draft from the sheet", async () => {
    resetReal({ draft: null, resumable: draftWith({ photos: [photo(1)] }) });
    await render();
    expect(mockPresent).toHaveBeenCalledWith("resume");
    await press("resume-continue");
    expect(mockReal.resume).toHaveBeenCalled();
  });

  it("keeps the L-12b photo and moves on", async () => {
    mockOwnerAccepted = true;
    mockParams = { focusPhoto: 2 };
    resetReal({ draft: draftWith({ photos: [photo(1), photo(2)], warnings: [{ type: "stock_photo", photo: 2 }] }) });
    await render();
    await press("Keep it and continue");
    expect(mockReal.dispatch).toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith("ListReview");
  });
});
