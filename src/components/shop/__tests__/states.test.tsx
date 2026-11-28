import { describe, expect, it, jest } from "@jest/globals";
import { AxiosError, AxiosHeaders } from "axios";
import React from "react";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

// rental-settings · not an owner (2096:26578) needs a `403 not_owner`, which a design fixture cannot serve, so it is
// checked here; could not load (2096:26620) is the fixture's 404 and is checked here too for the shared look.
const mockNavigate = jest.fn();

jest.mock("@/lib/types", () => ({ useTypedNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock("@/lib/theme", () => {
  const { lightColors } = require("@/lib/design-tokens");
  return { useTheme: () => ({ color: lightColors, isDark: false }) };
});
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }) }));
// Kit components as prop-keeping stand-ins, so the test reads the props the state passes.
jest.mock("@/components/core", () => ({ EmptyState: (_: any) => null, Skeleton: (_: any) => null }));

// eslint-disable-next-line import/first
import { ShopLoadError } from "../states";

const core = require("@/components/core");
const { lightColors } = require("@/lib/design-tokens");
const { AdjustmentsHorizontalIcon, ExclamationCircleIcon } = require("react-native-heroicons/outline");

/** A real AxiosError carrying the server's body: `apiError()` reads `response.data.error.code` from nothing else. */
const httpError = (status: number, code: string) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, null, {
    status,
    statusText: "",
    headers: {},
    config,
    data: { error: { code, message: "" } },
  });
};

const render = (error: unknown) => {
  let renderer: any;
  act(() => {
    renderer = TestRenderer.create(<ShopLoadError error={error} onRetry={() => undefined} />);
  });
  return renderer.root.findByType(core.EmptyState).props;
};

describe("ShopLoadError (2096:26578, 2096:26620)", () => {
  it("not an owner: the owners' empty state, Primary 'List an item', a black sliders glyph", () => {
    const props = render(httpError(403, "not_owner"));
    expect(props.title).toBe("Rental settings are for owners");
    expect(props.body).toBe("List your first item and your hours, delivery and Open switch will be here.");
    expect(props.actionLabel).toBe("List an item");
    expect(props.actionTone).toBe("primary");
    expect(props.variant).toBeUndefined();
    expect(props.icon.type).toBe(AdjustmentsHorizontalIcon);
    expect(props.icon.props.color).toBe(lightColors.text);
    props.onAction();
    expect(mockNavigate).toHaveBeenCalledWith("ListAddPhotos");
  });

  it("could not load: Primary 'Try again' and a black exclamation on the lavender disc (no error variant)", () => {
    const props = render(httpError(404, "not_found"));
    expect(props.title).toBe("Couldn't load your settings");
    expect(props.body).toBe("Check your connection and try again.");
    expect(props.actionLabel).toBe("Try again");
    expect(props.actionTone).toBe("primary");
    expect(props.variant).toBeUndefined();
    expect(props.icon.type).toBe(ExclamationCircleIcon);
    expect(props.icon.props.color).toBe(lightColors.text);
  });

  it("a plain object with a code is not an API error, so it is the error state", () => {
    expect(render({ code: "not_owner" }).title).toBe("Couldn't load your settings");
  });
});
