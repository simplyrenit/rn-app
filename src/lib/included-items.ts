/**
 * What comes with a listing (ENG-454): the capture checklist ("What's included") is the listing's own `included_items`
 * when it has any, else its sub-category's standard list, and an unticked item reads as missing at handover and return.
 * So a shop shapes its listing's list from what the sub-category offers (`GET category/{id}/checklist/`):
 *  - the standard items, on the list until the shop unticks one;
 *  - the extra items ("Sometimes included"), off until the shop ticks one;
 *  - the handover-only items ("Used up during the rental"), off until ticked; they go in `handover_only_items`;
 *  - the shop's own items, which sit with the standard ones.
 * Kept free of React so the rules can be tested.
 */

import { PendingEdit, waitingCategoryId } from "@/lib/listing-edit";

export const MAX_ITEMS = 20;
export const MAX_ITEM_LENGTH = 60;

/** What a sub-category offers. */
export interface ChecklistOptions {
  included_items: string[];
  extra_items: string[];
  handover_only_items: string[];
}

/** A listing's own lists, as the API carries them. An empty `included_items` follows the sub-category's list. */
export interface ListingItems {
  included_items: string[];
  handover_only_items: string[];
}

/** The shop's choices on the step. */
export interface ItemPicks {
  /** Ticked standard and extra items, spelled as the options spell them. */
  ticked: string[];
  /** The shop's own items, shown ticked under "Comes with it". */
  custom: string[];
  /** Ticked used-up items. A listing's own used-up item that is not offered stays here too. */
  usedUp: string[];
}

const fold = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
const tidy = (text: string) => text.trim().replace(/\s+/g, " ");
const findIn = (list: readonly string[], item: string) => list.find((o) => fold(o) === fold(item));
const has = (list: readonly string[], item: string) => findIn(list, item) !== undefined;
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
const unique = (list: string[]) => list.filter((item, i) => list.findIndex((o) => fold(o) === fold(item)) === i);

/** The checklist answer, read the careful way: lists of strings, nothing else. */
export function readOptions(value: unknown): ChecklistOptions {
  const v = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    included_items: unique(strings(v.included_items)),
    extra_items: unique(strings(v.extra_items)),
    handover_only_items: unique(strings(v.handover_only_items)),
  };
}

const offered = (options: ChecklistOptions) => [...options.included_items, ...options.extra_items];

/**
 * The picks a listing's lists stand for. No own `included_items` (a new listing, or one that follows its category):
 * every standard item ticked. Otherwise an item that matches an offered one ticks it, and any other is the shop's own.
 */
export function picksFrom(options: ChecklistOptions, items?: Partial<ListingItems> | null): ItemPicks {
  const included = strings(items?.included_items);
  const usedUp = unique(strings(items?.handover_only_items).map((i) => findIn(options.handover_only_items, i) ?? tidy(i)));
  if (included.length === 0) return { ticked: [...options.included_items], custom: [], usedUp };
  const ticked: string[] = [];
  const custom: string[] = [];
  for (const item of included) {
    const option = findIn(offered(options), item);
    if (option) ticked.push(option);
    else custom.push(tidy(item));
  }
  return { ticked: unique(ticked), custom: unique(custom), usedUp };
}

/** The included items the picks make: offered ones in the options' order, then the shop's own. */
export function includedOf(options: ChecklistOptions, picks: ItemPicks): string[] {
  return [...offered(options).filter((o) => has(picks.ticked, o)), ...picks.custom];
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * The listing's lists for these picks. Exactly the standard list comes out as `[]`: the listing then keeps following its
 * category's list, and picks up the staff's later changes to it.
 */
export function itemsOf(options: ChecklistOptions, picks: ItemPicks): ListingItems {
  const included = includedOf(options, picks);
  return {
    included_items: sameList(included, options.included_items) ? [] : included,
    handover_only_items: [...picks.usedUp],
  };
}

/**
 * What a save sends for the two fields: nothing when the lists come out as they started (`start`: the listing's own
 * lists when editing, null on a new listing), so a listing nobody shaped keeps following its category. Otherwise both.
 */
export function itemsPayload(
  options: ChecklistOptions,
  start: Partial<ListingItems> | null | undefined,
  now: Partial<ListingItems> | null | undefined
): Partial<ListingItems> {
  const before = itemsOf(options, picksFrom(options, start));
  const after = itemsOf(options, picksFrom(options, now));
  const same =
    sameList(before.included_items, after.included_items) && sameList(before.handover_only_items, after.handover_only_items);
  return same ? {} : after;
}

// ---- Changes on the step ----------------------------------------------------------------------

/**
 * Why a change was refused:
 *  - `full`: the list already has 20 items;
 *  - `last`: it would leave nothing included, and an empty list falls back to the category's (the server reads it so);
 *  - `empty` / `long`: the typed item is blank, or over 60 characters;
 *  - `both`: the item would be both one that comes back and one that is used up.
 */
export type Refusal = "full" | "last" | "empty" | "long" | "both";
export type Change = { ok: true; picks: ItemPicks } | { ok: false; why: Refusal };

const without = (list: readonly string[], item: string) => list.filter((o) => fold(o) !== fold(item));

/** Whether these picks would include nothing while the category has a standard list. */
const leavesNothing = (options: ChecklistOptions, picks: ItemPicks) =>
  options.included_items.length > 0 && includedOf(options, picks).length === 0;

/** Tick or untick an offered item (a standard or an extra one). */
export function toggleIncluded(options: ChecklistOptions, picks: ItemPicks, item: string): Change {
  if (has(picks.ticked, item)) {
    const next = { ...picks, ticked: without(picks.ticked, item) };
    return leavesNothing(options, next) ? { ok: false, why: "last" } : { ok: true, picks: next };
  }
  if (has(picks.usedUp, item)) return { ok: false, why: "both" };
  if (includedOf(options, picks).length >= MAX_ITEMS) return { ok: false, why: "full" };
  return { ok: true, picks: { ...picks, ticked: [...picks.ticked, findIn(offered(options), item) ?? item] } };
}

/** Tick or untick a used-up item. One the listing comes with can't be used up too: the return would ask for it back. */
export function toggleUsedUp(options: ChecklistOptions, picks: ItemPicks, item: string): Change {
  if (has(picks.usedUp, item)) return { ok: true, picks: { ...picks, usedUp: without(picks.usedUp, item) } };
  if (has(includedOf(options, picks), item)) return { ok: false, why: "both" };
  if (picks.usedUp.length >= MAX_ITEMS) return { ok: false, why: "full" };
  return { ok: true, picks: { ...picks, usedUp: [...picks.usedUp, item] } };
}

/**
 * Add the shop's own item, as typed ("2 controllers"). A name the category already offers ticks that item instead, and
 * one already on the list changes nothing.
 */
export function addItem(options: ChecklistOptions, picks: ItemPicks, text: string): Change {
  const item = tidy(text);
  if (!item) return { ok: false, why: "empty" };
  if (item.length > MAX_ITEM_LENGTH) return { ok: false, why: "long" };
  if (has(picks.custom, item) || has(picks.ticked, item)) return { ok: true, picks };
  // A used-up item (offered or ticked) is not also one that comes back.
  if (has(picks.usedUp, item) || has(options.handover_only_items, item)) return { ok: false, why: "both" };
  if (includedOf(options, picks).length >= MAX_ITEMS) return { ok: false, why: "full" };
  const option = findIn(offered(options), item);
  return option
    ? { ok: true, picks: { ...picks, ticked: [...picks.ticked, option] } }
    : { ok: true, picks: { ...picks, custom: [...picks.custom, item] } };
}

/** Remove one of the shop's own items. */
export function removeItem(options: ChecklistOptions, picks: ItemPicks, item: string): Change {
  const next = { ...picks, custom: without(picks.custom, item) };
  return leavesNothing(options, next) ? { ok: false, why: "last" } : { ok: true, picks: next };
}

/** A refusal in the shop's words. */
export const REFUSAL_TEXT: Record<Refusal, string> = {
  full: `Up to ${MAX_ITEMS} items.`,
  last: "Keep at least one item ticked.",
  empty: "Type an item first.",
  long: `Keep it under ${MAX_ITEM_LENGTH} characters.`,
  both: "An item can't both come back and be used up.",
};

// ---- Re-filing ----------------------------------------------------------------------------------

/**
 * What goes with a re-file (ENG-454). Another sub-category than the one the owner sees (a waiting change's, else the
 * live one): what came with the old one goes, and the new one's list applies. Back to the live one while a move waits:
 * the live lists, when the waiting change holds lists of its own, or the server would apply those with the move undone.
 */
export function itemsWithCategory(
  picked: number | undefined,
  live: number | null,
  pending: PendingEdit | null | undefined,
  liveItems: ListingItems | null | undefined
): Partial<ListingItems> {
  const waiting = waitingCategoryId(pending);
  if (waiting !== null && picked === live && picked !== waiting) {
    const held = pending?.fields.some((f) => f === "included_items" || f === "handover_only_items");
    return held && liveItems ? liveItems : {};
  }
  return picked !== (waiting ?? live) ? { included_items: [], handover_only_items: [] } : {};
}
