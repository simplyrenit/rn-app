import { describe, expect, it } from "@jest/globals";
import {
  ChecklistOptions,
  ItemPicks,
  MAX_ITEMS,
  addItem,
  itemsOf,
  itemsPayload,
  picksFrom,
  readOptions,
  removeItem,
  toggleIncluded,
  toggleUsedUp,
} from "@/lib/included-items";

const ps5: ChecklistOptions = {
  included_items: ["Console", "Controller", "Power cable", "HDMI cable"],
  extra_items: ["Second controller", "Game disc"],
  handover_only_items: ["Batteries"],
};

const ok = (change: ReturnType<typeof toggleIncluded>): ItemPicks => {
  if (!change.ok) throw new Error(`refused: ${change.why}`);
  return change.picks;
};

describe("included items", () => {
  it("sends nothing when the defaults are left as they are", () => {
    const picks = picksFrom(ps5, null);
    expect(picks.ticked).toEqual(ps5.included_items);
    expect(itemsPayload(ps5, null, itemsOf(ps5, picks))).toEqual({});
    // Unticked and ticked again is no change either.
    const back = ok(toggleIncluded(ps5, ok(toggleIncluded(ps5, picks, "Controller")), "Controller"));
    expect(itemsPayload(ps5, null, itemsOf(ps5, back))).toEqual({});
  });

  it("unticking a standard item sends the rest", () => {
    const picks = ok(toggleIncluded(ps5, picksFrom(ps5, null), "Controller"));
    expect(itemsPayload(ps5, null, itemsOf(ps5, picks))).toEqual({
      included_items: ["Console", "Power cable", "HDMI cable"],
      handover_only_items: [],
    });
  });

  it("adds an extra and a custom item after the standard ones", () => {
    let picks = ok(toggleIncluded(ps5, picksFrom(ps5, null), "Game disc"));
    picks = ok(addItem(ps5, picks, "  2   controllers "));
    expect(itemsPayload(ps5, null, itemsOf(ps5, picks))).toEqual({
      included_items: ["Console", "Controller", "Power cable", "HDMI cable", "Game disc", "2 controllers"],
      handover_only_items: [],
    });
    // A custom item can go again.
    picks = ok(removeItem(ps5, picks, "2 controllers"));
    expect(picks.custom).toEqual([]);
  });

  it("typing an offered item ticks it instead of adding a duplicate", () => {
    const picks = ok(addItem(ps5, picksFrom(ps5, null), "second CONTROLLER"));
    expect(picks.ticked).toContain("Second controller");
    expect(picks.custom).toEqual([]);
    expect(ok(addItem(ps5, picks, "Second controller"))).toBe(picks);
  });

  it("sends used-up items on their own list, and the included list keeps following the category", () => {
    const picks = ok(toggleUsedUp(ps5, picksFrom(ps5, null), "Batteries"));
    expect(itemsPayload(ps5, null, itemsOf(ps5, picks))).toEqual({
      included_items: [],
      handover_only_items: ["Batteries"],
    });
  });

  it("round-trips a listing's own items", () => {
    const listing = {
      included_items: ["console", "Game disc", "Carry case"],
      handover_only_items: ["Batteries", "Cleaning wipes"],
    };
    const picks = picksFrom(ps5, listing);
    expect(picks).toEqual({
      ticked: ["Console", "Game disc"],
      custom: ["Carry case"],
      // A used-up item the category does not offer stays a used-up item.
      usedUp: ["Batteries", "Cleaning wipes"],
    });
    const items = itemsOf(ps5, picks);
    expect(items).toEqual({
      included_items: ["Console", "Game disc", "Carry case"],
      handover_only_items: ["Batteries", "Cleaning wipes"],
    });
    expect(picksFrom(ps5, items)).toEqual(picks);
    // Opened and saved untouched: nothing is sent.
    expect(itemsPayload(ps5, listing, items)).toEqual({});
    // Changed: both lists go.
    const fewer = ok(toggleUsedUp(ps5, picks, "Cleaning wipes"));
    expect(itemsPayload(ps5, listing, itemsOf(ps5, fewer))).toEqual({
      included_items: ["Console", "Game disc", "Carry case"],
      handover_only_items: ["Batteries"],
    });
  });

  it("a listing shaped back to the standard list follows the category again", () => {
    const listing = { included_items: ["Console"], handover_only_items: [] };
    let picks = picksFrom(ps5, listing);
    for (const item of ["Controller", "Power cable", "HDMI cable"]) picks = ok(toggleIncluded(ps5, picks, item));
    expect(itemsPayload(ps5, listing, itemsOf(ps5, picks))).toEqual({ included_items: [], handover_only_items: [] });
  });

  it("will not leave nothing included, which the server reads as the category's list", () => {
    let picks = picksFrom(ps5, { included_items: ["Console", "Carry case"] });
    picks = ok(toggleIncluded(ps5, picks, "Console"));
    expect(removeItem(ps5, picks, "Carry case")).toEqual({ ok: false, why: "last" });
  });

  it("an item is never both one that comes back and one that is used up", () => {
    const picks = picksFrom(ps5, null);
    // Typing a used-up option, or one already ticked as used up, is refused rather than added.
    expect(addItem(ps5, picks, "batteries ")).toEqual({ ok: false, why: "both" });
    const usedUp = ok(toggleUsedUp(ps5, picks, "Batteries"));
    expect(addItem(ps5, usedUp, "Batteries")).toEqual({ ok: false, why: "both" });
    // An included item can't be ticked as used up.
    const glue = ok(addItem(ps5, picks, "Glue"));
    expect(toggleUsedUp(ps5, glue, "glue")).toEqual({ ok: false, why: "both" });
  });

  it("keeps to 20 items of up to 60 characters", () => {
    let picks = picksFrom(ps5, null);
    for (let i = picks.ticked.length; i < MAX_ITEMS; i++) picks = ok(addItem(ps5, picks, `Item ${i}`));
    expect(addItem(ps5, picks, "One more")).toEqual({ ok: false, why: "full" });
    expect(toggleIncluded(ps5, picks, "Game disc")).toEqual({ ok: false, why: "full" });
    expect(addItem(ps5, picksFrom(ps5, null), "x".repeat(61))).toEqual({ ok: false, why: "long" });
    expect(addItem(ps5, picksFrom(ps5, null), "   ")).toEqual({ ok: false, why: "empty" });
  });

  it("reads the checklist answer carefully", () => {
    expect(readOptions({ included_items: ["A", 3, "", "a"], extra_items: null, source: "generic" })).toEqual({
      included_items: ["A"],
      extra_items: [],
      handover_only_items: [],
    });
    expect(readOptions(undefined)).toEqual({ included_items: [], extra_items: [], handover_only_items: [] });
  });
});
