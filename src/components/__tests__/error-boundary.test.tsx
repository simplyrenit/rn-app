import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Pressable, Text } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: { canvas: "#fff", danger: "#c00" } }) }));
jest.mock("react-native-heroicons/outline", () => ({ ExclamationTriangleIcon: () => null }));
// The app's EmptyState draws the sentence and its button; here it is the same two things, plainly.
jest.mock("@/components/core/empty-state", () => {
  const { Pressable: P, Text: T, View: V } = require("react-native");
  return {
    EmptyState: ({ title, body, actionLabel, onAction }: any) => (
      <V>
        <T>{title}</T>
        <T>{body}</T>
        <P accessibilityRole="button" onPress={onAction}>
          <T>{actionLabel}</T>
        </P>
      </V>
    ),
  };
});

// eslint-disable-next-line import/first
import { AppErrorBoundary } from "../error-boundary";

let mockBroken = true;
function Screen() {
  if (mockBroken) throw new Error("uri.toLowerCase is not a function");
  return <Text>The screen</Text>;
}

const texts = (renderer: any): string[] => renderer.root.findAllByType(Text).map((t: any) => String(t.props.children));

describe("the app's error boundary (T-55)", () => {
  let logged: jest.SpiedFunction<typeof console.error>;
  beforeEach(() => {
    mockBroken = true;
    // React logs a caught render error too; the test checks only what the boundary logs itself.
    logged = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => logged.mockRestore());

  it("shows the screen as it is while nothing throws", () => {
    mockBroken = false;
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <AppErrorBoundary>
          <Screen />
        </AppErrorBoundary>
      );
    });
    expect(texts(renderer)).toEqual(["The screen"]);
  });

  it("a child that throws while rendering shows a plain sentence and one button, and none of the error", () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <AppErrorBoundary>
          <Screen />
        </AppErrorBoundary>
      );
    });
    const said = texts(renderer);
    expect(said).toContain("Something went wrong on this screen");
    expect(said).toContain("Try again");
    // No stack, no error text, no code for the person.
    expect(JSON.stringify(renderer.toJSON())).not.toMatch(/toLowerCase|Error|undefined|at /);
    expect(renderer.root.findAllByType(Pressable)).toHaveLength(1);
  });

  it("logs the error the way the app does, with the component stack", () => {
    act(() => {
      TestRenderer.create(
        <AppErrorBoundary>
          <Screen />
        </AppErrorBoundary>
      );
    });
    const ours = logged.mock.calls.find((call) => call[0] === "A screen failed to render:");
    expect(ours).toBeDefined();
    expect((ours?.[1] as Error).message).toBe("uri.toLowerCase is not a function");
  });

  it("Try again renders the children afresh: the screen comes back once it no longer throws", () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <AppErrorBoundary>
          <Screen />
        </AppErrorBoundary>
      );
    });
    expect(texts(renderer)).toContain("Try again");
    mockBroken = false;
    act(() => {
      renderer.root.findByType(Pressable).props.onPress();
    });
    expect(texts(renderer)).toEqual(["The screen"]);
  });

  it("if it throws again after Try again, the sentence is shown again instead of a blank page", () => {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(
        <AppErrorBoundary>
          <Screen />
        </AppErrorBoundary>
      );
    });
    act(() => {
      renderer.root.findByType(Pressable).props.onPress();
    });
    expect(texts(renderer)).toContain("Something went wrong on this screen");
  });
});
