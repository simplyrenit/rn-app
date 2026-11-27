import { afterEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// J1 (ENG-435): under a design seed the photo walk never opens the camera or gallery and never touches the upload
// queue; without one, the same presses reach it.
let mockParams: any = undefined;
const mockFailedJob = {
  id: "j1",
  name: "d0",
  title: "Earlier draft",
  uri: "file:///x.jpg",
  url: null,
  status: "failed",
  error: null,
  attachSent: false,
};
const mockQueue = {
  init: jest.fn(async () => undefined),
  retryAll: jest.fn(),
  removeFailed: jest.fn(() => []),
  enqueue: jest.fn(async () => undefined),
};
const mockPickPhotos = jest.fn(async (..._args: unknown[]) => [{ uri: "file:///y.jpg" }]);
const mockDrafts = [1, 2, 3, 4].map((i) => ({ name: `d${i}`, title: `Draft ${i}`, shop_code: `RN-${i}` }));

jest.mock("@/backend/draft-photo-jobs", () => ({
  get draftPhotoQueue() {
    return mockQueue;
  },
  usePhotoJobs: () => [mockFailedJob],
}));
jest.mock("@/backend/draft-photos", () => ({ fetchAllNeedingPhotos: jest.fn() }));
jest.mock("react-query", () => ({
  useQuery: () => ({ data: { drafts: mockDrafts, total: 4 }, isError: false, error: null, refetch: jest.fn() }),
}));
jest.mock("@/components/list-flow/pick-photos", () => ({ pickPhotos: (...args: any[]) => mockPickPhotos(...args) }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ userDetails: { username: "asha" } }) }));
jest.mock("@/lib/haptics", () => ({ commitFeedback: jest.fn(), tapFeedback: jest.fn() }));
jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true }) }));
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/core", () => {
  const { Text: T } = require("react-native");
  return {
    Text: ({ children, onPress, accessibilityRole }: any) => (
      <T onPress={onPress} accessibilityRole={accessibilityRole}>
        {children}
      </T>
    ),
    Skeleton: () => null,
    SubpageHeader: ({ title }: any) => <T>{title}</T>,
    EmptyState: ({ title }: any) => <T>{title}</T>,
    BottomBar: () => null,
  };
});

// eslint-disable-next-line import/first
import DraftPhotosScreen from "../draft-photos";

const flush = () => act(async () => await Promise.resolve());
let mounted: any[] = [];
const render = async (params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<DraftPhotosScreen />);
  });
  await flush();
  mounted.push(renderer);
  return renderer;
};
const label = (n: any) => n.props.accessibilityLabel ?? [].concat(n.props.children).join("");
const press = async (renderer: any, name: string) => {
  const target = renderer.root.find(
    (n: any) => typeof n.type !== "string" && n.props.onPress && (n.props.accessibilityLabel === name || label(n) === name)
  );
  await act(async () => {
    await target.props.onPress();
  });
};
const PRESSES = ["Retry", "Take again", "Take a photo of Draft 1", "Skip for now", "Choose a photo instead"];

afterEach(() => {
  mounted.forEach((r) => act(() => r.unmount()));
  mounted = [];
  jest.clearAllMocks();
});

describe("Draft photos under a design seed", () => {
  it("leaves the queue, camera and gallery alone", async () => {
    const renderer = await render({
      design: { walk: { waiting: mockDrafts, skipped: [], taken: 0, total: 4 }, jobs: [mockFailedJob] },
    });
    for (const name of PRESSES) {
      // The shutter and the viewfinder share the label: press both.
      const targets = renderer.root.findAll(
        (n: any) => typeof n.type !== "string" && n.props.onPress && (n.props.accessibilityLabel === name || label(n) === name)
      );
      expect([name, targets.length > 0]).toEqual([name, true]);
      for (const t of targets) await act(async () => await t.props.onPress());
    }
    expect(mockQueue.init).not.toHaveBeenCalled();
    expect(mockQueue.retryAll).not.toHaveBeenCalled();
    expect(mockQueue.removeFailed).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
    expect(mockPickPhotos).not.toHaveBeenCalled();
    // Still on the first draft: Skip did not move the walk.
    expect(renderer.root.findAllByType(Text).some((t: any) => label(t) === "Photo 1 of 4")).toBe(true);
  });

  it("without a seed the same presses reach the queue and the picker", async () => {
    const renderer = await render(undefined);
    expect(mockQueue.init).toHaveBeenCalledWith("asha");
    await press(renderer, "Retry");
    expect(mockQueue.retryAll).toHaveBeenCalledTimes(1);
    await press(renderer, "Take again");
    expect(mockQueue.removeFailed).toHaveBeenCalledTimes(1);
    await press(renderer, "Choose a photo instead");
    expect(mockPickPhotos).toHaveBeenCalledWith("gallery", 1);
  });
});
