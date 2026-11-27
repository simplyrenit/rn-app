import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";
import { createDraft } from "@/lib/list-flow/draft";

// Plan §0.3 / §6 J1: under a design seed, Preview's "Submit for review" returns early, so a fixture can never create a
// listing. The unseeded control presses the same button and must reach `submitListing`.
const mockSubmit = jest.fn((_payload: unknown) => new Promise(() => {}));
const mockReal: any = {};
let mockParams: any;

jest.mock("@/backend/list-flow/submit", () => ({
  buildCreatePayload: () => ({ title: "1984 – George Orwell", images: [], cover_image: null }),
  submitListing: (payload: unknown) => mockSubmit(payload),
}));
jest.mock("@/backend/addresses-api", () => ({ saveOfferedAddress: jest.fn() }));
jest.mock("@/backend/list-flow/pickup-location", () => ({ placeFor: jest.fn() }));
jest.mock("@/backend/terms", () => ({ termsQueryKey: () => ["terms"] }));
jest.mock("react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock("@/lib/haptics", () => ({ commitFeedback: jest.fn(), successFeedback: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), warning: jest.fn() } }));
jest.mock("@/context/global-context", () => ({ useGlobalContext: () => ({ userDetails: { name: "Asha", phone: "" } }) }));
jest.mock("@/context/list-draft-context", () => ({ useListDraft: () => mockReal }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("@react-navigation/native", () => ({ useRoute: () => ({ params: mockParams }) }));
jest.mock("@/lib/types", () => ({
  useTypedNavigation: () => ({ navigate: jest.fn(), reset: jest.fn(), setOptions: jest.fn(), addListener: () => () => {} }),
}));
jest.mock("@/lib/category-icons", () => ({ CategoryIcon: () => null, categoryDisplayName: (t: string) => t }));
jest.mock("react-native-heroicons/outline", () => ({ BanknotesIcon: () => null }));
jest.mock("@/components/core/condition-renderer", () => ({ ConditionRenderer: () => null }));
jest.mock("@/components/core/non-scrollable-container", () => ({ NonScrollableContainer: ({ children }: any) => children }));
jest.mock("@/components/list-flow/flow-header", () => ({ FlowHeader: () => null }));
jest.mock("@/components/product/product-image", () => ({ ProductImage: () => null }));
jest.mock("@/components/product/product-map", () => ({ ProductMap: () => null }));
jest.mock("@/components/product/spec-strip", () => ({ SpecStrip: () => null }));
jest.mock("@/components/core", () => {
  const { Pressable, Text: T } = require("react-native");
  return {
    Text: ({ children }: any) => <T>{children}</T>,
    SectionHeader: () => null,
    StepProgress: () => null,
    BottomBar: ({ primary }: any) => (
      <Pressable accessibilityLabel={primary.accessibilityLabel} onPress={primary.onPress} haptic={primary.haptic}>
        <T>{primary.label}</T>
      </Pressable>
    ),
  };
});

// eslint-disable-next-line import/first
import ListPreviewScreen from "../preview";

function bookDraft() {
  const draft = createDraft("design-attempt", 0);
  draft.fields.title = { value: "1984 – George Orwell", source: "ai" };
  draft.fields.plans = { value: [{ unit: "day", price: "40", min: 1 }], source: "user" };
  return draft;
}

const mounted: any[] = [];
const render = (params: any) => {
  mockParams = params;
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<ListPreviewScreen />);
  });
  mounted.push(renderer);
  return renderer;
};
const submit = (r: any) =>
  act(() => {
    r.root.find((n: any) => n.props.accessibilityLabel === "Submit for review" && n.props.onPress).props.onPress();
  });

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockReal, { draft: bookDraft(), track: jest.fn(), clearSubmitted: jest.fn() });
});
afterEach(() => {
  act(() => mounted.splice(0).forEach((r) => r.unmount()));
});

describe("Preview seed guards", () => {
  it("unseeded: Submit for review sends the listing", () => {
    const r = render(undefined);
    submit(r);
    expect(mockSubmit).toHaveBeenCalledTimes(1);
  });

  it("Submit turns the button's tap haptic off: onSubmit gives the commit haptic", () => {
    const r = render(undefined);
    const button = r.root.find((n: any) => n.props.accessibilityLabel === "Submit for review" && n.props.onPress);
    expect(button.props.haptic).toBe(false);
  });

  it("seeded: Submit for review sends nothing and tracks nothing on the live draft", () => {
    const r = render({ design: { draft: bookDraft() } });
    submit(r);
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockReal.track).not.toHaveBeenCalled();
    expect(mockReal.clearSubmitted).not.toHaveBeenCalled();
  });
});
