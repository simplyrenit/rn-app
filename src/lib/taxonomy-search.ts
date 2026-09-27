/**
 * Search across the whole category tree (ENG-29).
 *
 * Taxonomy v2 has well over a hundred sub-categories under 16 parents, and a
 * customer who knows they have a "projector" should not have to guess which
 * parent it sits under. Pure, so it is unit-tested without React.
 */

interface Node {
  title: string;
}

export interface TaxonomyMatch<P, C> {
  parent: P;
  child: C;
}

interface TaxonomyEntry<P, C> extends TaxonomyMatch<P, C> {
  haystack: string;
}

/**
 * Lower case with accents stripped, so "decor" finds "Décor". `normalize` is
 * guarded because a JS engine built without Intl lacks it; there the search
 * is still case-insensitive, just not accent-insensitive.
 */
export function foldForSearch(text: string): string {
  const lowered = (text ?? "").toLowerCase();
  return typeof lowered.normalize === "function"
    ? lowered.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : lowered;
}

/**
 * Every sub-category with its searchable text folded once, so a keystroke only
 * folds the query. `label` adds the name the row is shown under (the app
 * renames some API titles), so what is on screen is also what is searchable.
 */
export function indexTaxonomy<C extends Node, P extends Node & { subcategories?: C[] }>(
  categories: P[],
  label: (title: string) => string = (title) => title
): TaxonomyEntry<P, C>[] {
  return categories.flatMap((parent) => {
    const parentText = `${parent.title} ${label(parent.title)}`;
    return (parent.subcategories ?? []).map((child) => ({
      parent,
      child,
      haystack: foldForSearch(`${parentText} ${child.title} ${label(child.title)}`),
    }));
  });
}

/**
 * The entries whose own title or parent title contains each word of the query,
 * in tree order. An empty query returns nothing: the caller shows the parent
 * list instead.
 */
export function searchIndex<P, C>(
  index: TaxonomyEntry<P, C>[],
  query: string
): TaxonomyMatch<P, C>[] {
  const words = foldForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return index.filter(({ haystack }) => words.every((word) => haystack.includes(word)));
}

/** `indexTaxonomy` and `searchIndex` in one call, for a one-off search. */
export function searchTaxonomy<C extends Node, P extends Node & { subcategories?: C[] }>(
  categories: P[],
  query: string,
  label?: (title: string) => string
): TaxonomyMatch<P, C>[] {
  return searchIndex(indexTaxonomy<C, P>(categories, label), query);
}
