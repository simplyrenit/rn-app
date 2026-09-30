import { foldForSearch } from "@/lib/taxonomy-search";
import { CategoryValue, ListingDraft, Spec, SpecValue, SpecsState, WireSpec } from "./types";

/**
 * The listing flow's specs (ENG-34): the sub-category's own attributes, some
 * pre-filled from the photos, fetched apart from the extraction stream because
 * they depend on the sub-category. Pure, so the rules are unit-tested.
 */

export const EMPTY_SPECS: SpecsState = { categoryId: null, status: "idle", items: [] };

/**
 * The sub-category id for a category the model named by title. The extraction
 * stream predates category ids, and the specs endpoint takes nothing else.
 * Folded, so a casing or accent difference between the model's answer and the
 * taxonomy does not cost the owner their specs.
 */
export function resolveCategoryId(
  categories: { title: string; subcategories?: { id?: number; title: string }[] }[],
  value: CategoryValue | null
): number | null {
  if (!value) return null;
  if (value.id != null) return value.id;
  const parent = categories.find((c) => foldForSearch(c.title) === foldForSearch(value.parent));
  const child = parent?.subcategories?.find((c) => foldForSearch(c.title) === foldForSearch(value.title));
  return child?.id ?? null;
}

/**
 * The server validates before it answers; this only keeps the draft's types
 * honest, so a value that is not one of the spec's options (or an unknown
 * spec type) can never reach the create payload, which the server would
 * reject whole.
 */
function toSpec(wire: WireSpec): Spec | null {
  if (!wire || typeof wire.key !== "string" || !wire.key || typeof wire.label !== "string") return null;
  if (wire.type !== "enum" && wire.type !== "multi_enum") return null;
  const options = Array.isArray(wire.options) ? wire.options.filter((o) => typeof o === "string") : [];
  if (options.length === 0) return null;
  let value: SpecValue | null = null;
  if (wire.type === "enum") {
    value = typeof wire.value === "string" && options.includes(wire.value) ? wire.value : null;
  } else if (Array.isArray(wire.value)) {
    const picked = options.filter((o) => (wire.value as unknown[]).includes(o));
    value = picked.length ? picked : null;
  }
  return {
    key: wire.key,
    label: wire.label,
    type: wire.type,
    facet: typeof wire.facet === "string" ? wire.facet : "expanded",
    options,
    value,
    status: value === null ? "blank" : wire.status === "check" ? "check" : "filled",
  };
}

export function specsFromResponse(wire: WireSpec[]): Spec[] {
  return (Array.isArray(wire) ? wire : []).map(toSpec).filter((s): s is Spec => s !== null);
}

export function hasSpecValue(value: SpecValue | null): value is SpecValue {
  return Array.isArray(value) ? value.length > 0 : typeof value === "string" && value !== "";
}

export function specDisplayValue(value: SpecValue | null) {
  if (!hasSpecValue(value)) return null;
  return Array.isArray(value) ? value.join(", ") : value;
}

/**
 * The specs that belong to the draft's category right now, or none. A late
 * response, or a category the model re-read on a later run, leaves specs for
 * a category the draft no longer holds; those are never shown or sent.
 */
export function currentSpecs(draft: ListingDraft): Spec[] {
  const id = draft.fields.category.value?.id;
  const { specs } = draft;
  if (id == null || specs.categoryId !== id || specs.status !== "ready") return [];
  return specs.items;
}

/** Whether the Specs card shows its skeleton. */
export function specsLoading(draft: ListingDraft) {
  const id = draft.fields.category.value?.id;
  return id != null && draft.specs.categoryId === id && draft.specs.status === "loading";
}

/** The create payload's `attributes`: every spec with a value, whoever set it. */
export function specAttributes(draft: ListingDraft): Record<string, SpecValue> {
  const attributes: Record<string, SpecValue> = {};
  currentSpecs(draft).forEach((spec) => {
    if (hasSpecValue(spec.value)) attributes[spec.key] = spec.value;
  });
  return attributes;
}
