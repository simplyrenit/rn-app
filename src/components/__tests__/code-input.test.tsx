import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { Text as NativeText, TextInput } from "react-native";
// No type package for it is installed (it comes with jest-expo); the tests only need create, update and act.
// @ts-ignore
import TestRenderer, { act } from "react-test-renderer";

jest.mock("@/lib/theme", () => ({ useTheme: () => ({ color: { surface: "#fff", brand: "#635BE8", inputLine: "#ccc" } }) }));
jest.mock("@/components/core", () => {
  const { Text } = require("react-native");
  return { Text: ({ children }: any) => <Text>{children}</Text> };
});

// eslint-disable-next-line import/first
import { CODE_LENGTH, CodeInput, activeCell, codeCells, codeDigits } from "../capture/code";

describe("what the code boxes make of what arrives", () => {
  it("takes six digits at once (typed fast, or filled in by iOS from a message)", () => {
    expect(codeDigits("123456")).toBe("123456");
    expect(codeCells("123456")).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("takes a paste with spaces, dashes or other characters, keeping only the digits", () => {
    expect(codeDigits("123 456")).toBe("123456");
    expect(codeDigits("Your code is 123-456.")).toBe("123456");
    expect(codeDigits(" 1 2 3 4 5 6 ")).toBe("123456");
  });

  it("cuts more than six to the first six", () => {
    expect(codeDigits("1234567890")).toBe("123456");
    expect(codeDigits("123456 and 789")).toBe("123456");
  });

  it("follows digit by digit and deleting: the boxes fill in order and empty from the end", () => {
    expect(codeCells("")).toEqual(["", "", "", "", "", ""]);
    expect(codeCells("12")).toEqual(["1", "2", "", "", "", ""]);
    expect(codeDigits("1234")).toBe("1234");
    expect(codeDigits("123")).toBe("123"); // one deleted
    expect(codeDigits("")).toBe("");
    expect(activeCell("")).toBe(0);
    expect(activeCell("123")).toBe(3);
    // Whole: the last box stays the active one.
    expect(activeCell("123456")).toBe(CODE_LENGTH - 1);
  });
});

describe("the six boxes over one input", () => {
  let changes: string[];
  beforeEach(() => {
    changes = [];
  });

  function mount(props: { round?: number } = {}) {
    let renderer: any;
    act(() => {
      renderer = TestRenderer.create(<CodeInput onChange={(code) => changes.push(code)} round={props.round ?? 0} />);
    });
    return renderer;
  }
  const input = (renderer: any) => renderer.root.findByType(TextInput);
  const shown = (renderer: any): string[] =>
    renderer.root.findAllByType(NativeText).map((t: any) => String(t.props.children ?? ""));

  it("there is exactly one text input, and it is told it is a one-time code", () => {
    const renderer = mount();
    expect(renderer.root.findAllByType(TextInput)).toHaveLength(1);
    expect(input(renderer).props.textContentType).toBe("oneTimeCode");
    expect(input(renderer).props.keyboardType).toBe("number-pad");
    // Not cut at six before it is cleaned: a pasted "123 456" is seven characters.
    expect(input(renderer).props.maxLength).toBeUndefined();
    expect(shown(renderer)).toEqual(["", "", "", "", "", ""]);
  });

  it("a whole code in one change fills all six boxes and is passed on whole", () => {
    const renderer = mount();
    act(() => input(renderer).props.onChangeText("481926"));
    expect(changes).toEqual(["481926"]);
    expect(shown(renderer)).toEqual(["4", "8", "1", "9", "2", "6"]);
  });

  it("a paste with a space, or with too many digits, is cleaned and cut", () => {
    const renderer = mount();
    act(() => input(renderer).props.onChangeText("481 926"));
    expect(changes[changes.length - 1]).toBe("481926");
    act(() => input(renderer).props.onChangeText("4819261234"));
    expect(changes[changes.length - 1]).toBe("481926");
    expect(shown(renderer)).toEqual(["4", "8", "1", "9", "2", "6"]);
  });

  it("digits typed one after another, even fast (six changes with no render between), are all kept", () => {
    const renderer = mount();
    act(() => {
      for (const text of ["4", "48", "481", "4819", "48192", "481926"]) input(renderer).props.onChangeText(text);
    });
    expect(changes).toEqual(["4", "48", "481", "4819", "48192", "481926"]);
    expect(shown(renderer)).toEqual(["4", "8", "1", "9", "2", "6"]);
  });

  it("deleting takes digits off the end, and a letter typed is not a digit", () => {
    const renderer = mount();
    act(() => input(renderer).props.onChangeText("4819"));
    act(() => input(renderer).props.onChangeText("481"));
    expect(shown(renderer)).toEqual(["4", "8", "1", "", "", ""]);
    act(() => input(renderer).props.onChangeText("481x"));
    expect(changes[changes.length - 1]).toBe("481");
    act(() => input(renderer).props.onChangeText(""));
    expect(changes[changes.length - 1]).toBe("");
    expect(shown(renderer)).toEqual(["", "", "", "", "", ""]);
  });

  it("a new round (after a wrong try) empties the boxes", () => {
    const renderer = mount({ round: 0 });
    act(() => input(renderer).props.onChangeText("481926"));
    act(() => renderer.update(<CodeInput onChange={(code) => changes.push(code)} round={1} />));
    expect(shown(renderer)).toEqual(["", "", "", "", "", ""]);
  });
});
